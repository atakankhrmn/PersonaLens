"""ETL step: clean the dataset and remove MBTI label leakage.

Extract   – load a dataset configuration (default: ``label_clean`` = MAIN_CONFIG)
Transform – per post: fix encoding artefacts and mask every typology mention
            (see ``src/etl/cleaning.py``), drop empty / placeholder-only posts
            and duplicates; across users: drop copied templates (questionnaires,
            forum games, Enneagram lists) that many users posted verbatim;
            rebuild ``text`` and ``n_posts``
Load      – write ``data/processed/<config>_masked.parquet`` and a data-quality
            report ``reports/etl/leakage_report_<config>.json``

Run from the project root:

    python -m src.etl.clean_leakage                       # label_clean (main)
    python -m src.etl.clean_leakage --config psychometric_clean
    python -m src.etl.clean_leakage --config all
"""

from __future__ import annotations

import argparse
import json
import re
import time
from collections import Counter
from datetime import datetime, timezone

import pandas as pd

from src.data_loader import CONFIGS, MAIN_CONFIG, PROJECT_ROOT, load_mbti
from src.etl.cleaning import RULES, _ENCODING_FIXES, clean_posts, find_leaks

PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
REPORT_DIR = PROJECT_ROOT / "reports" / "etl"

DEFAULT_CONFIG = MAIN_CONFIG
POST_SEP = " <POST_SEP> "

# A post is treated as a copied template if at least this many users posted
# exactly the same text and it is at least this long.
TEMPLATE_MIN_USERS = 3
TEMPLATE_MIN_WORDS = 8

RULE_NAMES = [name for name, _, _ in RULES]


# --------------------------------------------------------------------------- #
# Audit
# --------------------------------------------------------------------------- #
def _encoding_artefacts(text: str) -> int:
    return sum(len(p.findall(text)) for p, _ in _ENCODING_FIXES)


def audit(df: pd.DataFrame) -> dict:
    """Measure leakage and noise in ``df``."""
    n = len(df)
    leaks = df["text"].map(find_leaks)

    by_rule = {}
    for name in RULE_NAMES:
        counts = leaks.map(lambda d: len(d.get(name, [])))
        by_rule[name] = {
            "mentions": int(counts.sum()),
            "users_pct": round((counts > 0).mean() * 100, 2),
        }

    def own_type(d: dict, t: str) -> bool:
        return any(t in re.sub(r"[^A-Z]", "", m.upper()) for m in d.get("type_full", []) + d.get("type_spaced", []))

    n_own = sum(own_type(d, t) for d, t in zip(leaks, df["type"]))
    n_any = int((leaks.map(len) > 0).sum())
    top = Counter(m for d in leaks for ms in d.values() for m in ms)

    return {
        "users": n,
        "posts": int(df["n_posts"].sum()),
        "leak_mentions_total": int(sum(r["mentions"] for r in by_rule.values())),
        "users_with_any_leak_pct": round(n_any / n * 100, 2),
        "users_with_own_type_pct": round(n_own / n * 100, 2),
        "encoding_artefacts": int(df["text"].map(_encoding_artefacts).sum()),
        "by_rule": by_rule,
        "top_mentions": top.most_common(25),
    }


# --------------------------------------------------------------------------- #
# Transform
# --------------------------------------------------------------------------- #
def find_templates(df: pd.DataFrame) -> set[str]:
    """Posts that many different users posted verbatim (questionnaires, games)."""
    pairs = df[["user_id", "posts"]].explode("posts").dropna().drop_duplicates()
    users_per_post = pairs.groupby("posts")["user_id"].nunique()
    long_enough = users_per_post.index.str.split().str.len() >= TEMPLATE_MIN_WORDS
    return set(users_per_post[(users_per_post >= TEMPLATE_MIN_USERS) & long_enough].index)


def transform(df: pd.DataFrame, config: str) -> tuple[pd.DataFrame, dict]:
    out = df.copy()
    out["posts"] = out["posts"].map(lambda ps: clean_posts(list(ps)))
    posts_after_cleaning = int(out["posts"].map(len).sum())

    templates = find_templates(out)
    out["posts"] = out["posts"].map(lambda ps: [p for p in ps if p not in templates])

    out["n_posts"] = out["posts"].map(len)
    out["text"] = out["posts"].map(POST_SEP.join)
    out["variant"] = f"{config}+leak_masked"

    stats = {
        "posts_removed_by_post_cleaning": int(df["n_posts"].sum()) - posts_after_cleaning,
        "template_texts_found": len(templates),
        "posts_removed_as_templates": posts_after_cleaning - int(out["n_posts"].sum()),
        "users_left_without_posts": int((out["n_posts"] == 0).sum()),
    }
    return out, stats


# --------------------------------------------------------------------------- #
# Pipeline
# --------------------------------------------------------------------------- #
def run(config: str = DEFAULT_CONFIG) -> dict:
    start = time.perf_counter()
    print(f"[{config}] extract ...")
    df = load_mbti(config)

    print(f"[{config}] audit before ...")
    before = audit(df)

    print(f"[{config}] transform ...")
    clean, stats = transform(df, config)

    print(f"[{config}] audit after ...")
    after = audit(clean)

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    out_path = PROCESSED_DIR / f"{config}_masked.parquet"
    clean.to_parquet(out_path, index=False)

    report = {
        "config": config,
        "created_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "output": out_path.relative_to(PROJECT_ROOT).as_posix(),
        **stats,
        "seconds": round(time.perf_counter() - start, 1),
        "before": before,
        "after": after,
    }
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    report_path = REPORT_DIR / f"leakage_report_{config}.json"
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    _print_summary(report)
    print(f"[{config}] wrote {out_path.relative_to(PROJECT_ROOT)}")
    print(f"[{config}] wrote {report_path.relative_to(PROJECT_ROOT)}")
    return report


def _print_summary(r: dict) -> None:
    b, a = r["before"], r["after"]
    print(f"\n  {'metric':<34}{'before':>10}{'after':>10}")
    rows = [
        ("leak mentions (total)", b["leak_mentions_total"], a["leak_mentions_total"]),
        ("users with any leak %", b["users_with_any_leak_pct"], a["users_with_any_leak_pct"]),
        ("users with OWN type %", b["users_with_own_type_pct"], a["users_with_own_type_pct"]),
        ("encoding artefacts", b["encoding_artefacts"], a["encoding_artefacts"]),
        ("posts", b["posts"], a["posts"]),
    ]
    for name, x, y in rows:
        print(f"  {name:<34}{x:>10}{y:>10}")
    print("  by rule (mentions / users %):")
    for name in RULE_NAMES:
        x, y = b["by_rule"][name], a["by_rule"][name]
        print(f"    {name:<32}{x['mentions']:>7} / {x['users_pct']:>5}%   ->  {y['mentions']} / {y['users_pct']}%")
    print(f"  removed posts: {r['posts_removed_by_post_cleaning']} by post cleaning, "
          f"{r['posts_removed_as_templates']} as templates ({r['template_texts_found']} template texts); "
          f"users left without posts: {r['users_left_without_posts']}\n")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--config", default=DEFAULT_CONFIG, choices=[*CONFIGS, "all"])
    args = parser.parse_args()
    for config in CONFIGS if args.config == "all" else [args.config]:
        run(config)


if __name__ == "__main__":
    main()
