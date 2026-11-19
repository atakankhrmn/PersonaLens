"""ETL step: load the cleaned dataset into the PostgreSQL star schema.

Extract   – cleaned data from ``load_clean(config)`` and the data-quality report
            ``reports/etl/leakage_report_<config>.json``
Transform – build dimension rows (types, users, source) and one fact row per post
            with its measures (words, characters, URLs, masks, truncation)
Load      – upsert dimensions, replace ``dw.fact_post`` with this source's posts,
            append data-quality metrics, record the run in ``dw.dim_etl_run``

Re-running is safe: dimensions are upserted and ``fact_post`` is replaced
in one transaction. Model predictions (``fact_prediction``) are never touched.

Run from the project root (PostgreSQL must be running, see README):

    python -m src.dw.load_dw                       # main (label_clean) posts + quality of all configs
    python -m src.dw.load_dw --config raw          # experiment: put another config's posts in fact_post
    python -m src.dw.load_dw --sample 200          # quick test with 200 users
"""

from __future__ import annotations

import argparse
import io
import json
import subprocess
import time
from datetime import datetime, timezone

import pandas as pd
from sqlalchemy import Engine

from src.data_loader import CONFIGS, MAIN_CONFIG, PROJECT_ROOT, load_clean
from src.dw.db import apply_schema, get_engine

REPORT_DIR = PROJECT_ROOT / "reports" / "etl"
DATASET_NAME = "Lazanantenaina/personalitycafe-mbti-preprocessed"
DATASET_URL = f"https://huggingface.co/datasets/{DATASET_NAME}"
CLEANING = "leak_masked"

# Dataset 16-class label order (from the dataset card).
LABEL_ORDER = (
    "INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP",
    "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP",
)
TEMPERAMENT_NAMES = {"NT": "Rational", "NF": "Idealist", "SJ": "Guardian", "SP": "Artisan"}

TYPOLOGY_MASKS = r"<MBTI_TERM>|<COGNITIVE_FUNCTION>|<TYPOLOGY_TERM>"


def source_code(config: str) -> str:
    return f"personalitycafe/{config}+{CLEANING}"


# --------------------------------------------------------------------------- #
# Transform (pure functions, unit-tested without a database)
# --------------------------------------------------------------------------- #
def temperament(type_code: str) -> str:
    return type_code[1:3] if type_code[1] == "N" else type_code[1] + type_code[3]


def build_dim_mbti_type() -> pd.DataFrame:
    rows = []
    for label_id, code in enumerate(LABEL_ORDER):
        temp = temperament(code)
        rows.append({
            "type_key": label_id + 1,
            "type_code": code,
            "label_id": label_id,
            "ei": code[0], "ns": code[1], "ft": code[2], "jp": code[3],
            "temperament": temp,
            "temperament_name": TEMPERAMENT_NAMES[temp],
        })
    return pd.DataFrame(rows)


def check_label_mapping(df: pd.DataFrame) -> None:
    """Fail loudly if the dataset's label ids do not match LABEL_ORDER."""
    pairs = df[["type", "label"]].drop_duplicates()
    wrong = pairs[pairs["type"] != pairs["label"].map(lambda i: LABEL_ORDER[i])]
    if not wrong.empty:
        raise ValueError(f"Unexpected type/label mapping in data:\n{wrong}")


def build_dim_user(df: pd.DataFrame) -> pd.DataFrame:
    return df[["user_id", "split", "type"]].rename(columns={"type": "self_reported_type"})


def build_fact_post(df: pd.DataFrame) -> pd.DataFrame:
    """One row per post with its measures; keys are resolved in the database."""
    posts = (
        df[["user_id", "type", "posts"]]
        .explode("posts")
        .dropna(subset=["posts"])
        .rename(columns={"type": "type_code", "posts": "post_text"})
    )
    posts["post_seq"] = posts.groupby("user_id").cumcount()
    text = posts["post_text"].str.replace("\x00", "", regex=False)  # PostgreSQL rejects NUL
    posts["post_text"] = text
    posts["char_count"] = text.str.len()
    posts["word_count"] = text.str.split().str.len()
    posts["url_count"] = text.str.count("<URL>")
    posts["mbti_type_masks"] = text.str.count("<MBTI_TYPE>")
    posts["typology_masks"] = text.str.count(TYPOLOGY_MASKS)
    posts["is_truncated"] = text.str.rstrip().str.endswith("...")
    cols = ["user_id", "type_code", "post_seq", "char_count", "word_count", "url_count",
            "mbti_type_masks", "typology_masks", "is_truncated", "post_text"]
    return posts[cols].reset_index(drop=True)


