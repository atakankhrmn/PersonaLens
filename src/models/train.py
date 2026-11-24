"""Train the baseline models: TF-IDF + Logistic Regression and TF-IDF + linear SVM.

    python -m src.models.train                    # both models, tune on validation, save, write to DW
    python -m src.models.train --model logreg     # only one model
    python -m src.models.train --no-dw            # do not write to PostgreSQL
    python -m src.models.train --final-test       # ALSO score the test split (final evaluation only!)

Steps (see AGENTS.md → Modelling guidelines):
1. Load the cleaned data (``load_clean``) and use the given user-level split.
2. Fit ONE TF-IDF vocabulary on the train users only (validation/test words stay unseen).
3. For every dimension (EI, NS, FT, JP) try several regularisation strengths C,
   train on train, score on validation, keep the C with the best validation Macro-F1.
4. Combine the four letters into the 16-type prediction and compare with the
   majority-class baseline.
5. Save ``models/<name>.joblib``, the report ``reports/models/<name>_<version>.json``
   and (unless ``--no-dw``) the model + predictions in the warehouse.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import f1_score

from src.data_loader import PROJECT_ROOT, load_clean
from src.models.evaluate import DIMS, evaluate, label_col, format_table, letters_to_type, majority_baseline
from src.models.model import ALGORITHMS, TFIDF_PARAMS, PersonaModel, make_classifier, prepare_text

MODELS_DIR = PROJECT_ROOT / "models"
REPORTS_DIR = PROJECT_ROOT / "reports" / "models"

# Candidate regularisation strengths. Small C = strong regularisation (simpler model).
C_GRID = {
    "logreg": [0.01, 0.03, 0.1, 0.3, 1.0, 3.0, 10.0, 30.0, 100.0],
    "svm": [0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1.0, 3.0, 10.0],
}


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def fit_vectorizer(texts, params: dict | None = None) -> TfidfVectorizer:
    vec = TfidfVectorizer(**(params or TFIDF_PARAMS))
    vec.fit([prepare_text(t) for t in texts])
    return vec


def tune_dimension(algorithm: str, X_train, y_train, X_val, y_val, grid) -> tuple:
    """Return (best fitted classifier, best C, {C: validation Macro-F1})."""
    scores, best = {}, None
    for C in grid:
        clf = make_classifier(algorithm, C).fit(X_train, y_train)
        f1 = f1_score(y_val, clf.predict(X_val), average="macro")
        scores[C] = round(float(f1), 4)
        if best is None or f1 > best[2]:
            best = (clf, C, f1)
    return best[0], best[1], scores


def train_model(
    algorithm: str,
    train: pd.DataFrame,
    val: pd.DataFrame,
    vectorizer: TfidfVectorizer,
    X_train,
    X_val,
    version: str = "v1",
    grid: list[float] | None = None,
) -> PersonaModel:
    grid = grid or C_GRID[algorithm]
    model = PersonaModel(name=f"tfidf_{algorithm}", version=version,
                         algorithm=ALGORITHMS[algorithm], vectorizer=vectorizer)
    tuning = {}
    for dim in DIMS:
        clf, C, scores = tune_dimension(algorithm, X_train, train[label_col(dim)],
                                        X_val, val[label_col(dim)], grid)
        model.classifiers[dim] = clf
        tuning[dim] = {"best_C": C, "val_macro_f1_by_C": scores}
        log(f"  {model.name} {dim}: best C={C}  (val Macro-F1 by C: {scores})")

    tfidf = {k: (list(v) if isinstance(v, tuple) else v)
             for k, v in vectorizer.get_params().items()
             if k in TFIDF_PARAMS and k != "dtype"}
    model.params = {"tfidf": tfidf, "class_weight": "balanced",
                    "C": {dim: tuning[dim]["best_C"] for dim in DIMS},
                    "vocabulary_size": len(vectorizer.vocabulary_)}
    model.metrics = {"tuning": tuning}
    return model


def predictions_frame(model: PersonaModel, df: pd.DataFrame, X) -> pd.DataFrame:
    """Rows for ``src.dw.predictions.write_predictions``."""
    scores = model.scores_from_matrix(X)
    bits = {dim: (s > 0.5).astype(int) for dim, s in scores.items()}
    return pd.DataFrame({
        "user_id": df["user_id"].to_numpy(),
        "predicted_type": letters_to_type(bits),
        "score_e": scores["EI"], "score_n": scores["NS"],
        "score_t": scores["FT"], "score_j": scores["JP"],
    })


def write_to_dw(model: PersonaModel, preds: pd.DataFrame) -> None:
    from src.dw.db import get_engine
    from src.dw.predictions import register_model, write_predictions

    engine = get_engine()
    try:
        keep = ("validation", "test", "majority_baseline_validation", "majority_baseline_test")
        summary = {k: v for k, v in model.metrics.items() if k in keep}
        key = register_model(engine, model.name, model.version, algorithm=model.algorithm,
                             params=model.params, metrics=summary)
        n = write_predictions(engine, key, preds)
        log(f"  DW: model_key={key}, {n} predictions written")
    finally:
        engine.dispose()


def run(algorithms: list[str], version: str = "v1", use_dw: bool = True,
        final_test: bool = False) -> dict[str, PersonaModel]:
    df = load_clean()
    train, val, test = (df[df["split"] == s].reset_index(drop=True)
                        for s in ("train", "validation", "test"))
    log(f"Users: train {len(train)}, validation {len(val)}, test {len(test)}")

    log("Fitting TF-IDF on train users …")
    vec = fit_vectorizer(train["text"])
    X_train = vec.transform([prepare_text(t) for t in train["text"]])
    X_val = vec.transform([prepare_text(t) for t in val["text"]])
    log(f"Vocabulary: {len(vec.vocabulary_):,} terms; X_train {X_train.shape}")

    baseline_val = majority_baseline(train, val)
    table = {"majority_baseline": baseline_val}
    models = {}
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    for algorithm in algorithms:
        log(f"Training {algorithm} …")
        model = train_model(algorithm, train, val, vec, X_train, X_val, version=version)
        val_bits = {d: (s > 0.5).astype(int) for d, s in model.scores_from_matrix(X_val).items()}
        model.metrics["validation"] = evaluate(val, val_bits)
        model.metrics["majority_baseline_validation"] = baseline_val
        table[model.name] = model.metrics["validation"]

        frames = [predictions_frame(model, train, X_train), predictions_frame(model, val, X_val)]
        if final_test:
            X_test = vec.transform([prepare_text(t) for t in test["text"]])
            test_frame = predictions_frame(model, test, X_test)
            test_bits = {d: (test_frame[c] > 0.5).astype(int).to_numpy() for d, c in
                         zip(DIMS, ["score_e", "score_n", "score_t", "score_j"])}
            model.metrics["test"] = evaluate(test, test_bits)
            model.metrics["majority_baseline_test"] = majority_baseline(train, test)
            frames.append(test_frame)

        report = {"model": model.name, "version": model.version, "algorithm": model.algorithm,
                  "params": model.params, "metrics": model.metrics,
                  "top_features": model.top_features()}
        report_path = REPORTS_DIR / f"{model.name}_{version}.json"
        report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
        path = model.save(MODELS_DIR)
        log(f"  saved {path.relative_to(PROJECT_ROOT)} and {report_path.relative_to(PROJECT_ROOT)}")

        if use_dw:
            try:
                write_to_dw(model, pd.concat(frames, ignore_index=True))
            except Exception as exc:  # DB down or not loaded: the model is still saved
                log(f"  DW write skipped: {exc}")
        models[model.name] = model

    print("\nValidation results (Macro-F1 / Balanced Accuracy)\n")
    print(format_table(table))
    if final_test:
        test_table = {"majority_baseline": majority_baseline(train, test)}
        test_table.update({m.name: m.metrics["test"] for m in models.values()})
        print("\nTEST results (final evaluation)\n")
        print(format_table(test_table))
    return models


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--model", choices=[*ALGORITHMS, "all"], default="all")
    parser.add_argument("--version", default="v1")
    parser.add_argument("--no-dw", action="store_true", help="do not write to PostgreSQL")
    parser.add_argument("--final-test", action="store_true",
                        help="also evaluate on the test split (final evaluation only)")
    args = parser.parse_args()
    algorithms = list(ALGORITHMS) if args.model == "all" else [args.model]
    np.random.seed(42)
    run(algorithms, version=args.version, use_dw=not args.no_dw, final_test=args.final_test)


if __name__ == "__main__":
    main()
