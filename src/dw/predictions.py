"""Write model results into the warehouse (for the ML step and the Streamlit app).

ML step, after training and predicting on the dataset users:

    from src.dw.db import get_engine
    from src.dw.predictions import register_model, write_predictions

    engine = get_engine()
    model_key = register_model(engine, "tfidf_logreg", "v1",
                               algorithm="TF-IDF + LogisticRegression",
                               params={"C": 1.0}, metrics={"val_macro_f1": {"EI": 0.6}})
    write_predictions(engine, model_key, preds)   # preds: DataFrame, see below

``preds`` needs the columns ``user_id``, ``predicted_type`` and optionally
``score_e``, ``score_n``, ``score_t``, ``score_j`` (model scores 0..1 for the
letters E, N, T, J). True type and split are taken from ``dw.dim_user``.

Streamlit app, after a prediction on typed-in text (the text is never stored):

    log_app_prediction(engine, model_key, "INTP", {"score_e": 0.2, ...}, n_posts=12, n_words=480)
"""

from __future__ import annotations

import io
import json
from datetime import datetime, timezone

import pandas as pd
from sqlalchemy import Engine

from src.dw.load_dw import LABEL_ORDER, source_code

SCORE_COLS = ["score_e", "score_n", "score_t", "score_j"]
APP_SOURCE = "personalens-app"


def _today_key() -> int:
    return int(datetime.now(timezone.utc).strftime("%Y%m%d"))


def register_model(
    engine: Engine,
    model_name: str,
    model_version: str,
    algorithm: str | None = None,
    training_source: str | None = None,
    params: dict | None = None,
    metrics: dict | None = None,
    trained_at: datetime | None = None,
) -> int:
    """Insert or update a model in ``dw.dim_model`` and return its ``model_key``."""
    training_source = training_source or source_code("psychometric_clean")
    raw = engine.raw_connection()
    try:
        with raw.cursor() as cur:
            cur.execute("""
                INSERT INTO dw.dim_model (model_name, model_version, algorithm, training_source,
                                          params, metrics, trained_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (model_name, model_version) DO UPDATE SET
                    algorithm = EXCLUDED.algorithm, training_source = EXCLUDED.training_source,
                    params = EXCLUDED.params, metrics = EXCLUDED.metrics,
                    trained_at = EXCLUDED.trained_at
                RETURNING model_key
            """, (model_name, model_version, algorithm, training_source,
                  json.dumps(params) if params is not None else None,
                  json.dumps(metrics) if metrics is not None else None,
                  trained_at or datetime.now(timezone.utc)))
            key = cur.fetchone()[0]
        raw.commit()
        return key
    finally:
        raw.close()


def _validate(preds: pd.DataFrame) -> pd.DataFrame:
    missing = {"user_id", "predicted_type"} - set(preds.columns)
    if missing:
        raise ValueError(f"preds is missing columns: {sorted(missing)}")
    out = preds.copy()
    for col in SCORE_COLS:
        if col not in out.columns:
            out[col] = None
    bad = ~out["predicted_type"].isin(LABEL_ORDER)
    if bad.any():
        raise ValueError(f"Unknown predicted types: {sorted(out.loc[bad, 'predicted_type'].unique())}")
    return out[["user_id", "predicted_type", *SCORE_COLS]]


