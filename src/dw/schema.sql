-- =============================================================================
-- PersonaLens data warehouse — star schema (PostgreSQL 17)
--
-- Facts
--   fact_post          one row per cleaned forum post            (grain: post)
--   fact_prediction    one row per model prediction for a user   (grain: user × model × run)
--   fact_data_quality  one row per ETL run × quality metric      (grain: run × metric)
-- Dimensions
--   dim_user, dim_mbti_type, dim_source, dim_date, dim_model, dim_etl_run
--
-- The dataset has no post timestamps, so dim_date is only used for real dates
-- (ETL load date, prediction date). No dates are invented.
--
-- Idempotent: safe to run again; it only creates what does not exist yet.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS dw;
SET search_path TO dw;

-- ----------------------------------------------------------------------------
-- Dimensions
-- ----------------------------------------------------------------------------

-- The 16 MBTI types with their four dimensions and Keirsey temperament.
CREATE TABLE IF NOT EXISTS dim_mbti_type (
    type_key        SMALLINT    PRIMARY KEY,          -- = dataset label + 1
    type_code       CHAR(4)     NOT NULL UNIQUE,      -- e.g. 'INTP'
    label_id        SMALLINT    NOT NULL UNIQUE,      -- dataset 16-class label (0..15)
    ei              CHAR(1)     NOT NULL CHECK (ei IN ('E', 'I')),
    ns              CHAR(1)     NOT NULL CHECK (ns IN ('N', 'S')),
    ft              CHAR(1)     NOT NULL CHECK (ft IN ('F', 'T')),
    jp              CHAR(1)     NOT NULL CHECK (jp IN ('J', 'P')),
    temperament     CHAR(2)     NOT NULL CHECK (temperament IN ('NT', 'NF', 'SJ', 'SP')),
    temperament_name VARCHAR(20) NOT NULL              -- Rational / Idealist / Guardian / Artisan
);

-- Anonymous dataset users. Their self-reported type is also kept on the facts.
CREATE TABLE IF NOT EXISTS dim_user (
    user_key        INTEGER     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         VARCHAR(32) NOT NULL UNIQUE,      -- e.g. 'pc_00015'
    split           VARCHAR(10) NOT NULL CHECK (split IN ('train', 'validation', 'test')),
    self_reported_type CHAR(4)  NOT NULL REFERENCES dim_mbti_type (type_code)
);

-- Where the text comes from and how it was cleaned.
CREATE TABLE IF NOT EXISTS dim_source (
    source_key      SMALLINT    GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_code     VARCHAR(64) NOT NULL UNIQUE,      -- e.g. 'personalitycafe/label_clean+leak_masked'
    platform        VARCHAR(40) NOT NULL,             -- 'PersonalityCafe forum', 'PersonaLens app'
    dataset_name    VARCHAR(120),
    dataset_config  VARCHAR(40),                      -- raw / label_clean / psychometric_clean
    cleaning        VARCHAR(60),                      -- our cleaning variant
    license         VARCHAR(40),
    url             TEXT
);

-- Calendar. Filled for 2020-2035 on creation.
CREATE TABLE IF NOT EXISTS dim_date (
    date_key        INTEGER     PRIMARY KEY,          -- yyyymmdd
    full_date       DATE        NOT NULL UNIQUE,
    year            SMALLINT    NOT NULL,
    quarter         SMALLINT    NOT NULL,
    month           SMALLINT    NOT NULL,
    month_name      VARCHAR(10) NOT NULL,
    day             SMALLINT    NOT NULL,
    iso_weekday     SMALLINT    NOT NULL,             -- 1 = Monday
    day_name        VARCHAR(10) NOT NULL,
    is_weekend      BOOLEAN     NOT NULL
);

INSERT INTO dim_date
SELECT  to_char(d, 'YYYYMMDD')::INT,
        d::DATE,
        EXTRACT(YEAR FROM d),
        EXTRACT(QUARTER FROM d),
        EXTRACT(MONTH FROM d),
        trim(to_char(d, 'Month')),
        EXTRACT(DAY FROM d),
        EXTRACT(ISODOW FROM d),
        trim(to_char(d, 'Day')),
        EXTRACT(ISODOW FROM d) IN (6, 7)
FROM generate_series('2020-01-01'::DATE, '2035-12-31'::DATE, INTERVAL '1 day') AS d
ON CONFLICT (date_key) DO NOTHING;

