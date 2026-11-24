import {
  AnalyzeApiRequest,
  AnalyzeApiResponse,
  AnalyzeErrorResponse,
  AnalyzeInputMode,
  MbtiCode,
  MbtiDimensionScores,
  PredictionResult,
} from '../types/personality';

const VALID_MBTI_CODES = new Set<MbtiCode>([
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
]);

export class PredictionError extends Error {
  statusCode?: number;
  isModelNotConnected: boolean;

  constructor(message: string, statusCode?: number, isModelNotConnected = false) {
    super(message);
    this.name = 'PredictionError';
    this.statusCode = statusCode;
    this.isModelNotConnected = isModelNotConnected;
  }
}

function isValidProbability(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function parseValidScores(
  rawScores: AnalyzeApiResponse['scores']
): MbtiDimensionScores | null {
  if (!rawScores || typeof rawScores !== 'object') {
    return null;
  }

  const { EI, NS, FT, JP } = rawScores;
  if (
    isValidProbability(EI) &&
    isValidProbability(NS) &&
    isValidProbability(FT) &&
    isValidProbability(JP)
  ) {
    return { EI, NS, FT, JP };
  }

  return null;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/**
 * Isolated prediction client communicating with the Python FastAPI backend via POST /api/analyze.
 * Sends separate writing samples (`texts: string[]`) without concatenating them prematurely
 * so the Python backend can apply `src.etl.cleaning.clean_posts` and its expected `<POST_SEP>` format.
 */
export async function analyzePersonalityTexts(
  rawTexts: string[],
  inputMode: AnalyzeInputMode
): Promise<PredictionResult> {
  const texts = rawTexts.map((t) => t.trim()).filter((t) => t.length > 0);

  if (texts.length === 0) {
    throw new PredictionError(
      inputMode === 'multiple'
        ? 'Please enter text in at least one post before submitting.'
        : 'Please enter a writing sample before submitting.',
      400,
      false
    );
  }

  const analyzedWordCount = texts.reduce((sum, item) => sum + countWords(item), 0);
  const requestBody: AnalyzeApiRequest = {
    texts,
    input_mode: inputMode,
  };

  let response: Response;
  try {
    response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
  } catch {
    throw new PredictionError(
      'Model not connected yet. Unable to reach the prediction backend at /api/analyze.',
      503,
      true
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | (AnalyzeApiResponse & AnalyzeErrorResponse)
    | null;

  if (!response.ok) {
    const isNotConnected =
      response.status === 503 ||
      response.status === 502 ||
      response.status === 404 ||
      payload?.code === 'MODEL_NOT_CONNECTED' ||
      payload?.connected === false;

    throw new PredictionError(
      payload?.message ||
        payload?.error ||
        (isNotConnected
          ? 'Model not connected yet. The Python FastAPI prediction service is not available.'
          : 'Unable to process your request right now.'),
      response.status,
      isNotConnected
    );
  }

  const rawType = String(
    payload?.predicted_type ?? (payload as unknown as { type?: string })?.type ?? ''
  )
    .toUpperCase()
    .trim() as MbtiCode;

  if (!VALID_MBTI_CODES.has(rawType)) {
    throw new PredictionError(
      'The backend returned an unrecognized MBTI type code.',
      502,
      false
    );
  }

  const modelVersion =
    typeof payload?.model_version === 'string' && payload.model_version.trim().length > 0
      ? payload.model_version.trim()
      : null;

  return {
    predictedType: rawType,
    scores: parseValidScores(payload?.scores),
    modelVersion,
    analyzedPostCount: typeof payload?.n_posts === 'number' ? payload.n_posts : texts.length,
    analyzedWordCount: typeof payload?.n_words === 'number' ? payload.n_words : analyzedWordCount,
    enoughText: typeof payload?.enough_text === 'boolean' ? payload.enough_text : null,
    minWords: typeof payload?.min_words === 'number' ? payload.min_words : 300,
  };
}