def write_predictions(
    engine: Engine,
    model_key: int,
    preds: pd.DataFrame,
    source: str | None = None,
    replace: bool = True,
) -> int:
    """Store dataset predictions in ``dw.fact_prediction``; returns rows written.

    With ``replace=True`` earlier predictions of this model for the same users
    are deleted first, so re-running an experiment does not duplicate rows.
    """
    preds = _validate(preds)
    source = source or source_code("psychometric_clean")
    raw = engine.raw_connection()
    try:
        with raw.cursor() as cur:
            cur.execute("SELECT source_key FROM dw.dim_source WHERE source_code = %s", (source,))
            row = cur.fetchone()
            if row is None:
                raise ValueError(f"Unknown source {source!r}; run python -m src.dw.load_dw first")
            source_key = row[0]

            cur.execute("""CREATE TEMP TABLE stg_pred (user_id VARCHAR(32), predicted_type CHAR(4),
                           score_e REAL, score_n REAL, score_t REAL, score_j REAL) ON COMMIT DROP""")
            buf = io.StringIO()
            preds.to_csv(buf, index=False, header=False)
            buf.seek(0)
            cur.copy_expert("COPY stg_pred FROM STDIN WITH (FORMAT csv)", buf)

            cur.execute("""SELECT COUNT(*) FROM stg_pred s
                           LEFT JOIN dw.dim_user u ON u.user_id = s.user_id
                           WHERE u.user_key IS NULL""")
            unknown = cur.fetchone()[0]
            if unknown:
                raise ValueError(f"{unknown} user_id(s) are not in dw.dim_user")

            if replace:
                cur.execute("""DELETE FROM dw.fact_prediction p USING dw.dim_user u, stg_pred s
                               WHERE p.model_key = %s AND p.user_key = u.user_key
                                 AND u.user_id = s.user_id""", (model_key,))

            cur.execute("""
                INSERT INTO dw.fact_prediction (model_key, source_key, date_key, user_key, split,
                                                true_type_key, predicted_type_key,
                                                score_e, score_n, score_t, score_j,
                                                n_posts_used, n_words_used)
                SELECT %s, %s, %s, u.user_key, u.split, tt.type_key, pt.type_key,
                       s.score_e, s.score_n, s.score_t, s.score_j,
                       agg.n_posts, agg.n_words
                FROM stg_pred s
                JOIN dw.dim_user u       ON u.user_id = s.user_id
                JOIN dw.dim_mbti_type tt ON tt.type_code = u.self_reported_type
                JOIN dw.dim_mbti_type pt ON pt.type_code = s.predicted_type
                LEFT JOIN (SELECT user_key, COUNT(*) AS n_posts, SUM(word_count) AS n_words
                           FROM dw.fact_post WHERE source_key = %s GROUP BY user_key) agg
                       ON agg.user_key = u.user_key
            """, (model_key, source_key, _today_key(), source_key))
            n = cur.rowcount
        raw.commit()
        return n
    except Exception:
        raw.rollback()
        raise
    finally:
        raw.close()


def log_app_prediction(
    engine: Engine,
    model_key: int,
    predicted_type: str,
    scores: dict[str, float] | None = None,
    n_posts: int | None = None,
    n_words: int | None = None,
) -> None:
    """Record one prediction made in the app. The user's text is NOT stored."""
    if predicted_type not in LABEL_ORDER:
        raise ValueError(f"Unknown type {predicted_type!r}")
    scores = scores or {}
    raw = engine.raw_connection()
    try:
        with raw.cursor() as cur:
            cur.execute("""
                INSERT INTO dw.dim_source (source_code, platform, cleaning)
                VALUES (%s, 'PersonaLens app', 'clean_text')
                ON CONFLICT (source_code) DO UPDATE SET platform = EXCLUDED.platform
                RETURNING source_key
            """, (APP_SOURCE,))
            source_key = cur.fetchone()[0]
            cur.execute("""
                INSERT INTO dw.fact_prediction (model_key, source_key, date_key, predicted_type_key,
                                                score_e, score_n, score_t, score_j,
                                                n_posts_used, n_words_used)
                SELECT %s, %s, %s, type_key, %s, %s, %s, %s, %s, %s
                FROM dw.dim_mbti_type WHERE type_code = %s
            """, (model_key, source_key, _today_key(),
                  *(scores.get(c) for c in SCORE_COLS), n_posts, n_words, predicted_type))
        raw.commit()
    finally:
        raw.close()
