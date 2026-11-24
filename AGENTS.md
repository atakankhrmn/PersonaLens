# AGENTS.md — PersonaLens

Context for AI coding agents (Claude Code, Codex, Cursor, Copilot, …) working in this repo.
Read this before changing anything. Humans: see [README.md](README.md) and the Turkish
project plan [MBTI_DW_Proje_Plani.md](MBTI_DW_Proje_Plani.md).

The team is four Turkish-speaking students; answer in the language the user writes in.

## What this project is

University **Data Warehouse & Business Intelligence** course project, planned to become a
research paper. It predicts **self-reported** MBTI types from forum text and integrates the
predictions into a data warehouse and BI dashboard.

```
HF dataset → ETL (Python/Pandas) → PostgreSQL star schema → ML (TF-IDF + LogReg / SVM) → Streamlit app + BI dashboard
```

MBTI has known scientific limitations. Never present outputs as a psychological diagnosis;
the app must show cautious wording and a "not enough text" warning.

## Current status

| Step | State |
|---|---|
| Project skeleton, requirements, data loader | ✅ done |
| EDA notebook (`notebooks/01_eda.ipynb`) | ✅ done |
| Cleaning / leakage ETL (`src/etl/`) + 70 tests | ✅ done |
| Baseline models (4 binary classifiers) | ✅ done — `src/models/` (train, evaluate, predict), `reports/models/`; **final test** Macro-F1 LogReg: EI 0.66, NS 0.60, FT 0.79, JP 0.63, 16-type 0.20 (majority 0.02), exact match 36.9% (majority 21.2%); SVM ≈ same; all splits' predictions in DW, 11 tests. Test split now used — see "Baseline results and caveats" |
| Model improvements (v2) | ⏳ planned, not started — ideas listed in "Improvement backlog" below |
| PostgreSQL star schema + DW load | ✅ done — `src/dw/` (schema.sql, load_dw.py, predictions.py), main source (label_clean) posts + quality metrics of all 3 configs, 16 tests |
| Streamlit app | ⏸ not needed for now — the web frontend below is the app |
| Python API (`src/api/`, FastAPI) | ✅ done — `python -m src.api` (port 8000): `POST /api/analyze` (trained `tfidf_logreg v1`, `clean_posts`, logs type + scores to DW, never the text), `GET /api/insights/{overview,types,dimensions,etl,models}` from the DW + `reports/`; 11 API tests + 1 DW test |
| Web frontend (`frontend/`, React + Vite + Express proxy) | ✅ connected — proxies to the Python API (default `http://127.0.0.1:8000`); Data Insights shows real DW/report data (type & dimension distributions, posts per type, ETL reports, validation/test model metrics vs majority baseline, 16×16 confusion matrix, top words per letter); result page shows each side as a % with "leans towards" wording and a note that it is a model score, not a real-world chance (caveat 6) |
| BI dashboard | ⏳ not started |

Team roles: Data Engineer (ETL + DW), ML Engineer (models + evaluation),
App Developer (Streamlit), BI & Analysis lead (EDA, dashboard, report, presentation).

### ⚠️ Mandatory: keep this table up to date

**Every agent, after finishing any piece of work, must update the status table above in
the same commit/PR as the work itself.** A task is not done until the table reflects it.

- Change the row's state (`⏳ next` → `🚧 in progress` → `✅ done`) and add the key
  file(s) or the main result (e.g. "✅ done — `src/models/baseline.py`, val Macro-F1 0.62").
- Starting a new step? Mark it `🚧 in progress` so teammates' agents don't duplicate it.
- New step that is not in the table yet? Add a row.
- If the work changes how others should use the code (new command, new function,
  changed data rule or contract), also update the matching section of this file and the README.
- Before ending your task, tell the user which row you updated.

## Setup and commands (Windows, PowerShell)

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

