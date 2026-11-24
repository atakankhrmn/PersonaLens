"""Tests for the data warehouse step.

Unit tests run everywhere. Integration tests need a running PostgreSQL
(DATABASE_URL in .env); they use a separate ``personalens_test`` database
that is created and dropped by the tests, so real data is never touched.
"""

import pandas as pd
import pytest

from src.dw.load_dw import (
    LABEL_ORDER,
    build_dim_mbti_type,
    build_dim_user,
    build_fact_post,
    build_quality_rows,
    check_label_mapping,
    temperament,
)


# --------------------------------------------------------------------------- #
# Fixtures
# --------------------------------------------------------------------------- #
def _users() -> pd.DataFrame:
    return pd.DataFrame({
        "user_id": ["pc_00001", "pc_00002"],
        "type": ["INTP", "ESFJ"],
        "label": [1, 11],
        "split": ["train", "test"],
        "posts": [
            ["Hello <URL> world...", "I love <MBTI_TYPE> and <COGNITIVE_FUNCTION>"],
            ["Just one post with\x00 a NUL"],
        ],
    })


def _report() -> dict:
    side = {
        "users": 2, "posts": 3, "leak_mentions_total": 5, "users_with_any_leak_pct": 50.0,
        "users_with_own_type_pct": 50.0, "encoding_artefacts": 1,
        "by_rule": {"type_full": {"mentions": 5, "users_pct": 50.0}},
    }
    after = {**side, "leak_mentions_total": 0, "users_with_any_leak_pct": 0.0,
             "users_with_own_type_pct": 0.0, "encoding_artefacts": 0,
             "by_rule": {"type_full": {"mentions": 0, "users_pct": 0.0}}}
    return {"before": side, "after": after, "posts_removed_by_post_cleaning": 1,
            "posts_removed_as_templates": 0, "users_left_without_posts": 0}


# --------------------------------------------------------------------------- #
# Unit tests
# --------------------------------------------------------------------------- #
@pytest.mark.parametrize("code, expected", [
    ("INTJ", "NT"), ("ENFP", "NF"), ("ISTJ", "SJ"), ("ESFJ", "SJ"), ("ISTP", "SP"), ("ESFP", "SP"),
])
def test_temperament(code, expected):
    assert temperament(code) == expected


def test_dim_mbti_type_has_16_consistent_rows():
    d = build_dim_mbti_type()
    assert len(d) == 16
    assert d["type_code"].is_unique and d["type_key"].is_unique
    assert (d["type_key"] == d["label_id"] + 1).all()
    assert (d["ei"] + d["ns"] + d["ft"] + d["jp"] == d["type_code"]).all()
    assert set(d["temperament"]) == {"NT", "NF", "SJ", "SP"}
    assert d.loc[d["type_code"] == "INTP", "label_id"].item() == 1


def test_check_label_mapping():
    check_label_mapping(_users())  # matches the dataset card
    bad = _users().assign(label=[0, 11])
    with pytest.raises(ValueError):
        check_label_mapping(bad)


def test_dim_user():
    u = build_dim_user(_users())
    assert list(u.columns) == ["user_id", "split", "self_reported_type"]
    assert u["self_reported_type"].tolist() == ["INTP", "ESFJ"]


def test_fact_post_measures():
    f = build_fact_post(_users())
    assert len(f) == 3
    assert f["post_seq"].tolist() == [0, 1, 0]
    first = f.iloc[0]
    assert first["url_count"] == 1 and first["is_truncated"]
    assert first["word_count"] == 3
    second = f.iloc[1]
    assert second["mbti_type_masks"] == 1 and second["typology_masks"] == 1
    assert not second["is_truncated"]
    assert "\x00" not in f.iloc[2]["post_text"]


def test_quality_rows():
    q = build_quality_rows(_report())
    assert {"summary", "leak_rule"} == set(q["metric_group"])
    row = q[q["metric_name"] == "leak_mentions_total"].iloc[0]
    assert (row["value_before"], row["value_after"]) == (5, 0)
    assert "type_full_mentions" in set(q["metric_name"])
    assert q["metric_name"].is_unique


def test_label_order_matches_cleaning_types():
    from src.etl.cleaning import MBTI_TYPES
    assert set(LABEL_ORDER) == set(MBTI_TYPES)


# --------------------------------------------------------------------------- #
# Integration tests (need PostgreSQL)
# --------------------------------------------------------------------------- #
@pytest.fixture(scope="module")
def test_engine():
    sqlalchemy = pytest.importorskip("sqlalchemy")
    from sqlalchemy.engine import make_url

    from src.dw import db

    try:
        url = make_url(db.database_url()).set(database="personalens_test")
        engine = db.get_engine(url.render_as_string(hide_password=False))
        with engine.connect():
            pass
    except Exception as exc:  # no .env, server not running, ...
        pytest.skip(f"PostgreSQL not available: {exc}")

    yield engine

    engine.dispose()
    admin = sqlalchemy.create_engine(url.set(database="postgres"), isolation_level="AUTOCOMMIT")
    with admin.connect() as conn:
        conn.execute(sqlalchemy.text('DROP DATABASE IF EXISTS "personalens_test" WITH (FORCE)'))
    admin.dispose()


