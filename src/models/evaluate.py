"""Metrics for the four binary MBTI classifiers and the combined 16-type prediction.

We report Macro-F1 and Balanced Accuracy (not plain accuracy): the classes are
strongly imbalanced (I 77%, N 86%), so a model that always answers the majority
class already gets a high accuracy while knowing nothing.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, balanced_accuracy_score, f1_score

from src.data_loader import DIMENSIONS

DIMS = list(DIMENSIONS)  # ["EI", "NS", "FT", "JP"]


def label_col(dim: str) -> str:
    """Column with the 0/1 label of a dimension (``EI`` itself holds the letter)."""
    return f"{dim}_label"


def letters_to_type(bits: dict[str, np.ndarray]) -> np.ndarray:
    """Combine four 0/1 arrays (1 = second letter: E, N, T, J) into type codes like 'INTP'."""
    out = None
    for dim in DIMS:
        low, high = DIMENSIONS[dim]
        letters = np.where(np.asarray(bits[dim]) == 1, high, low).astype(object)
        out = letters if out is None else out + letters
    return out.astype(str)


def binary_metrics(y_true, y_pred) -> dict[str, float]:
    return {
        "macro_f1": round(float(f1_score(y_true, y_pred, average="macro", zero_division=0)), 4),
        "balanced_accuracy": round(float(balanced_accuracy_score(y_true, y_pred)), 4),
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
    }


def type_metrics(true_types, pred_types) -> dict[str, float]:
    """16-class metrics plus 'how many letters were right on average'."""
    true_types = np.asarray(true_types, dtype=str)
    pred_types = np.asarray(pred_types, dtype=str)
    letters_right = np.mean([sum(a == b for a, b in zip(t, p))
                             for t, p in zip(true_types, pred_types)])
    m = binary_metrics(true_types, pred_types)
    m["exact_match"] = m.pop("accuracy")
    m["mean_letters_correct"] = round(float(letters_right), 4)
    return m


def evaluate(df: pd.DataFrame, pred_bits: dict[str, np.ndarray]) -> dict:
    """Metrics per dimension and for the 16 types. ``df`` needs the label columns."""
    result = {dim: binary_metrics(df[label_col(dim)], pred_bits[dim]) for dim in DIMS}
    result["type16"] = type_metrics(df["type"], letters_to_type(pred_bits))
    return result


def majority_baseline(train: pd.DataFrame, eval_df: pd.DataFrame) -> dict:
    """'Always answer the most frequent class of the training set' — the floor to beat."""
    bits = {dim: np.full(len(eval_df), int(train[label_col(dim)].mode()[0])) for dim in DIMS}
    result = {dim: binary_metrics(eval_df[label_col(dim)], bits[dim]) for dim in DIMS}
    majority_type = train["type"].mode()[0]
    result["type16"] = type_metrics(eval_df["type"], np.full(len(eval_df), majority_type))
    result["type16"]["majority_type"] = majority_type
    return result


def format_table(results: dict[str, dict]) -> str:
    """Plain-text comparison table: rows = models, columns = Macro-F1 / BalAcc per target."""
    targets = DIMS + ["type16"]
    header = f"{'model':<22}" + "".join(f"{t:>16}" for t in targets)
    sub = f"{'':<22}" + "".join(f"{'F1 / BalAcc':>16}" for _ in targets)
    lines = [header, sub, "-" * len(header)]
    for name, res in results.items():
        cells = "".join(
            f"{res[t]['macro_f1']:>8.3f} /{res[t]['balanced_accuracy']:>6.3f}" for t in targets
        )
        lines.append(f"{name:<22}{cells}")
    return "\n".join(lines)