python -m pytest                                  # run tests (must stay green)
python -m src.etl.clean_leakage                   # build main training data (~2–4 min)
python -m src.etl.clean_leakage --config all      # all three configs (quality reports)
python -m src.dw.load_dw                          # load warehouse (~30 s)
python -m src.api                                 # Python API on http://127.0.0.1:8000
cd frontend; npm install; npm run dev             # web app on http://localhost:3000
```

Always use the project `.venv` interpreter. In VS Code the Jupyter extension is required
and the notebook kernel must be `.venv` (not the global Python, which lacks the packages).

## Data warehouse (src/dw/)

PostgreSQL 17, database `personalens`, schema `dw`. Connection string: `DATABASE_URL` in the
git-ignored `.env` (template: `.env.example`). **Never print or commit the password.**
On Turkish Windows PostgreSQL must be initialised with locale `C` (installer `--locale C`),
otherwise `initdb` fails on "Turkish_Türkiye.1254".

- `schema.sql` — idempotent DDL: `dim_mbti_type`, `dim_user`, `dim_source`, `dim_date`
  (2020–2035), `dim_model`, `dim_etl_run`; facts `fact_post` (grain: one cleaned post, keeps
  `post_text`), `fact_prediction` (user × model; `user_key` NULL for app requests),
  `fact_data_quality` (ETL run × metric); BI views `vw_*`.
- `load_dw.py` — `python -m src.dw.load_dw [--config X] [--sample N]`. Upserts dimensions,
  replaces `fact_post` with the posts of ONE source (default: main `label_clean`; the three
  cleaned configs are 98–99.7% identical, so storing all would only triple the table), and
  appends quality metrics of all three configs from
  `reports/etl/leakage_report_<config>.json`, records the run in `dim_etl_run`. One
  transaction; safe to re-run; never touches `fact_prediction`.
- `predictions.py` — the ML/app contract for writing results:
  `register_model(engine, name, version, algorithm=, params=, metrics=) -> model_key`,
  `write_predictions(engine, model_key, preds)` (`preds`: `user_id`, `predicted_type`,
  `score_e/n/t/j` = probability of E, N, T, J; true type and split come from `dim_user`;
  replaces earlier rows of the same model+users), `log_app_prediction(...)` (app; never
  stores the user's text).
- The dataset has no post timestamps: never invent dates; `dim_date` is only for load and
  prediction dates.
- Main source code: `personalitycafe/label_clean+leak_masked`.
- `tests/test_dw.py` integration tests use a throw-away `personalens_test` database and are
  skipped when PostgreSQL is not reachable.
- Schema changes: edit `schema.sql` with `IF NOT EXISTS` / `CREATE OR REPLACE`; for a column
  change on an existing table, drop the `dw` schema (`DROP SCHEMA dw CASCADE`) and reload.

## Data — the most important rules

Source: [Lazanantenaina/personalitycafe-mbti-preprocessed](https://huggingface.co/datasets/Lazanantenaina/personalitycafe-mbti-preprocessed)
(CC0). PersonalityCafe **forum** data, not Twitter/X. 8,675 users, one row per user.

Configs: `raw` (no masking), `label_clean` (exact MBTI codes masked), `psychometric_clean`
(also MBTI terms and cognitive functions masked). All share the same user-level split.

**Train models only on the cleaned data:**

```python
from src.data_loader import load_clean
df = load_clean()          # = data/processed/label_clean_masked.parquet
train = df[df["split"] == "train"]
```

- `load_clean()` defaults to `MAIN_CONFIG` = HF `label_clean` + our cleaning. This is the main
  dataset. Our rules already mask everything `psychometric_clean` adds (MBTI terms, cognitive
  functions), and HF's `psychometric_clean` wrongly masks `Sci-Fi`/`Wi-Fi`/`Hi-Fi`, so
  `label_clean` is the cleaner base. `load_clean("psychometric_clean")` / `load_clean("raw")`
  exist only for comparison experiments.
- Do **not** train on `load_mbti(...)` (raw HF data): even `psychometric_clean` still
  leaks the label for 75.9% of users (e.g. `INFPs`, `NT`, `4w5`).
- Use the given `split` column (train 5,205 / validation 1,735 / test 1,735 users,
  stratified by type, no user overlap). Do not re-split by post. Touch **test only for
  the final evaluation**; tune on validation.
- Columns: `user_id, type, label, EI, NS, FT, JP, EI_label, NS_label, FT_label, JP_label,
  posts (list), text (posts joined by " <POST_SEP> "), n_posts, split, variant`.
  Binary labels: I=0/E=1, S=0/N=1, F=0/T=1, P=0/J=1.
- `data/raw/` and `data/processed/` are git-ignored; they are created on first run.

## Cleaning (src/etl/cleaning.py)

`clean_text(text)` is the single entry point. **The app must clean user input the same
way** (`src.models.predict.predict` runs `clean_posts`, which uses `clean_text`), otherwise
train and inference text differ.

It fixes encoding artefacts (`isnx92t` → `isn't`, `x93`/`x94` → quotes, `x95` bullets,
`u200b`) and masks typology vocabulary:

