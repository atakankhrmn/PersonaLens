"""Data for the web frontend's "Data Insights" page.

Every number comes from the real pipeline outputs, never from constants:

- dataset counts and distributions: the PostgreSQL warehouse (``dw`` views),
- ETL / leakage figures: ``reports/etl/leakage_report_<config>.json``,
- model metrics (Macro-F1, Balanced Accuracy, majority baseline, top words):
  ``reports/models/<model>_<version>.json`` (computed with scikit-learn by ``src.models.train``),
- confusion matrix: ``dw.vw_confusion_matrix``.

Train-split predictions are in-sample (AGENTS.md caveat 3), so model results are only
returned for ``validation`` and ``test``.
"""

from __future__ import annotations

import json
from pathlib import Path

from sqlalchemy import Engine, text

from src.data_loader import MAIN_CONFIG, PROJECT_ROOT

ETL_REPORT_DIR = PROJECT_ROOT / "reports" / "etl"
MODEL_REPORT_DIR = PROJECT_ROOT / "reports" / "models"
MAIN_SOURCE = "personalitycafe/label_clean+leak_masked"
ETL_CONFIGS = ("raw", "label_clean", "psychometric_clean")
ETL_DISPLAY_NAMES = {"raw": "Raw", "label_clean": "Label Clean", "psychometric_clean": "Psychometric Clean"}
EVAL_SPLITS = ("validation", "test")  # never "train": those predictions are in-sample

# DW temperament code -> frontend personality group
TEMPERAMENT_GROUP = {"NT": "analysts", "NF": "diplomats", "SJ": "sentinels", "SP": "explorers"}


class DataUnavailable(RuntimeError):
    """Raised when the source needed for an insight (DW or report file) is missing."""


def _require(engine: Engine | None) -> Engine:
    if engine is None:
        raise DataUnavailable("The PostgreSQL data warehouse is not reachable.")
    return engine


def _rows(engine: Engine, sql: str, **params) -> list[dict]:
    with engine.connect() as conn:
        return [dict(r._mapping) for r in conn.execute(text(sql), params)]


def _num(value):
    """Decimal / numpy -> plain JSON number."""
    if value is None:
        return None
    f = float(value)
    return int(f) if f.is_integer() else f


# ---------------------------------------------------------------------------- ETL reports
def etl_reports(report_dir: Path = ETL_REPORT_DIR) -> dict:
    """All three ETL leakage reports in the shape of the frontend's ``EtlConfigReport``."""
    out = {}
    for config in ETL_CONFIGS:
        path = report_dir / f"leakage_report_{config}.json"
        if not path.exists():
            raise DataUnavailable(f"{path.name} not found; run python -m src.etl.clean_leakage --config all")
        report = json.loads(path.read_text(encoding="utf-8"))
        report["displayName"] = ETL_DISPLAY_NAMES[config]
        report["isMainDataset"] = config == MAIN_CONFIG
        out[config] = report
    return out


# ---------------------------------------------------------------------------- dataset
def overview(engine: Engine | None, report_dir: Path = ETL_REPORT_DIR) -> dict:
    engine = _require(engine)
    row = _rows(engine, """
        SELECT  (SELECT COUNT(*) FROM dw.dim_user)                                AS users,
                (SELECT COUNT(*) FROM dw.fact_post f JOIN dw.dim_source s
                   ON s.source_key = f.source_key WHERE s.source_code = :src)     AS posts,
                (SELECT COUNT(DISTINCT self_reported_type) FROM dw.dim_user)      AS types
    """, src=MAIN_SOURCE)[0]
    splits = _rows(engine, "SELECT split, COUNT(*) AS users FROM dw.dim_user GROUP BY split")
    main = json.loads((report_dir / f"leakage_report_{MAIN_CONFIG}.json").read_text(encoding="utf-8"))
    return {
        "totalUsers": _num(row["users"]),
        "cleanedPosts": _num(row["posts"]),
        "personalityTypes": _num(row["types"]),
        "detectedLeakageAfterPct": _num(main["after"]["users_with_any_leak_pct"]),
        "sourceName": "PersonalityCafe MBTI Dataset",
        "sourcePlatformNote": (
            "Data consists of PersonalityCafe forum posts, not Twitter/X posts. Post dates are "
            "not present in the dataset and are never fabricated."
        ),
        "mainConfigName": MAIN_CONFIG,
        "splitUsers": {r["split"]: _num(r["users"]) for r in splits},
    }