def build_quality_rows(report: dict) -> pd.DataFrame:
    """Flatten an ETL leakage report into (group, metric, before, after) rows."""
    b, a = report["before"], report["after"]
    rows = [
        ("summary", "users", b["users"], a["users"]),
        ("summary", "posts", b["posts"], a["posts"]),
        ("summary", "leak_mentions_total", b["leak_mentions_total"], a["leak_mentions_total"]),
        ("summary", "users_with_any_leak_pct", b["users_with_any_leak_pct"], a["users_with_any_leak_pct"]),
        ("summary", "users_with_own_type_pct", b["users_with_own_type_pct"], a["users_with_own_type_pct"]),
        ("summary", "encoding_artefacts", b["encoding_artefacts"], a["encoding_artefacts"]),
        ("summary", "posts_removed_by_post_cleaning", None, report["posts_removed_by_post_cleaning"]),
        ("summary", "posts_removed_as_templates", None, report["posts_removed_as_templates"]),
        ("summary", "users_left_without_posts", None, report["users_left_without_posts"]),
    ]
    for rule, stats in b["by_rule"].items():
        after = a["by_rule"].get(rule, {"mentions": 0, "users_pct": 0})
        rows.append(("leak_rule", f"{rule}_mentions", stats["mentions"], after["mentions"]))
        rows.append(("leak_rule", f"{rule}_users_pct", stats["users_pct"], after["users_pct"]))
    return pd.DataFrame(rows, columns=["metric_group", "metric_name", "value_before", "value_after"])


# --------------------------------------------------------------------------- #
# Load
# --------------------------------------------------------------------------- #
def _copy(cur, df: pd.DataFrame, table: str) -> None:
    """Bulk-load a DataFrame into ``table`` with COPY (fast for 400k rows)."""
    buf = io.StringIO()
    df.to_csv(buf, index=False, header=False)
    buf.seek(0)
    cols = ", ".join(df.columns)
    cur.copy_expert(f"COPY {table} ({cols}) FROM STDIN WITH (FORMAT csv)", buf)


def _git_commit() -> str | None:
    try:
        out = subprocess.run(["git", "rev-parse", "HEAD"], cwd=PROJECT_ROOT,
                             capture_output=True, text=True, timeout=10)
        return out.stdout.strip() or None
    except (OSError, subprocess.SubprocessError):
        return None


