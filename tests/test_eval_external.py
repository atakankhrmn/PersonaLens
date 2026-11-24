"""Tests for the Reddit out-of-domain evaluation helpers (no download needed)."""

import pandas as pd

from src.models.eval_external import build_users, majority, split_comments


def test_split_comments():
    body = '"Hello there.";"Second one; with a semicolon";"Third"'
    assert split_comments(body) == ["Hello there.", "Second one; with a semicolon", "Third"]
    assert split_comments('"only one"') == ["only one"]


def test_build_users_stops_at_target_words_and_keeps_labels():
    chunk = '"' + " ".join(["word"] * 100) + '"'
    df = pd.DataFrame({
        "author": ["a"] * 5 + ["b", "c"],
        "body": [chunk] * 5 + [chunk, chunk],
        "mbti": ["INTP"] * 5 + ["esfj", "XXXX"],  # lower case accepted, invalid type dropped
    })
    users = build_users(df, target_words=250, max_users=0, seed=0).set_index("user_id")
    assert set(users.index) == {"a", "b"}
    assert len(users.loc["a", "raw_comments"]) == 3          # 300 words >= 250, then stop
    assert users.loc["b", "type"] == "ESFJ"
    assert users.loc["b", ["EI_label", "NS_label", "FT_label", "JP_label"]].tolist() == [1, 0, 0, 1]


def test_majority_baseline_is_infp():
    users = pd.DataFrame({"type": ["INFP", "ENTJ"], "EI_label": [0, 1], "NS_label": [1, 1],
                          "FT_label": [0, 1], "JP_label": [0, 1]})
    res = majority(users)
    assert res["type16"]["majority_type"] == "INFP"
    assert res["type16"]["exact_match"] == 0.5
    assert res["NS"]["accuracy"] == 1.0