def type_distribution(engine: Engine | None) -> list[dict]:
    """One row per type x split: users, share of the split, posts and words (main source)."""
    engine = _require(engine)
    rows = _rows(engine, """
        SELECT  t.type_code, t.temperament, u.split,
                COUNT(DISTINCT u.user_key)                              AS users,
                COUNT(f.user_key)                                       AS posts,
                COALESCE(SUM(f.word_count), 0)                          AS words
        FROM    dw.dim_user u
        JOIN    dw.dim_mbti_type t ON t.type_code = u.self_reported_type
        LEFT JOIN (dw.fact_post f JOIN dw.dim_source s
                   ON s.source_key = f.source_key AND s.source_code = :src)
               ON f.user_key = u.user_key
        GROUP BY t.type_code, t.temperament, u.split
        ORDER BY u.split, t.type_code
    """, src=MAIN_SOURCE)
    split_totals: dict[str, int] = {}
    for r in rows:
        split_totals[r["split"]] = split_totals.get(r["split"], 0) + int(r["users"])
    out = []
    for r in rows:
        users, posts, words = int(r["users"]), int(r["posts"]), int(r["words"])
        out.append({
            "type_code": r["type_code"],
            "temperament": TEMPERAMENT_GROUP[r["temperament"]],
            "split": r["split"],
            "users": users,
            "pct_of_split": round(100 * users / split_totals[r["split"]], 2),
            "posts": posts,
            "words": words,
            "posts_per_user": round(posts / users, 1) if users else 0,
            "avg_words_per_post": round(words / posts, 1) if posts else 0,
            "words_per_user": round(words / users) if users else 0,
        })
    return out


def dimension_distribution(engine: Engine | None) -> list[dict]:
    """``dw.vw_dimension_distribution`` (all users, all splits)."""
    engine = _require(engine)
    order = {"E/I": 0, "N/S": 1, "F/T": 2, "J/P": 3}
    rows = _rows(engine, "SELECT dimension, letter, users, pct FROM dw.vw_dimension_distribution")
    rows.sort(key=lambda r: (order.get(r["dimension"], 9), -int(r["users"])))
    return [{"dimension": r["dimension"], "letter": r["letter"].strip(),
             "users": _num(r["users"]), "pct": _num(r["pct"])} for r in rows]


# ---------------------------------------------------------------------------- models
def _model_reports(report_dir: Path) -> list[dict]:
    reports = [json.loads(p.read_text(encoding="utf-8")) for p in sorted(report_dir.glob("*.json"))]
    # only training reports of src.models.train (skips e.g. external_reddit.json)
    reports = [r for r in reports if "model" in r and "version" in r and "metrics" in r]
    if not reports:
        raise DataUnavailable("No model reports found; run python -m src.models.train")
    return reports


def _metric_row(name: str, version: str, algorithm: str, split: str, m: dict) -> dict:
    t16 = m["type16"]
    return {
        "model_name": name,
        "model_version": version,
        "algorithm": algorithm,
        "split": split,
        # 16-type metrics
        "type_accuracy": t16["exact_match"],
        "macro_f1": t16["macro_f1"],
        "balanced_accuracy": t16["balanced_accuracy"],
        "mean_letters_correct": t16.get("mean_letters_correct"),
        # per-dimension accuracy (kept for the existing table) + the real metrics
        "ei_accuracy": m["EI"]["accuracy"],
        "ns_accuracy": m["NS"]["accuracy"],
        "ft_accuracy": m["FT"]["accuracy"],
        "jp_accuracy": m["JP"]["accuracy"],
        "dimensions": {d: m[d] for d in ("EI", "NS", "FT", "JP")},
        "majority_type": t16.get("majority_type"),
    }


