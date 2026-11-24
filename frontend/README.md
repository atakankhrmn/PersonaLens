# PersonaLens web frontend

React + Vite UI served by a small Express server (`server.ts`). The server only proxies
requests to the Python inference / insights API; it does not run any model itself and
does not call any external AI service.

The Python API lives in `src/api/` of this repository. Start it before the web app:

```powershell
# repo root, with the project .venv
python -m src.api            # http://127.0.0.1:8000, needs models/tfidf_logreg.joblib
```

If the API is not running, `/api/analyze` answers `503 MODEL_NOT_CONNECTED` and the UI shows
a "model not connected" state; Data Insights falls back to the ETL report numbers in
`src/data/etlReports.ts` and shows empty states for the warehouse charts.

## Run locally

Prerequisite: Node.js 22+ (or Bun).

```powershell
cd frontend
npm install          # or: bun install
copy .env.example .env   # optional; PYTHON_API_URL defaults to http://127.0.0.1:8000
npm run dev          # http://localhost:3000
```

Other scripts: `npm run lint` (TypeScript check), `npm run build` (production bundle in `dist/`).

## Environment variables

| Variable | Purpose |
|---|---|
| `PYTHON_API_URL` | Base URL of the Python API. Empty = `http://127.0.0.1:8000`; `off` = run the UI without it. |

## API contract (implemented in `src/api/app.py`)

| Endpoint | Request | Response |
|---|---|---|
| `GET /health` | – | `{ "ok", "model_loaded", "model", "min_words", "warehouse" }` |
| `POST /api/analyze` | `{ "texts": string[], "input_mode": "single" \| "multiple" }` | `{ "predicted_type": "INTP", "scores": { "EI", "NS", "FT", "JP" }, "model_version": "tfidf_logreg v1", "n_words", "n_posts", "enough_text", "min_words", "logged_to_dw" }` |
| `GET /api/insights/overview` | – | users, cleaned posts, types, leakage %, users per split (DW) |
| `GET /api/insights/types` | – | one row per type × split: users, % of split, posts, words (DW) |
| `GET /api/insights/dimensions` | – | `dw.vw_dimension_distribution` |
| `GET /api/insights/etl` | – | `reports/etl/leakage_report_*.json` |
| `GET /api/insights/models` | – | validation/test metrics + majority baseline + top words (`reports/models/*.json`), confusion matrix (`dw.vw_confusion_matrix`); never train |

`texts` are separate writing samples. The Python side cleans them with
`src.etl.cleaning.clean_posts` and joins them with `" <POST_SEP> "`, exactly like the
training data. Scores are model scores for E, N, T and J (> 0.5 = that letter, same
convention as `src/dw/predictions.py`). They come from class-balanced classifiers, so they
are **not** real-world probabilities: the result page says "leans towards", never "% chance".

The UI shows a "not enough text" warning below 300 words (`MIN_RECOMMENDED_WORDS` in
`src/components/TextAnalyzer.tsx`) and again on the result page when the API reports
`enough_text: false` (counted after cleaning), because the model is trained on whole user
histories.