| Placeholder | Covers |
|---|---|
| `<MBTI_TYPE>` | full types in any form (`INFPs`, `mrinfj`, `I.N.F.J`, `INxJ`, `E_TJ`, and with 3 wildcards `Ixxx`, `xxFx` when the word is only the code; `xxxx`/`Exxxcellent` untouched), partial codes (`NFP`, `NTJ`), temperaments (`NT`, `NF`, `SJ`, `SP`) |
| `<MBTI_TERM>` | `MBTI` (also glued), `Myers-Briggs`, `cognitive function(s)` |
| `<COGNITIVE_FUNCTION>` | `Fi`, `Ne-dom`, `NeTi` … (case-sensitive) |
| `<TYPOLOGY_TERM>` | Socionics (`LII`, `SEE-Fi`), Enneagram (`4w5`, `cp6w7`), stackings (`sx/so`) |

`clean_posts` also drops empty / placeholder-only posts and within-user duplicates; the ETL
drops copied templates (same post by ≥3 users, ≥8 words). Result: 0% of users with any
leak, all 8,675 users kept, ~0.5% of posts dropped. Reports: `reports/etl/*.json`.

Deliberately **not** masked: `introvert`/`extrovert`, `thinking`/`feeling` (real language
signal; "extrovert" users are only 25.7% E vs 23% base rate), stop words, 16personalities
names (`Architect`, `Executive` — too many false positives), standalone `Myers`.

Known false-positive guards (keep them, they have tests): `Wi-Fi`/`Sci-Fi`/`Hi-Fi`, `Sis`,
`'Tis`, shouted `SEE`/`LIE`, `so/so`, `EST`, `ENT`, `ESP`, `ISP`, `xxxx`, `1280x960`.

When changing a rule: add tests in `tests/test_cleaning.py` (both a positive and a
"leave normal text alone" case), check matches on the real data for false positives,
then re-run the ETL and confirm the report shows 0 leaks.

## Modelling guidelines

- Four binary classifiers (E/I, N/S, T/F, J/P); combine into the 16-type prediction.
- Baseline: TF-IDF + Logistic Regression; comparison: TF-IDF + linear SVM; BERT only if time allows.
- Strong class imbalance (16-class ≈ 47:1; I 77%, N 86%) → use `class_weight="balanced"`
  and report **Macro-F1 and Balanced Accuracy**, not plain accuracy. Always compare with a
  majority-class baseline.
- TF-IDF default tokenisation turns `<MBTI_TYPE>` into the token `mbti_type`; that is fine
  (it is identical for every type).
- Labels: the 0/1 targets are the `*_label` columns (`EI_label` …); `EI` itself holds the letter.

### Baseline code (src/models/)

- `python -m src.models.train [--model logreg|svm|all] [--version v1] [--no-dw] [--final-test]`
  (~a few minutes). Fits ONE TF-IDF (word 1–2-grams, `min_df=3`, `max_df=0.9`,
  200k features, sublinear tf) on train users only, then per dimension tunes `C` on
  validation Macro-F1 (`C_GRID` in `train.py`), saves `models/tfidf_<algo>.joblib`, the
  report `reports/models/tfidf_<algo>_<version>.json` (metrics, chosen C, majority
  baseline, top words per letter) and writes train+validation predictions to the DW via
  `register_model` / `write_predictions` (skipped with a message if PostgreSQL is down).
- `--final-test` also scores the test split. Use it **once**, for the final paper numbers.
- `model.py` — `PersonaModel` (vectoriser + 4 classifiers, `scores_from_matrix`,
  `predict_cleaned`, `top_features`, `save`/`load`). Scores are P(E), P(N), P(T), P(J);
  > 0.5 means that letter. LinearSVC has no probabilities: its score is a sigmoid of the
  decision value (uncalibrated, but on the same 0.5 threshold).