def model_insights(engine: Engine | None, report_dir: Path = MODEL_REPORT_DIR) -> dict:
    models, baselines, top_features, params = [], [], {}, {}
    for rep in _model_reports(report_dir):
        name, version, algo = rep["model"], rep["version"], rep.get("algorithm", "")
        metrics = rep.get("metrics", {})
        for split in EVAL_SPLITS:
            if split in metrics:
                models.append(_metric_row(name, version, algo, split, metrics[split]))
            base = metrics.get(f"majority_baseline_{split}")
            if base and not any(b["split"] == split for b in baselines):
                baselines.append(_metric_row("majority_baseline", "-", "Always the most common type",
                                             split, base))
        top_features[f"{name} {version}"] = rep.get("top_features", {})
        params[f"{name} {version}"] = {"C": rep.get("params", {}).get("C"),
                                       "class_weight": rep.get("params", {}).get("class_weight")}

    confusion: list[dict] = []
    if engine is not None:
        try:
            confusion = [
                {**r, "true_type": r["true_type"].strip(), "predicted_type": r["predicted_type"].strip(),
                 "users": int(r["users"])}
                for r in _rows(engine, """
                    SELECT model_name, model_version, split, true_type, predicted_type, users
                    FROM   dw.vw_confusion_matrix
                    WHERE  split IN ('validation', 'test')
                """)
            ]
        except Exception:  # noqa: BLE001 - the metrics above are still valid without it
            confusion = []

    return {
        "models": models,
        "baselines": baselines,
        "confusionMatrix": confusion,
        "topFeatures": top_features,
        "params": params,
    }


# ---------------------------------------------------------------------------- warehouse
# Descriptions of the star schema; counts, columns, keys and runs are read live from PostgreSQL.
TABLE_INFO = {
    "fact_post": ("fact", "one cleaned forum post",
                  "Posts of the main source with length, URL and masking measures; keeps the cleaned "
                  "text as a degenerate attribute so models can train straight from the warehouse."),
    "fact_prediction": ("fact", "user × model (or one app request)",
                        "Model predictions with the scores of E, N, T, J. Dataset rows carry the user, "
                        "split and true type; app rows have no user and never the text."),
    "fact_data_quality": ("fact", "ETL run × quality metric",
                          "Leakage and cleaning metrics before / after cleaning for all three configs."),
    "dim_user": ("dimension", "anonymous dataset user",
                 "User id, self-reported type and the fixed train / validation / test split."),
    "dim_mbti_type": ("dimension", "MBTI type (16 rows)",
                      "Type code, its four letters and Keirsey temperament (NT, NF, SJ, SP)."),
    "dim_source": ("dimension", "text source + cleaning variant",
                   "Dataset config (raw, label_clean, psychometric_clean) or the PersonaLens app."),
    "dim_date": ("dimension", "calendar day (2020–2035)",
                 "Only real dates: load and prediction days. The dataset has no post dates."),
    "dim_model": ("dimension", "trained model version",
                  "Algorithm, hyper-parameters and validation metrics of each model."),
    "dim_etl_run": ("dimension", "one ETL / DW load run",
                    "Lineage: start / end time, status and the git commit of the code that loaded the data."),
}
VIEW_INFO = {
    "vw_type_distribution": "Users per type and split (class balance).",
    "vw_dimension_distribution": "Users per letter of each axis.",
    "vw_user_profile": "One row per user: posts, words, URLs, masks.",
    "vw_posts_by_type": "Posts, posts per user and words per post by type.",
    "vw_data_quality_latest": "Quality metrics of the latest successful run per source.",
    "vw_model_performance": "Accuracy per model and split (16 types and per axis).",
    "vw_confusion_matrix": "True × predicted type counts per model and split.",
    "vw_model_dimension_metrics": "Macro-F1 / Balanced Accuracy per model, split and axis.",
    "vw_model_type_metrics": "Precision / recall / F1 per type.",
}

