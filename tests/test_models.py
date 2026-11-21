"""Tests for src/models (metrics, training loop, saving, app predict contract).

They use a tiny synthetic dataset, so they run in seconds and need neither the
real data nor PostgreSQL.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from src.models import evaluate as ev
from src.models.model import PersonaModel, prepare_text
from src.models.predict import MIN_WORDS, predict
from src.models.train import fit_vectorizer, predictions_frame, train_model

# Each letter has its own "signal word", so a working pipeline must learn them.
SIGNAL = {"E": "party", "I": "quiet", "N": "ideas", "S": "facts",
          "T": "logic", "F": "feelings", "J": "plans", "P": "spontaneous"}
TYPES = ["INFP", "INTJ", "ENFP", "ESTJ", "ISFP", "ENTP", "INFJ", "ISTP"]


def make_df(n_per_type: int = 6, split: str = "train", seed: int = 0) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    filler = ["the", "a", "day", "today", "really", "think", "good", "time"]
    rows = []
    for t in TYPES:
        for i in range(n_per_type):
            words = [SIGNAL[c] for c in t] * 3 + list(rng.choice(filler, 20))
            rng.shuffle(words)
            text = " ".join(words[:15]) + " <POST_SEP> " + " ".join(words[15:])
            rows.append({
                "user_id": f"{split}_{t}_{i}", "type": t, "text": text, "split": split,
                "EI_label": int(t[0] == "E"), "NS_label": int(t[1] == "N"),
                "FT_label": int(t[2] == "T"), "JP_label": int(t[3] == "J"),
            })
    return pd.DataFrame(rows)


@pytest.fixture(scope="module")
def trained():
    train, val = make_df(split="train", seed=1), make_df(split="validation", seed=2)
    vec = fit_vectorizer(train["text"], {"min_df": 1, "sublinear_tf": True})
    X_train = vec.transform([prepare_text(t) for t in train["text"]])
    X_val = vec.transform([prepare_text(t) for t in val["text"]])
    model = train_model("logreg", train, val, vec, X_train, X_val, grid=[1.0, 10.0])
    return model, train, val, X_val


# --- evaluate ---------------------------------------------------------------

def test_letters_to_type():
    bits = {"EI": [0, 1], "NS": [1, 0], "FT": [1, 0], "JP": [0, 1]}
    assert ev.letters_to_type(bits).tolist() == ["INTP", "ESFJ"]


def test_majority_baseline_is_the_floor():
    train = pd.DataFrame({"type": ["INFP"] * 3 + ["ENTJ"],
                          "EI_label": [0, 0, 0, 1], "NS_label": [1, 1, 1, 1],
                          "FT_label": [0, 0, 0, 1], "JP_label": [0, 0, 0, 1]})
    res = ev.majority_baseline(train, train)
    assert res["EI"]["balanced_accuracy"] == 0.5          # always "I": knows nothing
    assert res["EI"]["accuracy"] == 0.75                  # ...but plain accuracy looks good
    assert res["type16"]["majority_type"] == "INFP"
    assert res["type16"]["exact_match"] == 0.75


def test_type_metrics_letters_correct():
    m = ev.type_metrics(["INTP", "ESFJ"], ["INTJ", "ESFJ"])
    assert m["exact_match"] == 0.5
    assert m["mean_letters_correct"] == 3.5


def test_format_table_has_all_targets():
    res = {d: {"macro_f1": 0.5, "balanced_accuracy": 0.5} for d in ev.DIMS + ["type16"]}
    table = ev.format_table({"m": res})
    assert all(t in table for t in ev.DIMS + ["type16"])


# --- model / training -------------------------------------------------------

def test_prepare_text_removes_separator():
    assert "POST_SEP" not in prepare_text("a <POST_SEP> b")


def test_training_learns_signal_words(trained):
    model, _, val, X_val = trained
    bits = {d: (s > 0.5).astype(int) for d, s in model.scores_from_matrix(X_val).items()}
    res = ev.evaluate(val, bits)
    assert all(res[d]["macro_f1"] > 0.9 for d in ev.DIMS)
    top = model.top_features(3)
    assert "party" in top["EI"]["E"] and "quiet" in top["EI"]["I"]
    assert set(model.params["C"]) == set(ev.DIMS)


def test_svm_scores_are_0_to_1():
    train, val = make_df(seed=3), make_df(split="validation", seed=4)
    vec = fit_vectorizer(train["text"], {"min_df": 1})
    X_tr, X_va = vec.transform(train["text"]), vec.transform(val["text"])
    model = train_model("svm", train, val, vec, X_tr, X_va, grid=[0.1])
    scores = model.scores_from_matrix(X_va)
    assert all(((s >= 0) & (s <= 1)).all() for s in scores.values())


def test_predictions_frame_matches_dw_contract(trained):
    model, _, val, X_val = trained
    preds = predictions_frame(model, val, X_val)
    assert list(preds.columns) == ["user_id", "predicted_type", "score_e", "score_n", "score_t", "score_j"]
    assert len(preds) == len(val)
    # predicted letter agrees with its score
    assert ((preds["score_e"] > 0.5) == preds["predicted_type"].str[0].eq("E")).all()


def test_save_and_load_roundtrip(trained, tmp_path):
    model = trained[0]
    path = model.save(tmp_path)
    loaded = PersonaModel.load(path)
    t1, _ = model.predict_cleaned(["party ideas logic plans"])
    t2, _ = loaded.predict_cleaned(["party ideas logic plans"])
    assert t1.tolist() == t2.tolist()


# --- app contract -----------------------------------------------------------

def test_predict_contract(trained):
    model = trained[0]
    out = predict(["I love a party and new ideas", "logic and plans all day"], model=model)
    assert set(out) == {"type", "scores", "n_words", "enough_text", "model"}
    assert len(out["type"]) == 4
    assert set(out["scores"]) == set(ev.DIMS)
    assert out["enough_text"] is (out["n_words"] >= MIN_WORDS)
    assert out["enough_text"] is False


def test_predict_masks_self_reported_type(trained, monkeypatch):
    """A user typing their type must not reach the model: input goes through clean_text."""
    seen = {}
    model = trained[0]
    original = model.predict_cleaned

    def spy(texts):
        seen["text"] = texts[0]
        return original(texts)

    monkeypatch.setattr(model, "predict_cleaned", spy)
    predict("As an INFJ I love ideas", model=model)
    assert "INFJ" not in seen["text"] and "<MBTI_TYPE>" in seen["text"]
