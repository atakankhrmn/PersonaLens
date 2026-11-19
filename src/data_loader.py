"""Load the PersonalityCafe MBTI dataset from Hugging Face.

The dataset is downloaded once and cached locally as Parquet under
``data/raw/<config>.parquet`` so that later runs work offline and fast.

Usage:
    from src.data_loader import load_mbti
    df = load_mbti("label_clean")          # all splits in one DataFrame
    train = df[df["split"] == "train"]
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

DATASET_ID = "Lazanantenaina/personalitycafe-mbti-preprocessed"
CONFIGS = ("raw", "label_clean", "psychometric_clean")

PROJECT_ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = PROJECT_ROOT / "data" / "raw"

DIMENSIONS = {
    "EI": ("I", "E"),
    "NS": ("S", "N"),
    "FT": ("F", "T"),
    "JP": ("P", "J"),
}


def load_mbti(config: str = "label_clean", force_download: bool = False) -> pd.DataFrame:
    """Return all splits of one dataset configuration as a single DataFrame.

    Each row is one user. The ``split`` column says train / validation / test.
    """
    if config not in CONFIGS:
        raise ValueError(f"config must be one of {CONFIGS}, got {config!r}")

    cache = RAW_DIR / f"{config}.parquet"
    if cache.exists() and not force_download:
        return pd.read_parquet(cache)

    from datasets import load_dataset  # imported lazily: slow import

    ds = load_dataset(DATASET_ID, config)
    df = pd.concat([ds[split].to_pandas() for split in ds], ignore_index=True)

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    df.to_parquet(cache, index=False)
    return df