- `evaluate.py` — `evaluate`, `majority_baseline`, `letters_to_type`, `format_table`.
- `predict.py` — app contract:
  `predict(texts) -> {"type", "scores": {"EI","NS","FT","JP"}, "n_words", "n_posts",
  "enough_text", "model", "model_name", "model_version"}`.
  `texts` = posts of one person; runs `clean_posts` on them first (same as the training
  data: `clean_text`, then empty / placeholder-only / duplicate posts dropped); `n_words`
  counts the cleaned words; `enough_text` is False below `MIN_WORDS` (300) and the app
  must then show the "not enough text" warning. Default model: `models/tfidf_logreg.joblib`.

### Python API (src/api/)

- `python -m src.api [--port 8000] [--reload]` — FastAPI app in `app.py`, used by the web
  frontend through its Express proxy (`frontend/server.ts`, `PYTHON_API_URL`).
- `POST /api/analyze` `{"texts": [...], "input_mode": "single"|"multiple"}` →
  `{"predicted_type", "scores", "model_version", "n_words", "n_posts", "enough_text",
  "min_words", "logged_to_dw"}`. 400 `INVALID_INPUT` for empty input, > 50,000 characters,
  > 200 posts, or nothing left after masking. If PostgreSQL is reachable the prediction is
  logged with `log_app_prediction` (scores mapped `EI→score_e` … `JP→score_j`); the text is
  never stored or logged. `PERSONALENS_NO_DW=1` turns the warehouse off (used in tests).
- `GET /api/insights/*` (`insights.py`, cached 5 min): `overview`, `types` (type × split
  with posts/words of the main source), `dimensions` (`vw_dimension_distribution`) need the
  DW (503 otherwise); `etl` reads `reports/etl/*.json`; `models` reads
  `reports/models/*.json` (sklearn metrics + majority baseline + top words) and
  `dw.vw_confusion_matrix`. **Only validation and test are served, never train.**
- `GET /health` → model loaded? warehouse reachable?

### Baseline results and caveats (read before using or changing the models)

Final **test** results of v1 (Macro-F1; `--final-test` run on 2026-11-21; validation in brackets):

| Model | E/I | N/S | T/F | J/P | 16 types | exact match |
|---|---|---|---|---|---|---|
| Majority baseline (always INFP) | 0.44 | 0.46 | 0.35 | 0.38 | 0.02 | 21.2% |
| TF-IDF + LogReg | 0.655 (0.642) | 0.598 (0.615) | 0.788 (0.805) | 0.628 (0.633) | 0.201 (0.193) | 36.9% |
| TF-IDF + LinearSVC | 0.656 (0.642) | 0.598 (0.615) | 0.790 (0.802) | 0.626 (0.635) | 0.197 (0.193) | 36.7% |

Test ≈ validation, so the tuning did not overfit validation. Average 3.06 of 4 letters right
(majority baseline: 2.78).

1. **The test split is now used.** Never tune or pick a model by looking at test numbers.
   A new model (v2, BERT …) is tuned on validation only and gets ONE `--final-test` run at
   the end; all compared models must be reported on the same test split.
2. **Re-running `train` without `--final-test` overwrites `reports/models/*_v1.json` and
   drops the test metrics.** For experiments use a new `--version` (e.g. `--version v2`),
   or re-run v1 with `--final-test` (results are deterministic: same C, same numbers).
3. **Train-split predictions are in-sample** (train exact match 96% vs 35% on validation).
   The DW holds predictions for all three splits; dashboard/report performance figures
   must filter `split IN ('validation', 'test')`, never mix in `train`.
4. **Masking placeholders are among the top features** (e.g. `typology_term`,
   `mbti_type are`, `dear mbti_type`, `mbti_term` push towards E and S). Not direct
   leakage (the token is identical for every type) but an indirect "talks about types"
   signal. Planned ablation for the paper: drop the placeholder tokens and compare.
5. **N/S is the weakest axis**: best C is at the low end of the grid (0.01 LogReg,
   0.001 SVM) with tiny gains (0.609 → 0.615). The signal is weak; more C tuning won't help.
