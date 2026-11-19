# PersonaLens: MBTI Personality Type Prediction

PersonaLens is an experimental data analytics project that explores how well machine learning
models can predict **self-reported** MBTI personality types from user-generated text.
Beyond classification, it includes an ETL pipeline, a PostgreSQL star-schema data warehouse,
and a BI dashboard for data profiling and model evaluation.

> ⚠️ MBTI has known scientific limitations. This project does not provide psychological
> diagnoses; predictions are probabilistic model outputs, not definitive personality assessments.

## Architecture

```
Data Source
    ↓
ETL with Python / Pandas (clean, transform, load)
    ↓
PostgreSQL Data Warehouse
    ↓
ML Model (TF-IDF + Logistic Regression; SVM as baseline comparison)
    ↓
Streamlit App & BI Dashboard
```

## Approach

- Four binary classifiers for the MBTI dimensions: **E/I**, **N/S**, **T/F**, **J/P**
- Combined outputs yield one of the 16 MBTI types
- Evaluation on users unseen during training (user-level split), using Macro-F1,
  Balanced Accuracy, Precision/Recall and confusion matrices
- MBTI codes are removed from the text to prevent data leakage

## Dataset

- [PersonalityCafe MBTI (preprocessed)](https://huggingface.co/datasets/Lazanantenaina/personalitycafe-mbti-preprocessed)
- Original: [Kaggle – MBTI Type](https://www.kaggle.com/datasets/datasnaek/mbti-type)

~8,675 users, ~50 forum posts each, 16 MBTI labels. Note: the data comes from the
PersonalityCafe forum, not from Twitter/X.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Python, Pandas | Data processing and ETL |
| scikit-learn | ML models and evaluation |
| PostgreSQL | Data warehouse |
| Streamlit | User interface and dashboard |
| Power BI | Optional additional BI visualizations |

## Getting Started

```powershell
git clone https://github.com/atakankhrmn/PersonaLens.git
cd PersonaLens
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Then open `notebooks/01_eda.ipynb` (VS Code or `jupyter notebook`) and run all cells.
The dataset (~80 MB per configuration) is downloaded on first run and cached in `data/raw/`.

### Cleaning ETL

Even the strictest Hugging Face config still leaks the label. Our ETL step
([src/etl/cleaning.py](src/etl/cleaning.py)) cleans every post:

| What | Examples | Replaced by |
|---|---|---|
| Encoding artefacts | `isnx92t`, `x93quotex94`, `u200b` | `isn't`, `"quote"`, `` |
| MBTI types in any form | `INFPs`, `mrinfj`, `I.N.F.J`, `INxJ`, `E_TJ` | `<MBTI_TYPE>` |
| Partial codes & temperaments | `NFPs`, `NTJ`, `NT`, `SJs` | `<MBTI_TYPE>` |
| MBTI system words | `MBTI`, `Myers-Briggs`, `cognitive functions` | `<MBTI_TERM>` |
| Cognitive functions | `Fi`, `Ne-dom`, `NeTi` | `<COGNITIVE_FUNCTION>` |
| Socionics / Enneagram | `LII`, `SEE-Fi`, `4w5`, `sx/so` | `<TYPOLOGY_TERM>` |
| Placeholder-only posts | `<MBTI_TYPE>`, `' <URL>`, `.` | dropped |
| Copied templates (≥3 users, ≥8 words) | questionnaires, forum games | dropped |

Deliberately **kept**: words like *introvert*, *thinking*, *feeling* (genuine language signal;
"extrovert" users are only 25.7% E vs. a 23% base rate), stop words, and truncated posts.

```powershell
python -m src.etl.clean_leakage                 # psychometric_clean (default, main training set)
python -m src.etl.clean_leakage --config all    # raw, label_clean, psychometric_clean
```

Outputs `data/processed/<config>_masked.parquet` and a before/after data-quality report
in `reports/etl/leakage_report_<config>.json`.

Results (users with any leak / with their **own** type in the text):

| Config | before | after |
|---|---:|---:|
| `raw` | 96.7% / 90.0% | 0% / 0% |
| `label_clean` | 84.5% / 48.9% | 0% / 0% |
| `psychometric_clean` (main) | 75.9% / 48.9% | 0% / 0% |

All 8,675 users are kept; ~2,150 of ~409k posts (0.5%) are dropped and 2,187 encoding
artefacts are fixed. An independent check with different regexes finds no remaining
type codes, temperaments, cognitive functions or "MBTI" words.

Run the tests with `python -m pytest`. The Streamlit app must call the same
`src.etl.cleaning.clean_text` on user input so training and prediction text are cleaned identically.

### Loading data in your code

```python
from src.data_loader import load_clean, load_mbti

df = load_clean()                # psychometric_clean + our cleaning → use this for models
lc = load_clean("label_clean")   # same cleaning on label_clean, for comparison
raw = load_mbti("raw")           # original HF configs, e.g. for EDA
train = df[df["split"] == "train"]
```

## Project Structure

```
PersonaLens/
├── app/              # Streamlit app
├── data/
│   ├── raw/          # downloaded dataset (not tracked by git)
│   └── processed/    # ETL outputs (not tracked by git)
├── models/           # trained model files (not tracked by git)
├── notebooks/        # EDA and experiments
├── reports/
│   ├── etl/          # data-quality reports from ETL runs
│   └── figures/      # generated charts for dashboard / presentation
├── src/
│   ├── data_loader.py
│   ├── etl/          # cleaning rules, leakage ETL, data warehouse scripts
│   └── models/       # training and evaluation code
└── tests/            # pytest unit tests
```

## Key EDA Findings

- 8,675 users, ~47 posts each; 16-class imbalance of ~47:1 (INFP most, ESTJ least)
- Majority shares: I 77.0%, N 86.2%, F 54.1%, P 60.4% → use Macro-F1 / Balanced Accuracy
- User-level splits have no overlapping users
- **Leakage:** in `label_clean`, ~48.6% of users still have their *own* type in the text
  through suffixed forms such as `INFPs`; 45% mention cognitive functions, 24.5% temperament
  codes (NT/NF/SJ/SP), 18% Enneagram types → all removed by our cleaning ETL (see above)

## Using AI coding agents

[AGENTS.md](AGENTS.md) holds the shared context for AI coding agents (status, data rules,
cleaning, conventions); [CLAUDE.md](CLAUDE.md) imports it for Claude Code. Keep AGENTS.md
up to date when a step is finished.

## Project Plan

The full project plan (in Turkish) is available in [MBTI_DW_Proje_Plani.md](MBTI_DW_Proje_Plani.md).

## Status

🚧 Early stage: EDA and leakage-cleaning ETL done; baseline models and data warehouse next.
