"""Inference contract for the Streamlit app.

    from src.models.predict import predict
    result = predict(["first post ...", "second post ..."])   # posts of ONE person
    # {"type": "INTP",
    #  "scores": {"EI": 0.21, "NS": 0.83, "FT": 0.66, "JP": 0.31},   # P(E), P(N), P(T), P(J)
    #  "n_words": 512, "enough_text": True, "model": "tfidf_logreg v1"}

The raw user text is cleaned with the SAME ``clean_posts`` as the training data
(encoding fixes + MBTI/typology masking, empty / placeholder-only / duplicate posts
dropped), so a user writing "I'm an INFJ" cannot leak the answer. The text is never stored.

Results are self-reported-MBTI style guesses from writing style, not a diagnosis.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from src.data_loader import PROJECT_ROOT
from src.etl.cleaning import clean_posts
from src.models.evaluate import DIMS
from src.models.model import POST_SEP, PersonaModel

DEFAULT_MODEL = PROJECT_ROOT / "models" / "tfidf_logreg.joblib"

# Training users wrote ~1,300 words on average (min 4, 25th percentile ~1,100).
# Below this the prediction is close to guessing; the app must show a warning.
MIN_WORDS = 300


@lru_cache(maxsize=4)
def load_model(path: str | Path = DEFAULT_MODEL) -> PersonaModel:
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"{path} not found; train it first: python -m src.models.train")
    return PersonaModel.load(path)


def predict(texts: list[str], model: PersonaModel | str | Path | None = None) -> dict:
    """Predict one MBTI type from the posts (or one long text) of a single person."""
    if isinstance(texts, str):
        texts = [texts]
    if not isinstance(model, PersonaModel):
        model = load_model(model or DEFAULT_MODEL)

    posts = clean_posts([t for t in texts if t and t.strip()])
    text = f" {POST_SEP} ".join(posts)
    n_words = sum(len(p.split()) for p in posts)

    types, scores = model.predict_cleaned([text])
    return {
        "type": str(types[0]),
        "scores": {dim: round(float(scores[dim][0]), 4) for dim in DIMS},
        "n_words": n_words,
        "enough_text": n_words >= MIN_WORDS,
        "n_posts": len(posts),
        "model": f"{model.name} {model.version}",
        "model_name": model.name,
        "model_version": model.version,
    }