6. **Scores are not real-world probabilities.** `class_weight="balanced"` trains as if
   both letters were equally common, and the SVM score is an uncalibrated sigmoid. The
   app must not say "73% chance you are E"; use wording like "leans towards E".
7. **Domain and length:** trained on long PersonalityCafe forum histories (~1,300 words
   per user). Short or non-forum text (tweets, one paragraph) is out of domain; keep the
   `enough_text` warning. Labels are self-reported MBTI, not a diagnosis.
8. Models are fit on train only (no refit on train+validation); top words per letter are
   in the report JSONs (`top_features`), useful for the paper's interpretation section.

### Improvement backlog (not started — team will revisit)

Realistic expectation: a few points (≈ +0.02–0.05 Macro-F1); labels are self-reported and
noisy. Every idea is compared on **validation only**; the chosen version gets one
`--version v2 --final-test` run. Planned order: v2 = ideas 1–4 together (measure each one's
contribution on validation), then 6 if time allows, BERT (8) last.

**Easy (hours, current code):**
1. **Per-axis decision threshold** tuned on validation instead of 0.5 (test recall is only
   41% for E and 21% for S). Cheapest gain for minority letters.
2. **Character n-grams** (e.g. `char_wb` 2–5) next to word n-grams: captures style such as
   `:)`, `xD`, `...`, `!!!`, capitalisation.
3. **Stylistic features**: post length, links per post, `?`/`!` rate, first-person
   (`I/me/my`) vs `we/you` rate, etc. Easy to interpret in the paper.
4. **Refit on train + validation** after choosing hyper-parameters (+33% data).
5. **Tune TF-IDF too** (`max_features`, `ngram_range`, `min_df`), not only `C`.

**Medium (1–2 days):**
6. **Sentence embeddings** (e.g. `sentence-transformers/all-MiniLM-L6-v2`, no fine-tuning;
   average post embeddings per user) + LogReg, alone and combined with TF-IDF. CPU is fine
   but embedding ~400k posts takes about an hour; cache the vectors.
7. **Smarter 16-type decision**: score all 16 types from the four probabilities (optionally
   with priors) instead of picking letters independently; v1 never got ESTJ/ESFJ/ESFP right.

**Hard (only if time allows):**
8. **Fine-tune BERT/RoBERTa**: needs a GPU (Colab); 512-token limit vs ~1,300 words per
   user → chunk and average. On this data usually only a few points over TF-IDF.

**For the paper (credibility, not accuracy):**
9. **Bootstrap confidence intervals** on test metrics, to show whether model differences are real.
10. **Placeholder ablation** (caveat 4): drop `mbti_type`/`typology_term`/… tokens and compare.

## Repo layout

```
app/               Streamlit app (empty, not used; the web frontend is the app)
frontend/          React + Vite UI, Express proxy to the Python API (see frontend/README.md)
data/raw/          HF downloads (ignored)      data/processed/  ETL output (ignored)
models/            trained models (ignored)
notebooks/         01_eda.ipynb
reports/etl/       ETL data-quality reports     reports/figures/ EDA charts
reports/models/    model reports (metrics, chosen C, top words)
src/data_loader.py load_mbti(), load_clean()
src/etl/           cleaning.py (rules), clean_leakage.py (ETL step)
src/dw/            schema.sql, db.py (engine/.env), load_dw.py (DW load), predictions.py
src/models/        model.py, train.py, evaluate.py, predict.py
src/api/           FastAPI backend: app.py (analyze + insights routes), insights.py
tests/             pytest
```

## Conventions

- Python 3.13, run modules from the repo root (`python -m src.…`).
- Keep `python -m pytest` green; add tests for new cleaning or ETL logic.
- Don't commit data, models, `.venv/` or secrets (`.env`, `.streamlit/secrets.toml`).
- Don't store users' app input beyond what is needed (privacy).
- Work on feature branches (`feature/etl`, `feature/model`, `feature/app`,
  `feature/dashboard`) and merge to `main` via pull requests. **`main` is protected on
  GitHub: direct pushes (also by admins) and force pushes are rejected**, so always push a
  branch and open a PR (`gh pr create`). Start new work from an up-to-date `main` (`git pull`).
- **Update the status table (see "Mandatory: keep this table up to date") in every commit
  that finishes or starts a step.**
