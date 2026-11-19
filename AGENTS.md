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
| Baseline models (4 binary classifiers) | ⏳ next |
| PostgreSQL star schema + DW load | ⏳ next |
| Streamlit app | ⏳ not started |
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
python -m src.etl.clean_leakage --config all      # all three configs
```

Always use the project `.venv` interpreter. In VS Code the Jupyter extension is required
and the notebook kernel must be `.venv` (not the global Python, which lacks the packages).

## Data — the most important rules

Source: [Lazanantenaina/personalitycafe-mbti-preprocessed](https://huggingface.co/datasets/Lazanantenaina/personalitycafe-mbti-preprocessed)
(CC0). PersonalityCafe **forum** data, not Twitter/X. 8,675 users, one row per user.

Configs: `raw` (no masking), `label_clean` (exact MBTI codes masked), `psychometric_clean`
(also MBTI terms and cognitive functions masked). All share the same user-level split.

**Train models only on the cleaned data:**

```python
from src.data_loader import load_clean
df = load_clean()          # = data/processed/psychometric_clean_masked.parquet
train = df[df["split"] == "train"]
```

- `load_clean()` defaults to `psychometric_clean` + our cleaning. This is the main dataset.
  `load_clean("label_clean")` / `load_clean("raw")` exist only for comparison experiments.
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

`clean_text(text)` is the single entry point. **The Streamlit app must call the same
`clean_text` on user input**, otherwise train and inference text differ.

It fixes encoding artefacts (`isnx92t` → `isn't`, `x93`/`x94` → quotes, `x95` bullets,
`u200b`) and masks typology vocabulary:

| Placeholder | Covers |
|---|---|
| `<MBTI_TYPE>` | full types in any form (`INFPs`, `mrinfj`, `I.N.F.J`, `INxJ`, `E_TJ`), partial codes (`NFP`, `NTJ`), temperaments (`NT`, `NF`, `SJ`, `SP`) |
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
- Save models under `models/` (git-ignored) with joblib. Planned app contract:
  `predict(texts: list[str]) -> {"type": "INTP", "scores": {"EI": ..., "NS": ..., "FT": ..., "JP": ...}}`.

## Repo layout

```
app/               Streamlit app (empty)
data/raw/          HF downloads (ignored)      data/processed/  ETL output (ignored)
models/            trained models (ignored)
notebooks/         01_eda.ipynb
reports/etl/       ETL data-quality reports     reports/figures/ EDA charts
src/data_loader.py load_mbti(), load_clean()
src/etl/           cleaning.py (rules), clean_leakage.py (ETL step)
src/models/        training / evaluation code (empty)
tests/             pytest
```

## Conventions

- Python 3.13, run modules from the repo root (`python -m src.…`).
- Keep `python -m pytest` green; add tests for new cleaning or ETL logic.
- Don't commit data, models, `.venv/` or secrets (`.env`, `.streamlit/secrets.toml`).
- Don't store users' app input beyond what is needed (privacy).
- Work on feature branches (`feature/etl`, `feature/model`, `feature/app`,
  `feature/dashboard`) and merge to `main` via pull requests.
- **Update the status table (see "Mandatory: keep this table up to date") in every commit
  that finishes or starts a step.**