def load(engine: Engine, config: str, sample: int | None = None, posts: bool = True) -> dict:
    """Load one cleaned config.

    ``posts=True``  : users + posts + quality metrics. ``fact_post`` holds exactly one
                      source, so posts of any other source are removed.
    ``posts=False`` : only the source, the run and its quality metrics (used to keep
                      the before/after numbers of the comparison configs).
    """
    start = time.perf_counter()
    started_at = datetime.now(timezone.utc)
    date_key = int(started_at.strftime("%Y%m%d"))

    report_path = REPORT_DIR / f"leakage_report_{config}.json"
    report = json.loads(report_path.read_text(encoding="utf-8")) if report_path.exists() else None
    dim_type = build_dim_mbti_type()

    if posts:
        print(f"[{config}] extract ...")
        df = load_clean(config)
        if sample:
            df = df.sample(n=min(sample, len(df)), random_state=42)
        check_label_mapping(df)
        print(f"[{config}] transform ...")
        dim_user = build_dim_user(df)
        post_rows = build_fact_post(df)
        print(f"[{config}] load {len(dim_user)} users, {len(post_rows)} posts ...")
    else:
        if report is None:
            raise FileNotFoundError(f"No quality report {report_path}; run src.etl.clean_leakage first")
        dim_user = post_rows = None
        print(f"[{config}] load quality metrics only ...")

    apply_schema(engine)
    raw = engine.raw_connection()
    try:
        with raw.cursor() as cur:
            cur.execute("SET search_path TO dw")

            # dim_mbti_type (upsert)
            cur.execute("CREATE TEMP TABLE stg_type (LIKE dim_mbti_type) ON COMMIT DROP")
            _copy(cur, dim_type, "stg_type")
            cur.execute("""
                INSERT INTO dim_mbti_type SELECT * FROM stg_type
                ON CONFLICT (type_key) DO UPDATE SET
                    type_code = EXCLUDED.type_code, label_id = EXCLUDED.label_id,
                    ei = EXCLUDED.ei, ns = EXCLUDED.ns, ft = EXCLUDED.ft, jp = EXCLUDED.jp,
                    temperament = EXCLUDED.temperament, temperament_name = EXCLUDED.temperament_name
            """)

            # dim_source (upsert) → source_key
            cur.execute("""
                INSERT INTO dim_source (source_code, platform, dataset_name, dataset_config,
                                        cleaning, license, url)
                VALUES (%s, 'PersonalityCafe forum', %s, %s, %s, 'CC0-1.0', %s)
                ON CONFLICT (source_code) DO UPDATE SET dataset_config = EXCLUDED.dataset_config
                RETURNING source_key
            """, (source_code(config), DATASET_NAME, config, CLEANING, DATASET_URL))
            source_key = cur.fetchone()[0]

            # dim_etl_run
            cur.execute("""
                INSERT INTO dim_etl_run (started_at, date_key, source_key, git_commit)
                VALUES (%s, %s, %s, %s) RETURNING etl_run_key
            """, (started_at, date_key, source_key, _git_commit()))
            run_key = cur.fetchone()[0]

            n_loaded = 0
            if posts:
                # dim_user (upsert by user_id)
                cur.execute("""CREATE TEMP TABLE stg_user (user_id VARCHAR(32), split VARCHAR(10),
                               self_reported_type CHAR(4)) ON COMMIT DROP""")
                _copy(cur, dim_user, "stg_user")
                cur.execute("""
                    INSERT INTO dim_user (user_id, split, self_reported_type)
                    SELECT user_id, split, self_reported_type FROM stg_user
                    ON CONFLICT (user_id) DO UPDATE SET
                        split = EXCLUDED.split, self_reported_type = EXCLUDED.self_reported_type
                """)

                # fact_post holds exactly one source: replace everything
                cur.execute("TRUNCATE fact_post")
                cur.execute("""CREATE TEMP TABLE stg_post (user_id VARCHAR(32), type_code CHAR(4),
                               post_seq SMALLINT, char_count INT, word_count INT, url_count SMALLINT,
                               mbti_type_masks SMALLINT, typology_masks SMALLINT,
                               is_truncated BOOLEAN, post_text TEXT) ON COMMIT DROP""")
                _copy(cur, post_rows, "stg_post")
                cur.execute("""
                    INSERT INTO fact_post (user_key, type_key, source_key, etl_run_key, load_date_key,
                                           post_seq, char_count, word_count, url_count,
                                           mbti_type_masks, typology_masks, is_truncated, post_text)
                    SELECT u.user_key, t.type_key, %s, %s, %s,
                           s.post_seq, s.char_count, s.word_count, s.url_count,
                           s.mbti_type_masks, s.typology_masks, s.is_truncated, s.post_text
                    FROM stg_post s
                    JOIN dim_user u      ON u.user_id = s.user_id
                    JOIN dim_mbti_type t ON t.type_code = s.type_code
                """, (source_key, run_key, date_key))
                n_loaded = cur.rowcount

            # fact_data_quality
            if report is not None:
                q = build_quality_rows(report)
                q.insert(0, "date_key", date_key)
                q.insert(0, "source_key", source_key)
                q.insert(0, "etl_run_key", run_key)
                _copy(cur, q, "fact_data_quality")

            cur.execute("""UPDATE dim_etl_run SET status = 'success', finished_at = now()
                           WHERE etl_run_key = %s""", (run_key,))
        raw.commit()
    except Exception:
        raw.rollback()
        raise
    finally:
        raw.close()

    if posts and n_loaded != len(post_rows):
        raise RuntimeError(f"Loaded {n_loaded} posts but expected {len(post_rows)}")

    result = {"config": config, "etl_run_key": run_key, "source_key": source_key,
              "users": len(dim_user) if posts else 0, "posts": n_loaded,
              "quality_metrics": 0 if report is None else len(build_quality_rows(report)),
              "seconds": round(time.perf_counter() - start, 1)}
    print(f"[{config}] done: {result}")
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--config", default=MAIN_CONFIG, choices=CONFIGS,
                        help="config whose posts go into fact_post (default: main training set)")
    parser.add_argument("--sample", type=int, default=None, help="load only N random users (for testing)")
    args = parser.parse_args()
    engine = get_engine()
    load(engine, args.config, sample=args.sample)
    # before/after quality metrics of the other configs, for comparison in the dashboard
    for config in CONFIGS:
        if config != args.config and (REPORT_DIR / f"leakage_report_{config}.json").exists():
            load(engine, config, posts=False)


if __name__ == "__main__":
    main()
