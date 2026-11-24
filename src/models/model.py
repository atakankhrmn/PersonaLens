"""PersonaModel: one TF-IDF vectoriser + four binary linear classifiers (E/I, N/S, T/F, J/P).

The same object is used for training (``src.models.train``) and in the Streamlit app
(``src.models.predict``), so train-time and inference-time text go through the
same steps.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC

from src.data_loader import DIMENSIONS
from src.models.evaluate import DIMS, letters_to_type

POST_SEP = "<POST_SEP>"

ALGORITHMS = {
    "logreg": "TF-IDF + LogisticRegression",
    "svm": "TF-IDF + LinearSVC",
}

# Default TF-IDF settings (see AGENTS.md → Modelling guidelines).
TFIDF_PARAMS = {
    "ngram_range": (1, 2),   # single words and word pairs ("i feel", "i think")
    "min_df": 3,             # ignore terms used by fewer than 3 users (typos, names)
    "max_df": 0.9,           # ignore terms used by >90% of users (carry no signal)
    "max_features": 200_000,
    "sublinear_tf": True,    # 1 + log(count): a word used 100x is not 100x as important
    "dtype": np.float32,
}


def prepare_text(text: str) -> str:
    """Turn the post separator into a space so it does not become a token."""
    return text.replace(POST_SEP, " ")


def make_classifier(algorithm: str, C: float, seed: int = 42):
    """A balanced binary linear classifier (class_weight='balanced' against the I/N skew)."""
    if algorithm == "logreg":
        return LogisticRegression(C=C, class_weight="balanced", max_iter=2000,
                                  solver="liblinear", random_state=seed)
    if algorithm == "svm":
        return LinearSVC(C=C, class_weight="balanced", max_iter=5000, random_state=seed)
    raise ValueError(f"algorithm must be one of {sorted(ALGORITHMS)}, got {algorithm!r}")


def _sigmoid(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-x))


@dataclass
class PersonaModel:
    """Container that is saved with joblib as ``models/<name>.joblib``."""

    name: str
    version: str
    algorithm: str
    vectorizer: TfidfVectorizer
    classifiers: dict = field(default_factory=dict)   # dim -> fitted classifier
    params: dict = field(default_factory=dict)
    metrics: dict = field(default_factory=dict)

    # --- scoring -------------------------------------------------------------
    def transform(self, texts) -> "np.ndarray":
        return self.vectorizer.transform([prepare_text(t) for t in texts])

    def scores_from_matrix(self, X) -> dict[str, np.ndarray]:
        """Score 0..1 for the second letter of each pair (E, N, T, J).

        Logistic Regression gives a probability; LinearSVC has none, so its decision
        value is squashed with a sigmoid (an uncalibrated score). In both cases
        score > 0.5 means the model predicts the second letter.
        """
        out = {}
        for dim in DIMS:
            clf = self.classifiers[dim]
            if hasattr(clf, "predict_proba"):
                out[dim] = clf.predict_proba(X)[:, 1]
            else:
                out[dim] = _sigmoid(clf.decision_function(X))
        return out

    def predict_cleaned(self, texts) -> tuple[np.ndarray, dict[str, np.ndarray]]:
        """Predict for texts that are ALREADY cleaned (dataset users). Returns (types, scores)."""
        scores = self.scores_from_matrix(self.transform(texts))
        bits = {dim: (s > 0.5).astype(int) for dim, s in scores.items()}
        return letters_to_type(bits), scores

    # --- interpretation ------------------------------------------------------
    def top_features(self, n: int = 15) -> dict[str, dict[str, list[str]]]:
        """The n words that push hardest towards each letter, per dimension."""
        vocab = np.asarray(self.vectorizer.get_feature_names_out())
        out = {}
        for dim in DIMS:
            coef = np.ravel(self.classifiers[dim].coef_)
            order = np.argsort(coef)
            low, high = DIMENSIONS[dim]
            out[dim] = {high: vocab[order[::-1][:n]].tolist(), low: vocab[order[:n]].tolist()}
        return out

    # --- persistence ---------------------------------------------------------
    def save(self, directory: str | Path) -> Path:
        directory = Path(directory)
        directory.mkdir(parents=True, exist_ok=True)
        path = directory / f"{self.name}.joblib"
        joblib.dump(self, path, compress=3)
        return path

    @staticmethod
    def load(path: str | Path) -> "PersonaModel":
        return joblib.load(path)
