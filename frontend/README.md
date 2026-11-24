# PersonaLens web frontend

React + Vite UI served by a small Express server (`server.ts`). The server only proxies
requests to the Python inference / insights API; it does not run any model itself and
does not call any external AI service.

> The trained model is not connected yet. Until `PYTHON_API_URL` points to a running
> Python service, `/api/analyze` answers `503 MODEL_NOT_CONNECTED` and the UI shows a
> "model not connected" state. Insights fall back to the verified ETL report numbers in
> `src/data/etlReports.ts`.

## Run locally

Prerequisite: Node.js 22+ (or Bun).

```powershell
cd frontend
npm install          # or: bun install
copy .env.example .env   # optional; set PYTHON_API_URL once the Python API exists
npm run dev          # http://localhost:3000
```

Other scripts: `npm run lint` (TypeScript check), `npm run build` (production bundle in `dist/`).

## Environment variables

| Variable | Purpose |
|---|---|
| `PYTHON_API_URL` | Base URL of the Python API, e.g. `http://127.0.0.1:8000`. Empty = model not connected. |

## API contract expected from the Python service

| Endpoint | Request | Response |
|---|---|---|
| `GET /health` | – | any `2xx` = model connected |
| `POST /api/analyze` | `{ "texts": string[], "input_mode": "single" \| "multiple" }` | `{ "predicted_type": "INTP", "scores": { "EI": p, "NS": p, "FT": p, "JP": p }, "model_version": "v1" }` |
| `GET /api/insights/{overview,types,dimensions,etl,models}` | – | JSON for the Data Insights page |

`texts` are separate writing samples. The Python side must clean them with
`src.etl.cleaning.clean_posts` and join them with `" <POST_SEP> "`, exactly like the
training data. Scores are probabilities of E, N, T and J (same convention as
`src/dw/predictions.py`).

The UI shows a "not enough text" warning below 300 words (`MIN_RECOMMENDED_WORDS` in
`src/components/TextAnalyzer.tsx`), because the model is trained on whole user histories.
