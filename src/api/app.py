"""PersonaLens inference + insights API (FastAPI).

Run from the repo root (the web frontend expects it on port 8000):

    python -m src.api                      # = uvicorn src.api.app:app --port 8000

Endpoints (contract in frontend/README.md):

- ``GET  /health``                 model loaded? warehouse reachable?
- ``POST /api/analyze``            ``{"texts": [...], "input_mode": "single"|"multiple"}``
- ``GET  /api/insights/overview|types|dimensions|etl|models``

Privacy: the submitted text is only held in memory for the prediction. If the warehouse is
reachable, ``log_app_prediction`` records the predicted type, scores and post/word counts,
never the text.
"""

from __future__ import annotations

import logging
import os
import threading
import time
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, text

from src.api import insights
from src.dw.db import database_url
from src.dw.predictions import log_app_prediction
from src.models.predict import DEFAULT_MODEL, MIN_WORDS, load_model, predict

log = logging.getLogger("personalens.api")

MAX_TOTAL_CHARS = 50_000
MAX_TEXTS = 200
CACHE_SECONDS = 300
DW_RETRY_SECONDS = 30
# predict() scores -> dw.fact_prediction columns (score of E, N, T, J)
SCORE_COLUMNS = {"EI": "score_e", "NS": "score_n", "FT": "score_t", "JP": "score_j"}

app = FastAPI(title="PersonaLens API", version="1.0")


# ---------------------------------------------------------------------------- warehouse
class _Warehouse:
    """Lazily created engine; None while PostgreSQL is down (retried every 30 s)."""

    def __init__(self) -> None:
        self._engine = None
        self._checked_at = 0.0
        self._lock = threading.Lock()
        self.model_keys: dict[tuple[str, str], int] = {}

    def engine(self):
        if os.environ.get("PERSONALENS_NO_DW") == "1":
            return None
        with self._lock:
            if self._engine is not None:
                return self._engine
            if time.monotonic() - self._checked_at < DW_RETRY_SECONDS and self._checked_at:
                return None
            self._checked_at = time.monotonic()
            try:
                eng = create_engine(database_url(), pool_pre_ping=True,
                                    connect_args={"connect_timeout": 3})
                with eng.connect() as conn:
                    conn.execute(text("SELECT 1 FROM dw.dim_user LIMIT 1"))
                self._engine = eng
                log.info("Connected to the data warehouse")
            except Exception as exc:  # noqa: BLE001
                log.warning("Data warehouse not reachable: %s", exc.__class__.__name__)
                self._engine = None
            return self._engine

    def reset(self) -> None:
        with self._lock:
            self._engine = None
            self._checked_at = 0.0

    def model_key(self, name: str, version: str) -> int | None:
        eng = self.engine()
        if eng is None:
            return None
        if (name, version) not in self.model_keys:
            with eng.connect() as conn:
                key = conn.execute(
                    text("SELECT model_key FROM dw.dim_model WHERE model_name = :n AND model_version = :v"),
                    {"n": name, "v": version},
                ).scalar()
            if key is None:
                return None
            self.model_keys[(name, version)] = int(key)
        return self.model_keys[(name, version)]


warehouse = _Warehouse()
_cache: dict[str, tuple[float, object]] = {}


def _cached(name: str, build):
    hit = _cache.get(name)
    if hit and time.monotonic() - hit[0] < CACHE_SECONDS:
        return hit[1]
    value = build()
    _cache[name] = (time.monotonic(), value)
    return value


def _unavailable(message: str, status: int = 503) -> JSONResponse:
    return JSONResponse(status_code=status, content={"available": False, "message": message})


# ---------------------------------------------------------------------------- health
@app.get("/health")
def health():
    try:
        model = load_model(DEFAULT_MODEL)
    except FileNotFoundError as exc:
        return JSONResponse(status_code=503, content={"ok": False, "model_loaded": False,
                                                      "message": str(exc)})
    return {
        "ok": True,
        "model_loaded": True,
        "model": f"{model.name} {model.version}",
        "min_words": MIN_WORDS,
        "warehouse": warehouse.engine() is not None,
    }


# ---------------------------------------------------------------------------- analyze
class AnalyzeRequest(BaseModel):
    texts: list[str] = Field(default_factory=list)
    input_mode: Literal["single", "multiple"] = "single"


def _bad_input(message: str) -> JSONResponse:
    return JSONResponse(status_code=400, content={"code": "INVALID_INPUT", "error": message})


@app.post("/api/analyze")
def analyze(req: AnalyzeRequest):
    texts = [t.strip() for t in req.texts if isinstance(t, str) and t.strip()]
    if not texts:
        return _bad_input("Please enter at least one non-empty writing sample.")
    if len(texts) > MAX_TEXTS:
        return _bad_input(f"At most {MAX_TEXTS} posts can be analysed at once.")
    if sum(len(t) for t in texts) > MAX_TOTAL_CHARS:
        return _bad_input(f"Combined text length exceeds the {MAX_TOTAL_CHARS:,} character limit.")

    try:
        result = predict(texts)
    except FileNotFoundError:
        return JSONResponse(status_code=503, content={
            "code": "MODEL_NOT_CONNECTED", "connected": False,
            "message": "The trained model file is missing; run python -m src.models.train.",
        })

    if result["n_words"] == 0:
        return _bad_input("Nothing is left after cleaning (only MBTI/typology terms or empty posts). "
                          "Please write about something else.")

    logged = False
    try:
        key = warehouse.model_key(result["model_name"], result["model_version"])
        if key is not None:
            scores = {SCORE_COLUMNS[dim]: value for dim, value in result["scores"].items()}
            log_app_prediction(warehouse.engine(), key, result["type"], scores=scores,
                               n_posts=result["n_posts"], n_words=result["n_words"])
            logged = True
    except Exception as exc:  # noqa: BLE001 - logging must never break a prediction
        log.warning("Could not log app prediction: %s", exc.__class__.__name__)
        warehouse.reset()

    return {
        "predicted_type": result["type"],
        "scores": result["scores"],
        "model_version": result["model"],
        "n_words": result["n_words"],
        "n_posts": result["n_posts"],
        "enough_text": result["enough_text"],
        "min_words": MIN_WORDS,
        "logged_to_dw": logged,
    }


# ---------------------------------------------------------------------------- insights
def _insight(name: str, build):
    try:
        return _cached(name, build)
    except insights.DataUnavailable as exc:
        return _unavailable(str(exc))
    except Exception as exc:  # noqa: BLE001
        log.exception("Insight %s failed", name)
        warehouse.reset()
        return _unavailable(f"Could not load {name}: {exc.__class__.__name__}")


@app.get("/api/insights/overview")
def insights_overview():
    return _insight("overview", lambda: insights.overview(warehouse.engine()))


@app.get("/api/insights/types")
def insights_types():
    return _insight("types", lambda: insights.type_distribution(warehouse.engine()))


@app.get("/api/insights/dimensions")
def insights_dimensions():
    return _insight("dimensions", lambda: insights.dimension_distribution(warehouse.engine()))


@app.get("/api/insights/etl")
def insights_etl():
    return _insight("etl", insights.etl_reports)


@app.get("/api/insights/models")
def insights_models():
    return _insight("models", lambda: insights.model_insights(warehouse.engine()))


@app.get("/api/insights/{name}")
def insights_unknown(name: str):
    raise HTTPException(status_code=404, detail=f"Unknown insight {name!r}")
