import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  // Python FastAPI backend (python -m src.api). Set PYTHON_API_URL=off to disable it.
  const configuredUrl = (process.env.PYTHON_API_URL ?? '').trim();
  const pythonBackendUrl =
    configuredUrl.toLowerCase() === 'off'
      ? ''
      : (configuredUrl || 'http://127.0.0.1:8000').replace(/\/+$/, '');

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', async (_req, res) => {
    if (!pythonBackendUrl) {
      res.json({
        ok: true,
        modelConnected: false,
        message: 'The Python prediction API is disabled (PYTHON_API_URL=off).',
      });
      return;
    }

    try {
      const upstream = await fetch(`${pythonBackendUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2500),
      });
      res.json({
        ok: true,
        modelConnected: upstream.ok,
      });
    } catch {
      res.json({
        ok: true,
        modelConnected: false,
        message: `Python API not reachable at ${pythonBackendUrl}. Start it with "python -m src.api".`,
      });
    }
  });

  /**
   * Data Warehouse / BI insights: GET /api/insights/{overview,types,dimensions,etl,models}
   * Proxied to the Python API (src/api/insights.py).
   */
  app.use('/api/insights', async (req, res) => {
    if (!pythonBackendUrl) {
      res.status(501).json({
        available: false,
        message: 'The Python API is disabled (PYTHON_API_URL=off).',
      });
      return;
    }

    try {
      const upstream = await fetch(`${pythonBackendUrl}/api/insights${req.path}`, {
        method: 'GET',
        signal: AbortSignal.timeout(15000),
      });
      const data = await upstream.json().catch(() => null);
      res.status(upstream.status).json(
        data || { available: false, message: 'Insights endpoint unavailable.' }
      );
    } catch {
      res.status(503).json({
        available: false,
        message: 'Python backend insights service is unavailable.',
      });
    }
  });

  /**
   * Proxy route for the Python FastAPI inference service (src/api/app.py).
   * Accepts `{ texts: string[], input_mode?: "single" | "multiple" }` (or legacy `{ text: string }`)
   * and forwards separate writing samples untouched so Python can run `clean_posts`.
   */
  app.post('/api/analyze', async (req, res) => {
    let texts: string[] = [];

    if (Array.isArray(req.body?.texts)) {
      texts = req.body.texts
        .filter((item: unknown): item is string => typeof item === 'string')
        .map((item: string) => item.trim())
        .filter((item: string) => item.length > 0);
    } else if (typeof req.body?.text === 'string' && req.body.text.trim().length > 0) {
      texts = [req.body.text.trim()];
    }

    if (texts.length === 0) {
      res.status(400).json({
        code: 'INVALID_INPUT',
        error: 'Please enter at least one non-empty writing sample before submitting.',
      });
      return;
    }

    const totalCharacters = texts.reduce((sum, item) => sum + item.length, 0);
    if (totalCharacters > 50000) {
      res.status(400).json({
        code: 'INVALID_INPUT',
        error: 'Combined text length exceeds the 50,000 character limit.',
      });
      return;
    }

    const inputMode = req.body?.input_mode === 'multiple' ? 'multiple' : 'single';

    if (!pythonBackendUrl) {
      res.status(503).json({
        code: 'MODEL_NOT_CONNECTED',
        connected: false,
        message: 'The Python prediction API is disabled (PYTHON_API_URL=off).',
      });
      return;
    }

    try {
      const upstream = await fetch(`${pythonBackendUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts, input_mode: inputMode }),
        signal: AbortSignal.timeout(15000),
      });

      const data = await upstream.json().catch(() => null);

      if (!upstream.ok) {
        res.status(upstream.status).json(
          data || {
            code: 'BACKEND_ERROR',
            error: 'Python prediction backend returned an error.',
          }
        );
        return;
      }

      res.json(data);
    } catch (error) {
      console.error('FastAPI backend connection error:', error);
      res.status(503).json({
        code: 'MODEL_NOT_CONNECTED',
        connected: false,
        message:
          'Could not reach the Python prediction API. Start it from the repository root with "python -m src.api".',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PersonaLens web server listening on http://localhost:${PORT}`);
  });
}

startServer();
