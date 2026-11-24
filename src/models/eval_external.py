"""Out-of-domain check: score the trained models on Reddit users (not PersonalityCafe).

Data: Hugging Face ``minhaozhang/mbti`` (Reddit comments with the author's self-reported
MBTI type, GPL-2.0 tag, no dataset card; provenance unclear, probably derived from a
Reddit MBTI corpus such as MBTI9k/PANDORA). Download its test split once (~284 MB):

    curl -L -o data/raw/external/reddit_mbti/test.parquet \
        https://huggingface.co/datasets/minhaozhang/mbti/resolve/main/test.parquet

    python -m src.models.eval_external [--max-users 3000] [--target-words 1300]

Each parquet row is a ~300-word chunk of one author's comments, the comments joined as
``"c1";"c2";...``. Per author we take chunks until ~``--target-words`` words (training users
wrote ~1,300 words), clean them with the SAME ``clean_posts`` as the training data
(Reddit users often write their own type, e.g. "as an INTP"; it is masked) and score
both models. The majority baseline is the PersonalityCafe training majority (INFP),
i.e. what a model that learned nothing would answer. Results:
``reports/models/external_reddit.json``.

This is NOT a replacement for the test split: different platform, different time, labels
from user flairs. It measures how well the PersonalityCafe model transfers.
"""

from __future__ import annotations

import argparse
import json
import re
import time
from pathlib import Path

import numpy as np
import pandas as pd

from src.data_loader import PROJECT_ROOT
from src.etl.cleaning import clean_posts, find_type_mentions
from src.models.evaluate import DIMS, evaluate, format_table, letters_to_type
from src.models.model import POST_SEP, PersonaModel

DEFAULT_PATH = PROJECT_ROOT / "data" / "raw" / "external" / "reddit_mbti" / "test.parquet"
REPORT = PROJECT_ROOT / "reports" / "models" / "external_reddit.json"
MODELS = {"tfidf_logreg": PROJECT_ROOT / "models" / "tfidf_logreg.joblib",
          "tfidf_svm": PROJECT_ROOT / "models" / "tfidf_svm.joblib"}
TRAIN_MAJORITY_TYPE = "INFP"  # PersonalityCafe train split (reports/models/*_v1.json)
TYPES16 = {a + b + c + d for a in "EI" for b in "NS" for c in "FT" for d in "JP"}


def split_comments(body: str) -> list[str]:
    """``"c1";"c2";"c3"`` -> ["c1", "c2", "c3"]."""
    body = body.strip()
    if body.startswith('"'):
        body = body[1:]
    if body.endswith('"'):
        body = body[:-1]
    return [c.strip() for c in re.split(r'";\s*"', body) if c.strip()]


def build_users(df: pd.DataFrame, target_words: int, max_users: int, seed: int) -> pd.DataFrame:
    """One row per author: raw comments up to ~target_words words, label columns."""
    df = df[df["mbti"].str.upper().isin(TYPES16)]
    authors = df["author"].drop_duplicates()
    if max_users and len(authors) > max_users:
        authors = authors.sample(max_users, random_state=seed)
    df = df[df["author"].isin(set(authors))]

    rows = []
    for author, group in df.groupby("author", sort=False):
        comments, words = [], 0
        for body in group["body"]:
            for c in split_comments(body):
                comments.append(c)
                words += len(c.split())
            if words >= target_words:
                break
        t = group["mbti"].iloc[0].upper()
        rows.append({"user_id": author, "type": t, "raw_comments": comments,
                     "EI_label": int(t[0] == "E"), "NS_label": int(t[1] == "N"),
                     "FT_label": int(t[2] == "T"), "JP_label": int(t[3] == "J")})
    return pd.DataFrame(rows)


def majority(eval_df: pd.DataFrame) -> dict:
    t = TRAIN_MAJORITY_TYPE
    bits = {"EI": int(t[0] == "E"), "NS": int(t[1] == "N"), "FT": int(t[2] == "T"), "JP": int(t[3] == "J")}
    res = evaluate(eval_df, {d: np.full(len(eval_df), bits[d]) for d in DIMS})
    res["type16"]["majority_type"] = t
    return res


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--path", type=Path, default=DEFAULT_PATH)
    parser.add_argument("--max-users", type=int, default=3000, help="0 = all authors")
    parser.add_argument("--target-words", type=int, default=1300)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    if not args.path.exists():
        raise SystemExit(f"{args.path} not found; see the download command in this module's docstring")

    t0 = time.time()
    raw = pd.read_parquet(args.path, columns=["author", "body", "mbti"])
    users = build_users(raw, args.target_words, args.max_users, args.seed)
    print(f"{len(raw):,} chunks, {raw['author'].nunique():,} authors -> {len(users):,} users sampled "
          f"({time.time() - t0:.0f}s)")

    own_type_before = np.mean([t in {m.upper().rstrip("S") for m in find_type_mentions(" ".join(c))}
                               for t, c in zip(users["type"], users["raw_comments"])])
    posts = [clean_posts(c) for c in users["raw_comments"]]
    users["text"] = [f" {POST_SEP} ".join(p) for p in posts]
    users["n_words"] = [sum(len(x.split()) for x in p) for p in posts]
    own_type_after = np.mean([t in {m.upper() for m in find_type_mentions(x)}
                              for t, x in zip(users["type"], users["text"])])
    print(f"own type written in text: {own_type_before:.1%} before cleaning, {own_type_after:.1%} after; "
          f"median {users['n_words'].median():.0f} words/user ({time.time() - t0:.0f}s)")

    results = {"majority_baseline": majority(users)}
    for name, path in MODELS.items():
        if not path.exists():
            print(f"skip {name}: {path} missing")
            continue
        model = PersonaModel.load(path)
        _, scores = model.predict_cleaned(users["text"].tolist())
        bits = {d: (scores[d] > 0.5).astype(int) for d in DIMS}
        results[f"{name}_{model.version}"] = evaluate(users, bits)
        if name == "tfidf_logreg":
            users["pred"] = letters_to_type(bits)

    print("\nReddit (out-of-domain) — Macro-F1 per dimension, 16 types; exact match")
    print(format_table(results))

    report = {
        "dataset": "huggingface.co/datasets/minhaozhang/mbti (test split, Reddit)",
        "created_at": pd.Timestamp.now(tz="UTC").isoformat(timespec="seconds"),
        "users": len(users),
        "target_words": args.target_words,
        "median_words_per_user": float(users["n_words"].median()),
        "own_type_mentioned_before_cleaning": round(float(own_type_before), 4),
        "own_type_mentioned_after_cleaning": round(float(own_type_after), 4),
        "label_share": {"E": round(users["EI_label"].mean(), 4), "N": round(users["NS_label"].mean(), 4),
                        "T": round(users["FT_label"].mean(), 4), "J": round(users["JP_label"].mean(), 4)},
        "type_counts": users["type"].value_counts().to_dict(),
        "predicted_type_counts": users["pred"].value_counts().to_dict() if "pred" in users else {},
        "metrics": results,
    }
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"\nreport: {REPORT.relative_to(PROJECT_ROOT)} ({time.time() - t0:.0f}s)")


if __name__ == "__main__":
    main()
