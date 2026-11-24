"""Tests for the FastAPI backend (src/api).

The model is a tiny one trained on synthetic data (see tests/test_models.py) and the
warehouse is switched off, so these run without the real model file or PostgreSQL.
Warehouse-backed insights are tested in tests/test_dw.py on the throw-away database.
"""

from __future__ import annotations

import pytest

pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from src.api import app as api  # noqa: E402
from src.api import insights  # noqa: E402
from src.models.predict import predict  # noqa: E402
from tests.test_models import trained  # noqa: E402,F401  (fixture)


@pytest.fixture()
def client(trained, monkeypatch):  # noqa: F811
    model = trained[0]
    monkeypatch.setenv("PERSONALENS_NO_DW", "1")
    monkeypatch.setattr(api, "predict", lambda texts: predict(texts, model=model))
    monkeypatch.setattr(api, "load_model", lambda *_: model)
    api._cache.clear()
    yield TestClient(api.app)
    api._cache.clear()


def test_health(client):
    body = client.get("/health").json()
    assert body["ok"] and body["model_loaded"]
    assert body["min_words"] == 300
    assert body["warehouse"] is False


def test_analyze_contract(client):
    r = client.post("/api/analyze", json={
        "texts": ["I love a party and new ideas", "logic and plans all day"],
        "input_mode": "multiple",
    })
    assert r.status_code == 200
    body = r.json()
    assert len(body["predicted_type"]) == 4
    assert set(body["scores"]) == {"EI", "NS", "FT", "JP"}
    assert all(0 <= v <= 1 for v in body["scores"].values())
    # predicted letters follow the 0.5 threshold of the scores
    letters = "".join(
        pos if body["scores"][dim] > 0.5 else neg
        for dim, pos, neg in [("EI", "E", "I"), ("NS", "N", "S"), ("FT", "T", "F"), ("JP", "J", "P")]
    )
    assert letters == body["predicted_type"]
    assert body["n_posts"] == 2 and body["n_words"] == 12
    assert body["enough_text"] is False  # far below 300 words
    assert body["logged_to_dw"] is False


def test_analyze_logs_scores_with_dw_column_names(client, monkeypatch):
    calls = []
    monkeypatch.setattr(api.warehouse, "model_key", lambda name, version: 7)
    monkeypatch.setattr(api.warehouse, "engine", lambda: "engine")
    monkeypatch.setattr(api, "log_app_prediction",
                        lambda engine, key, ptype, scores, n_posts, n_words:
                        calls.append((key, ptype, scores, n_posts, n_words)))
    body = client.post("/api/analyze", json={"texts": ["logic and plans all day"]}).json()
    assert body["logged_to_dw"] is True
    key, ptype, scores, n_posts, n_words = calls[0]
    assert key == 7 and ptype == body["predicted_type"]
    # log_app_prediction reads score_e / score_n / score_t / score_j, not EI / NS / ...
    assert scores == {"score_e": body["scores"]["EI"], "score_n": body["scores"]["NS"],
                      "score_t": body["scores"]["FT"], "score_j": body["scores"]["JP"]}
    assert (n_posts, n_words) == (1, 5)
    # the text itself is never passed on
    assert "logic" not in repr(calls)


def test_analyze_masks_type_and_drops_duplicates(client):
    body = client.post("/api/analyze", json={
        "texts": ["As an INFJ I love ideas", "As an INFJ I love ideas", "  "],
    }).json()
    assert body["n_posts"] == 1          # duplicate and empty post dropped (clean_posts)
    assert body["n_words"] == 6          # "As an <MBTI_TYPE> I love ideas"


@pytest.mark.parametrize("payload", [
    {"texts": []},
    {"texts": ["   ", ""]},
    {"texts": ["INFJ INTP Fi Ne"]},       # nothing left after masking
    {"texts": ["x" * 50_001]},
])
def test_analyze_rejects_bad_input(client, payload):
    r = client.post("/api/analyze", json=payload)
    assert r.status_code == 400
    assert r.json()["code"] == "INVALID_INPUT"


def test_insights_without_warehouse(client):
    for name in ("overview", "types", "dimensions"):
        r = client.get(f"/api/insights/{name}")
        assert r.status_code == 503 and r.json()["available"] is False
    assert client.get("/api/insights/nope").status_code == 404


def test_etl_insights_from_reports(client):
    body = client.get("/api/insights/etl").json()
    assert set(body) == {"raw", "label_clean", "psychometric_clean"}
    assert body["label_clean"]["isMainDataset"] is True
    assert body["raw"]["isMainDataset"] is False
    for report in body.values():
        assert report["after"]["leak_mentions_total"] == 0


def test_model_insights_never_return_train(client):
    body = client.get("/api/insights/models").json()
    assert body["models"], "reports/models/*.json should be in the repo"
    assert {m["split"] for m in body["models"]} <= {"validation", "test"}
    assert {b["split"] for b in body["baselines"]} <= {"validation", "test"}
    assert body["confusionMatrix"] == []  # no warehouse
    for m in body["models"]:
        assert set(m["dimensions"]) == {"EI", "NS", "FT", "JP"}
        assert 0 <= m["macro_f1"] <= 1 and 0 <= m["type_accuracy"] <= 1


def test_model_insights_missing_reports(tmp_path):
    with pytest.raises(insights.DataUnavailable):
        insights.model_insights(None, report_dir=tmp_path)


def test_model_insights_skip_other_reports(tmp_path):
    (tmp_path / "external_reddit.json").write_text('{"dataset": "x", "metrics": {}}', encoding="utf-8")
    with pytest.raises(insights.DataUnavailable):
        insights.model_insights(None, report_dir=tmp_path)
