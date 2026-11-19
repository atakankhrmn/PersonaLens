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

### Leakage-cleaning ETL

The Hugging Face `label_clean` config still contains MBTI codes in forms such as
`INFPs`, `infpness`, `mrinfj`, `I.N.F.J` or `INxJ`. Run our ETL step to mask them:

```powershell
python -m src.etl.clean_leakage                 # label_clean (default)
python -m src.etl.clean_leakage --config all    # raw, label_clean, psychometric_clean
```

Outputs `data/processed/<config>_masked.parquet` and a data-quality report in
`reports/etl/leakage_report_<config>.json`.

| `label_clean` | before | after |
|---|---:|---:|
| MBTI mentions in text | 23,597 | 0 |
| users with any mention | 64.5% | 0% |
| users with their **own** type in text | 48.9% | 0% |

Run the tests with `python -m pytest`. The Streamlit app must use the same
`src.etl.cleaning.mask_mbti` on user input so training and prediction text are cleaned identically.

### Loading data in your code

```python
from src.data_loader import load_clean, load_mbti

df = load_clean("label_clean")   # leakage-masked data → use this for models
raw = load_mbti("raw")           # original HF configs, e.g. for EDA / comparison
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
  through suffixed forms such as `INFPs` → fixed by our leakage ETL (see above)

## Project Plan

The full project plan (in Turkish) is available in [MBTI_DW_Proje_Plani.md](MBTI_DW_Proje_Plani.md).

## Status

🚧 Early stage: EDA and leakage-cleaning ETL done; baseline models and data warehouse next.