@pytest.fixture(scope="module")
def loaded(test_engine, monkeypatch_module):
    from src.dw import load_dw

    users = _users()
    monkeypatch_module.setattr(load_dw, "load_clean", lambda config: users)
    first = load_dw.load(test_engine, "label_clean")
    second = load_dw.load(test_engine, "label_clean")  # re-run must be idempotent
    return test_engine, first, second


@pytest.fixture(scope="module")
def monkeypatch_module():
    mp = pytest.MonkeyPatch()
    yield mp
    mp.undo()


def _scalar(engine, sql):
    from sqlalchemy import text
    with engine.connect() as conn:
        return conn.execute(text(sql)).scalar()


def test_load_is_idempotent(loaded):
    engine, first, second = loaded
    assert first["posts"] == second["posts"] == 3
    assert _scalar(engine, "SELECT COUNT(*) FROM dw.fact_post") == 3
    assert _scalar(engine, "SELECT COUNT(*) FROM dw.dim_user") == 2
    assert _scalar(engine, "SELECT COUNT(*) FROM dw.dim_mbti_type") == 16
    assert _scalar(engine, "SELECT COUNT(*) FROM dw.dim_etl_run WHERE status = 'success'") == 2


def test_views_work(loaded):
    engine, *_ = loaded
    assert _scalar(engine, "SELECT SUM(users) FROM dw.vw_type_distribution") == 2
    assert _scalar(engine, "SELECT COUNT(*) FROM dw.vw_dimension_distribution") == 8
    assert _scalar(engine, "SELECT SUM(posts) FROM dw.vw_posts_by_type") == 3
    assert _scalar(engine, "SELECT n_posts FROM dw.vw_user_profile WHERE user_id = 'pc_00001'") == 2
    # latest run only, not both runs
    assert _scalar(engine, """SELECT COUNT(*) FROM dw.vw_data_quality_latest
                              WHERE metric_name = 'leak_mentions_total'""") == 1


def test_predictions_roundtrip(loaded):
    from src.dw.predictions import log_app_prediction, register_model, write_predictions

    engine, *_ = loaded
    key = register_model(engine, "test_model", "v1", algorithm="dummy", metrics={"f1": 0.5})
    assert register_model(engine, "test_model", "v1") == key  # upsert, same key

    preds = pd.DataFrame({"user_id": ["pc_00001", "pc_00002"], "predicted_type": ["INTP", "INFP"],
                          "score_e": [0.1, 0.2], "score_n": [0.9, 0.8],
                          "score_t": [0.7, 0.3], "score_j": [0.4, 0.6]})
    assert write_predictions(engine, key, preds) == 2
    assert write_predictions(engine, key, preds) == 2  # replace, no duplicates
    assert _scalar(engine, f"SELECT COUNT(*) FROM dw.fact_prediction WHERE model_key = {key}") == 2

    assert _scalar(engine, "SELECT SUM(users) FROM dw.vw_model_performance") == 2
    assert float(_scalar(engine, "SELECT AVG(type_accuracy) FROM dw.vw_model_performance")) == 0.5

    log_app_prediction(engine, key, "ENFP", {"score_e": 0.8}, n_posts=3, n_words=120)
    assert _scalar(engine, """SELECT COUNT(*) FROM dw.fact_prediction
                              WHERE user_key IS NULL AND model_key = """ + str(key)) == 1

    with pytest.raises(ValueError):
        write_predictions(engine, key, pd.DataFrame({"user_id": ["nobody"], "predicted_type": ["INTP"]}))


def test_quality_only_load_keeps_posts(loaded):
    from src.dw import load_dw

    engine, *_ = loaded
    result = load_dw.load(engine, "raw", posts=False)  # uses reports/etl/leakage_report_raw.json
    assert result["posts"] == 0
    assert _scalar(engine, "SELECT COUNT(*) FROM dw.fact_post") == 3  # main posts untouched
    assert _scalar(engine, "SELECT COUNT(DISTINCT source_key) FROM dw.fact_post") == 1
    assert _scalar(engine, """SELECT COUNT(DISTINCT source_code) FROM dw.vw_data_quality_latest""") == 2


def test_api_insights_on_warehouse(loaded):
    from src.api import insights

    engine, *_ = loaded
    ov = insights.overview(engine)
    assert ov["totalUsers"] == 2 and ov["cleanedPosts"] == 3 and ov["personalityTypes"] == 2
    assert ov["splitUsers"] == {"train": 1, "test": 1}

    types = {(r["type_code"], r["split"]): r for r in insights.type_distribution(engine)}
    assert set(types) == {("INTP", "train"), ("ESFJ", "test")}
    intp = types[("INTP", "train")]
    assert intp["temperament"] == "analysts" and intp["users"] == 1 and intp["posts"] == 2
    assert intp["pct_of_split"] == 100.0
    assert types[("ESFJ", "test")]["temperament"] == "sentinels"

    dims = insights.dimension_distribution(engine)
    assert len(dims) == 8 and sum(d["users"] for d in dims) == 8
    assert [d["dimension"] for d in dims][:2] == ["E/I", "E/I"]