-- Trained models (filled by the ML step, see src/dw/predictions.py).
CREATE TABLE IF NOT EXISTS dim_model (
    model_key       INTEGER     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    model_name      VARCHAR(80) NOT NULL,             -- e.g. 'tfidf_logreg'
    model_version   VARCHAR(40) NOT NULL,             -- e.g. 'v1'
    algorithm       VARCHAR(80),                      -- e.g. 'TF-IDF + LogisticRegression'
    training_source VARCHAR(64),                      -- dim_source.source_code used for training
    params          JSONB,
    metrics         JSONB,                            -- e.g. validation Macro-F1 per dimension
    trained_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (model_name, model_version)
);

-- Lineage: one row per ETL / DW load run.
CREATE TABLE IF NOT EXISTS dim_etl_run (
    etl_run_key     INTEGER     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    started_at      TIMESTAMPTZ NOT NULL,
    finished_at     TIMESTAMPTZ,
    date_key        INTEGER     NOT NULL REFERENCES dim_date (date_key),
    source_key      SMALLINT    NOT NULL REFERENCES dim_source (source_key),
    git_commit      VARCHAR(40),
    status          VARCHAR(20) NOT NULL DEFAULT 'running'
);

-- ----------------------------------------------------------------------------
-- Facts
-- ----------------------------------------------------------------------------

-- One row per cleaned post. The cleaned text is kept as a degenerate attribute
-- so models can be trained straight from the warehouse.
CREATE TABLE IF NOT EXISTS fact_post (
    post_key            BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_key            INTEGER     NOT NULL REFERENCES dim_user (user_key),
    type_key            SMALLINT    NOT NULL REFERENCES dim_mbti_type (type_key),
    source_key          SMALLINT    NOT NULL REFERENCES dim_source (source_key),
    etl_run_key         INTEGER     NOT NULL REFERENCES dim_etl_run (etl_run_key),
    load_date_key       INTEGER     NOT NULL REFERENCES dim_date (date_key),
    post_seq            SMALLINT    NOT NULL,          -- position of the post for that user (0-based)
    -- measures
    char_count          INTEGER     NOT NULL,
    word_count          INTEGER     NOT NULL,
    url_count           SMALLINT    NOT NULL,
    mbti_type_masks     SMALLINT    NOT NULL,          -- <MBTI_TYPE> placeholders
    typology_masks      SMALLINT    NOT NULL,          -- <MBTI_TERM>, <COGNITIVE_FUNCTION>, <TYPOLOGY_TERM>
    is_truncated        BOOLEAN     NOT NULL,          -- original Kaggle text cut with '...'
    post_text           TEXT        NOT NULL,
    UNIQUE (source_key, user_key, post_seq)
);
CREATE INDEX IF NOT EXISTS ix_fact_post_user   ON fact_post (user_key);
CREATE INDEX IF NOT EXISTS ix_fact_post_type   ON fact_post (type_key);
CREATE INDEX IF NOT EXISTS ix_fact_post_source ON fact_post (source_key);