_FK_SQL = """
    SELECT tc.table_name AS from_table, kcu.column_name AS from_column, ccu.table_name AS to_table
    FROM   information_schema.table_constraints tc
    JOIN   information_schema.key_column_usage kcu
           ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
    JOIN   information_schema.constraint_column_usage ccu
           ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE  tc.table_schema = 'dw' AND tc.constraint_type = 'FOREIGN KEY'
    ORDER BY 1, 2
"""
_PK_SQL = """
    SELECT tc.table_name, kcu.column_name
    FROM   information_schema.table_constraints tc
    JOIN   information_schema.key_column_usage kcu
           ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
    WHERE  tc.table_schema = 'dw' AND tc.constraint_type = 'PRIMARY KEY'
"""


def warehouse(engine: Engine | None) -> dict:
    """Live description of the ``dw`` star schema: tables, keys, row counts, views, runs."""
    engine = _require(engine)
    sizes = {r["relname"]: int(r["bytes"]) for r in _rows(engine, """
        SELECT c.relname, pg_total_relation_size(c.oid) AS bytes
        FROM   pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE  n.nspname = 'dw' AND c.relkind = 'r'""")}
    columns: dict[str, list[dict]] = {}
    for r in _rows(engine, """
            SELECT c.table_name, c.column_name, c.data_type
            FROM   information_schema.columns c
            JOIN   information_schema.tables t
                   ON t.table_schema = c.table_schema AND t.table_name = c.table_name
            WHERE  c.table_schema = 'dw' AND t.table_type = 'BASE TABLE'
            ORDER BY c.table_name, c.ordinal_position"""):
        columns.setdefault(r["table_name"], []).append({"name": r["column_name"], "type": r["data_type"]})
    pks = {(r["table_name"], r["column_name"]) for r in _rows(engine, _PK_SQL)}
    fks = _rows(engine, _FK_SQL)
    fk_cols = {(f["from_table"], f["from_column"]): f["to_table"] for f in fks}

    tables = []
    for name, (kind, grain, description) in TABLE_INFO.items():
        if name not in columns:
            continue
        # table names come from TABLE_INFO only, never from the request
        n_rows = _rows(engine, f"SELECT COUNT(*) AS n FROM dw.{name}")[0]["n"]
        tables.append({
            "name": name, "kind": kind, "grain": grain, "description": description,
            "rows": int(n_rows), "bytes": sizes.get(name, 0),
            "columns": [{**c, "pk": (name, c["name"]) in pks,
                         "references": fk_cols.get((name, c["name"]))} for c in columns[name]],
        })

    views = [{"name": v["table_name"], "description": VIEW_INFO.get(v["table_name"], "")}
             for v in _rows(engine, """SELECT table_name FROM information_schema.views
                                       WHERE table_schema = 'dw' ORDER BY table_name""")]
    runs = [{
        "run": int(r["etl_run_key"]), "source": r["source_code"], "status": r["status"],
        "started_at": r["started_at"].isoformat() if r["started_at"] else None,
        "seconds": round((r["finished_at"] - r["started_at"]).total_seconds(), 1)
        if r["finished_at"] and r["started_at"] else None,
        "git_commit": (r["git_commit"] or "")[:7],
    } for r in _rows(engine, """
        SELECT r.etl_run_key, s.source_code, r.status, r.started_at, r.finished_at, r.git_commit
        FROM   dw.dim_etl_run r JOIN dw.dim_source s ON s.source_key = r.source_key
        ORDER BY r.etl_run_key DESC LIMIT 10""")]
    predictions = [{"model": f'{r["model_name"]} {r["model_version"]}',
                    "split": r["split"] or "app", "rows": int(r["n"])}
                   for r in _rows(engine, """
        SELECT m.model_name, m.model_version, p.split, COUNT(*) AS n
        FROM   dw.fact_prediction p JOIN dw.dim_model m ON m.model_key = p.model_key
        GROUP BY 1, 2, 3 ORDER BY 1, 2, 3""")]
    return {
        "schema": "dw",
        "engine": str(_rows(engine, "SHOW server_version")[0]["server_version"]).split(" ")[0],
        "databaseBytes": int(_rows(engine, "SELECT pg_database_size(current_database()) AS b")[0]["b"]),
        "tables": tables,
        "foreignKeys": fks,
        "views": views,
        "etlRuns": runs,
        "predictionRows": predictions,
    }
