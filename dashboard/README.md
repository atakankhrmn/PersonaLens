# PersonaLens BI dashboard (Power BI)

`PersonaLens.pbix` is a Power BI Desktop report on the PostgreSQL warehouse (`personalens`
database, `dw` schema). It uses **Import mode** and reads only the `dw.vw_*` views — never
`fact_post`, which holds 400k post texts.

## Open / refresh on your machine

1. Load the warehouse and the model predictions (see the main README):
   `python -m src.dw.load_dw`, then the model training step that writes predictions.
2. Open `PersonaLens.pbix` in Power BI Desktop.
3. If the data source differs: *Transform data → Data source settings* → server `localhost`,
   database `personalens`, user `postgres` + your own password (never stored in the repo).
4. *Home → Refresh*.

## Pages

| Page | Content | Views |
|---|---|---|
| Veri Profili | users, 16-type distribution, letter shares per dimension, posts/words per type | `vw_type_distribution`, `vw_dimension_distribution`, `vw_posts_by_type` |
| Veri Kalitesi | leakage before/after cleaning for the three HF configs | `vw_data_quality_latest` |
| Model Performansı | Macro-F1 / Balanced Accuracy per dimension, per-type F1, exact match | `vw_model_dimension_metrics`, `vw_model_type_metrics`, `vw_model_performance` |
| Confusion Matrix | true × predicted type | `vw_confusion_matrix` |

Model pages never show train predictions (they are in-sample). This is done in the model,
not with visual filters:

- calculated table `Split = FILTER(DISTINCT('dw vw_model_performance'[split]), [split] <> "train")`
  feeds a **single-select** slicer (default: `test`), synced on both model pages;
- the measures (in the `Split` table) apply the selection with `TREATAS`, e.g.
  `Macro-F1 = CALCULATE(AVERAGE('dw vw_model_dimension_metrics'[macro_f1]), TREATAS(VALUES('Split'[split]), 'dw vw_model_dimension_metrics'[split]))`.
  Others: `Balanced Accuracy`, `Tip F1`, `16 Tip Macro-F1` (only `in_scope` types),
  `Tam Eslesme` (= SUM(correct) / SUM(support) from `vw_model_type_metrics`),
  `Kullanici Sayisi` (confusion matrix counts), `Toplam Kullanici` (formatted user count).
- The confusion matrix is filtered to the main model `tfidf_logreg`.

Numbers were checked against the model reports: test mean Macro-F1 per dimension
E/I 0.66, N/S 0.60, T/F 0.79, J/P 0.63; 16-type Macro-F1 0.20; exact match 0.37
(validation: 0.64 / 0.62 / 0.80 / 0.63, 0.19, 0.35).

MBTI outputs are self-reported labels predicted from forum text, not a psychological assessment.