-- One row per prediction. user_key / true_type_key are NULL for predictions
-- made on text typed into the app (that text itself is never stored).
CREATE TABLE IF NOT EXISTS fact_prediction (
    prediction_key      BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    model_key           INTEGER     NOT NULL REFERENCES dim_model (model_key),
    source_key          SMALLINT    NOT NULL REFERENCES dim_source (source_key),
    date_key            INTEGER     NOT NULL REFERENCES dim_date (date_key),
    user_key            INTEGER     REFERENCES dim_user (user_key),
    split               VARCHAR(10) CHECK (split IN ('train', 'validation', 'test')),
    true_type_key       SMALLINT    REFERENCES dim_mbti_type (type_key),
    predicted_type_key  SMALLINT    NOT NULL REFERENCES dim_mbti_type (type_key),
    -- measures: model scores for the second letter of each pair (E, N, T, J)
    score_e             REAL        CHECK (score_e BETWEEN 0 AND 1),
    score_n             REAL        CHECK (score_n BETWEEN 0 AND 1),
    score_t             REAL        CHECK (score_t BETWEEN 0 AND 1),
    score_j             REAL        CHECK (score_j BETWEEN 0 AND 1),
    n_posts_used        SMALLINT,
    n_words_used        INTEGER,
    predicted_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_fact_prediction_model ON fact_prediction (model_key, split);
CREATE INDEX IF NOT EXISTS ix_fact_prediction_user  ON fact_prediction (user_key);

-- One row per ETL run × data-quality metric (from reports/etl/*.json).
CREATE TABLE IF NOT EXISTS fact_data_quality (
    etl_run_key     INTEGER     NOT NULL REFERENCES dim_etl_run (etl_run_key),
    source_key      SMALLINT    NOT NULL REFERENCES dim_source (source_key),
    date_key        INTEGER     NOT NULL REFERENCES dim_date (date_key),
    metric_group    VARCHAR(20) NOT NULL,              -- 'summary' or 'leak_rule'
    metric_name     VARCHAR(60) NOT NULL,
    value_before    NUMERIC,
    value_after     NUMERIC,
    PRIMARY KEY (etl_run_key, metric_group, metric_name)
);

-- ----------------------------------------------------------------------------
-- Views for the BI dashboard
-- ----------------------------------------------------------------------------

-- Users per MBTI type and split (main cleaned source only).
CREATE OR REPLACE VIEW vw_type_distribution AS
SELECT  t.type_code, t.ei, t.ns, t.ft, t.jp, t.temperament, u.split,
        COUNT(*)                                                    AS users,
        ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY u.split), 2) AS pct_of_split
FROM    dim_user u
JOIN    dim_mbti_type t ON t.type_code = u.self_reported_type
GROUP BY t.type_code, t.ei, t.ns, t.ft, t.jp, t.temperament, u.split;

-- Users per letter of each MBTI dimension.
CREATE OR REPLACE VIEW vw_dimension_distribution AS
WITH letters AS (
    SELECT 'E/I' AS dimension, t.ei AS letter FROM dim_user u JOIN dim_mbti_type t ON t.type_code = u.self_reported_type
    UNION ALL SELECT 'N/S', t.ns FROM dim_user u JOIN dim_mbti_type t ON t.type_code = u.self_reported_type
    UNION ALL SELECT 'F/T', t.ft FROM dim_user u JOIN dim_mbti_type t ON t.type_code = u.self_reported_type
    UNION ALL SELECT 'J/P', t.jp FROM dim_user u JOIN dim_mbti_type t ON t.type_code = u.self_reported_type
)
SELECT  dimension, letter, COUNT(*) AS users,
        ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY dimension), 2) AS pct
FROM letters
GROUP BY dimension, letter;

-- Per-user text profile (posts, words, masks) for each source.
CREATE OR REPLACE VIEW vw_user_profile AS
SELECT  f.source_key, u.user_key, u.user_id, u.split, t.type_code,
        COUNT(*)                         AS n_posts,
        SUM(f.word_count)                AS n_words,
        ROUND(AVG(f.word_count), 1)      AS avg_words_per_post,
        SUM(f.url_count)                 AS n_urls,
        SUM(f.mbti_type_masks)           AS n_mbti_type_masks,
        SUM(f.typology_masks)            AS n_typology_masks,
        ROUND(AVG(f.is_truncated::INT) * 100, 1) AS pct_truncated
FROM    fact_post f
JOIN    dim_user u      ON u.user_key = f.user_key
JOIN    dim_mbti_type t ON t.type_key = f.type_key
GROUP BY f.source_key, u.user_key, u.user_id, u.split, t.type_code;

-- Posts and words per MBTI type for each source.
CREATE OR REPLACE VIEW vw_posts_by_type AS
SELECT  s.source_code, t.type_code, t.temperament,
        COUNT(DISTINCT f.user_key)                       AS users,
        COUNT(*)                                         AS posts,
        ROUND(COUNT(*)::NUMERIC / COUNT(DISTINCT f.user_key), 1) AS posts_per_user,
        ROUND(AVG(f.word_count), 1)                      AS avg_words_per_post,
        ROUND(SUM(f.word_count)::NUMERIC / COUNT(DISTINCT f.user_key), 0) AS words_per_user
FROM    fact_post f
JOIN    dim_mbti_type t ON t.type_key = f.type_key
JOIN    dim_source s    ON s.source_key = f.source_key
GROUP BY s.source_code, t.type_code, t.temperament;

-- Data-quality metrics of the latest successful run per source.
CREATE OR REPLACE VIEW vw_data_quality_latest AS
SELECT  s.source_code, r.etl_run_key, r.started_at, q.metric_group, q.metric_name,
        q.value_before, q.value_after
FROM    fact_data_quality q
JOIN    dim_etl_run r ON r.etl_run_key = q.etl_run_key
JOIN    dim_source s  ON s.source_key = q.source_key
WHERE   r.etl_run_key = (SELECT MAX(r2.etl_run_key) FROM dim_etl_run r2
                         WHERE r2.source_key = r.source_key AND r2.status = 'success');

-- Model accuracy per model, split and dimension (dataset predictions only).
CREATE OR REPLACE VIEW vw_model_performance AS
SELECT  m.model_name, m.model_version, p.split,
        COUNT(*)                                                        AS users,
        ROUND(AVG((p.predicted_type_key = p.true_type_key)::INT), 4)    AS type_accuracy,
        ROUND(AVG((pt.ei = tt.ei)::INT), 4)                             AS ei_accuracy,
        ROUND(AVG((pt.ns = tt.ns)::INT), 4)                             AS ns_accuracy,
        ROUND(AVG((pt.ft = tt.ft)::INT), 4)                             AS ft_accuracy,
        ROUND(AVG((pt.jp = tt.jp)::INT), 4)                             AS jp_accuracy
FROM    fact_prediction p
JOIN    dim_model m      ON m.model_key = p.model_key
JOIN    dim_mbti_type pt ON pt.type_key = p.predicted_type_key
JOIN    dim_mbti_type tt ON tt.type_key = p.true_type_key
WHERE   p.true_type_key IS NOT NULL
GROUP BY m.model_name, m.model_version, p.split;

-- Per-dimension metrics per model and split (dataset predictions only). The predicted
-- letter comes from the predicted type, i.e. score > 0.5. Macro-F1 and Balanced Accuracy
-- are the project's main metrics (classes are imbalanced: I 77%, N 86%).
-- Dashboards must filter split IN ('validation', 'test'): train predictions are in-sample.
CREATE OR REPLACE VIEW vw_model_dimension_metrics AS
WITH pairs AS (
    SELECT  m.model_name, m.model_version, p.split,
            d.dimension, d.sort_order, d.pos_letter, d.neg_letter,
            CASE d.dimension WHEN 'E/I' THEN tt.ei WHEN 'N/S' THEN tt.ns
                             WHEN 'T/F' THEN tt.ft ELSE tt.jp END = d.pos_letter AS true_pos,
            CASE d.dimension WHEN 'E/I' THEN pt.ei WHEN 'N/S' THEN pt.ns
                             WHEN 'T/F' THEN pt.ft ELSE pt.jp END = d.pos_letter AS pred_pos
    FROM    fact_prediction p
    JOIN    dim_model m      ON m.model_key = p.model_key
    JOIN    dim_mbti_type tt ON tt.type_key = p.true_type_key
    JOIN    dim_mbti_type pt ON pt.type_key = p.predicted_type_key
    CROSS JOIN (VALUES ('E/I', 1, 'E', 'I'), ('N/S', 2, 'N', 'S'),
                       ('T/F', 3, 'T', 'F'), ('J/P', 4, 'J', 'P'))
               AS d (dimension, sort_order, pos_letter, neg_letter)
    WHERE   p.true_type_key IS NOT NULL
), counts AS (
    SELECT  model_name, model_version, split, dimension, sort_order, pos_letter, neg_letter,
            COUNT(*)                                          AS users,
            SUM((true_pos AND pred_pos)::INT)::NUMERIC         AS tp,
            SUM((NOT true_pos AND pred_pos)::INT)::NUMERIC     AS fp,
            SUM((true_pos AND NOT pred_pos)::INT)::NUMERIC     AS fn,
            SUM((NOT true_pos AND NOT pred_pos)::INT)::NUMERIC AS tn
    FROM    pairs
    GROUP BY model_name, model_version, split, dimension, sort_order, pos_letter, neg_letter
), rates AS (
    SELECT  c.*,
            tp / NULLIF(tp + fn, 0)          AS recall_pos,
            tn / NULLIF(tn + fp, 0)          AS recall_neg,
            tp / NULLIF(tp + fp, 0)          AS precision_pos,
            tn / NULLIF(tn + fn, 0)          AS precision_neg,
            2 * tp / NULLIF(2 * tp + fp + fn, 0) AS f1_pos,
            2 * tn / NULLIF(2 * tn + fn + fp, 0) AS f1_neg
    FROM    counts c
)
SELECT  model_name, model_version, split, dimension, sort_order, pos_letter, neg_letter, users,
        tp::INT AS tp, fp::INT AS fp, fn::INT AS fn, tn::INT AS tn,
        ROUND((tp + fn) / users, 4)                          AS true_pos_share,
        ROUND((tp + tn) / users, 4)                          AS accuracy,
        -- like scikit-learn: average only over letters that occur (true or predicted for F1,
        -- true for recall), so a split with only one letter is not penalised
        ROUND((COALESCE(f1_pos, 0) * (tp + fn + fp > 0)::INT + COALESCE(f1_neg, 0) * (tn + fn + fp > 0)::INT)
              / NULLIF((tp + fn + fp > 0)::INT + (tn + fn + fp > 0)::INT, 0), 4)  AS macro_f1,
        ROUND((COALESCE(recall_pos, 0) * (tp + fn > 0)::INT + COALESCE(recall_neg, 0) * (tn + fp > 0)::INT)
              / NULLIF((tp + fn > 0)::INT + (tn + fp > 0)::INT, 0), 4)            AS balanced_accuracy,
        ROUND(recall_pos, 4) AS recall_pos, ROUND(recall_neg, 4) AS recall_neg,
        ROUND(precision_pos, 4) AS precision_pos, ROUND(precision_neg, 4) AS precision_neg,
        ROUND(f1_pos, 4) AS f1_pos, ROUND(f1_neg, 4) AS f1_neg
FROM    rates;

-- Per-type metrics (16 classes) per model and split. 16-type Macro-F1 = AVG(f1) over the
-- rows with in_scope = TRUE (type occurs as true or predicted label, as in scikit-learn).
-- Types the model never predicts get precision 0 / f1 0.
CREATE OR REPLACE VIEW vw_model_type_metrics AS
WITH preds AS (
    SELECT  m.model_name, m.model_version, p.split, p.true_type_key, p.predicted_type_key
    FROM    fact_prediction p
    JOIN    dim_model m ON m.model_key = p.model_key
    WHERE   p.true_type_key IS NOT NULL
), groups AS (
    SELECT DISTINCT model_name, model_version, split FROM preds
), per_type AS (
    SELECT  g.model_name, g.model_version, g.split, t.type_key, t.type_code, t.temperament,
            (SELECT COUNT(*) FROM preds x WHERE x.model_name = g.model_name
               AND x.model_version = g.model_version AND x.split = g.split
               AND x.true_type_key = t.type_key)::NUMERIC                         AS support,
            (SELECT COUNT(*) FROM preds x WHERE x.model_name = g.model_name
               AND x.model_version = g.model_version AND x.split = g.split
               AND x.predicted_type_key = t.type_key)::NUMERIC                    AS predicted,
            (SELECT COUNT(*) FROM preds x WHERE x.model_name = g.model_name
               AND x.model_version = g.model_version AND x.split = g.split
               AND x.true_type_key = t.type_key
               AND x.predicted_type_key = t.type_key)::NUMERIC                    AS correct
    FROM    groups g
    CROSS JOIN dim_mbti_type t
)
SELECT  model_name, model_version, split, type_code, temperament,
        support::INT AS support, predicted::INT AS predicted, correct::INT AS correct,
        ROUND(COALESCE(correct / NULLIF(predicted, 0), 0), 4)            AS precision,
        ROUND(COALESCE(correct / NULLIF(support, 0), 0), 4)              AS recall,
        ROUND(COALESCE(2 * correct / NULLIF(support + predicted, 0), 0), 4) AS f1,
        (support + predicted > 0) AS in_scope
FROM    per_type;

-- Confusion matrix (true × predicted type) per model and split.
CREATE OR REPLACE VIEW vw_confusion_matrix AS
SELECT  m.model_name, m.model_version, p.split,
        tt.type_code AS true_type, pt.type_code AS predicted_type, COUNT(*) AS users
FROM    fact_prediction p
JOIN    dim_model m      ON m.model_key = p.model_key
JOIN    dim_mbti_type pt ON pt.type_key = p.predicted_type_key
JOIN    dim_mbti_type tt ON tt.type_key = p.true_type_key
GROUP BY m.model_name, m.model_version, p.split, tt.type_code, pt.type_code;
