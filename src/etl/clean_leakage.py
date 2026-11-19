"""ETL step: remove leftover MBTI label leakage from the dataset.

Extract   – load a dataset configuration (default: ``label_clean``)
Transform – mask every MBTI mention in each post (see ``cleaning.mask_mbti``),
            drop posts that became empty, remove duplicates created by masking,
            rebuild ``text`` and ``n_posts``
Load      – write ``data/processed/<config>_masked.parquet`` and a data-quality
            report ``reports/etl/leakage_report_<config>.json``

Run from the project root:

    python -m src.etl.clean_leakage                       # label_clean
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

from src.data_loader import CONFIGS, PROJECT_ROOT, load_mbti
from src.etl.cleaning import clean_posts, find_type_mentions

PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
REPORT_DIR = PROJECT_ROOT / "reports" / "etl"

POST_SEP = " <POST_SEP> "


def audit(df: pd.DataFrame) -> dict:
    """Measure how much label leakage is present in ``df``."""
    mentions = df["text"].map(find_type_mentions)
    own_type = [
        any(t in re.sub(r"[^A-Z]", "", m.upper()) for m in ms)
        for ms, t in zip(mentions, df["type"])
    ]
    counter = Counter(m.lower() for ms in mentions for m in ms)
    n = len(df)
    n_any = int((mentions.str.len() > 0).sum())
    n_own = int(sum(own_type))
    return {
        "users": n,
        "posts": int(df["n_posts"].sum()),
        "mbti_mentions_total": int(mentions.str.len().sum()),
        "users_with_any_mention": n_any,
        "users_with_any_mention_pct": round(n_any / n * 100, 2),
        "users_with_own_type": n_own,
        "users_with_own_type_pct": round(n_own / n * 100, 2),
        "mask_tokens_total": int(df["text"].str.count("<MBTI_TYPE>").sum()),
        "top_mentions": counter.most_common(20),
    }


def transform(df: pd.DataFrame, config: str) -> pd.DataFrame:
    out = df.copy()
    out["posts"] = out["posts"].map(lambda ps: clean_posts(list(ps)))
    out["n_posts"] = out["posts"].map(len)
    out["text"] = out["posts"].map(POST_SEP.join)
    out["variant"] = f"{config}+leak_masked"
    return out


def run(config: str) -> dict:
    start = time.perf_counter()
    print(f"[{config}] extract ...")
    df = load_mbti(config)

    print(f"[{config}] audit before ...")
    before = audit(df)

    print(f"[{config}] transform ...")
    clean = transform(df, config)
    empty_users = int((clean["n_posts"] == 0).sum())

    print(f"[{config}] audit after ...")
    after = audit(clean)

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    out_path = PROCESSED_DIR / f"{config}_masked.parquet"
    clean.to_parquet(out_path, index=False)

    report = {
        "config": config,
        "created_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "output": str(out_path.relative_to(PROJECT_ROOT)),
        "posts_removed": before["posts"] - after["posts"],
        "users_left_without_posts": empty_users,
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
    rows = [
        ("MBTI mentions (total)", b["mbti_mentions_total"], a["mbti_mentions_total"]),
        ("users with any mention %", b["users_with_any_mention_pct"], a["users_with_any_mention_pct"]),
        ("users with OWN type %", b["users_with_own_type_pct"], a["users_with_own_type_pct"]),
        ("<MBTI_TYPE> masks", b["mask_tokens_total"], a["mask_tokens_total"]),
        ("posts", b["posts"], a["posts"]),
    ]
    print(f"\n  {'metric':<28}{'before':>12}{'after':>12}")
    for name, x, y in rows:
        print(f"  {name:<28}{x:>12}{y:>12}")
    print(f"  posts removed: {r['posts_removed']}, users left without posts: "
          f"{r['users_left_without_posts']}\n")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--config", default="label_clean", choices=[*CONFIGS, "all"])
    args = parser.parse_args()
    for config in CONFIGS if args.config == "all" else [args.config]:
        run(config)


if __name__ == "__main__":
    main()
