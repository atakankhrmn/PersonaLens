export type PersonalityGroupId = 'analysts' | 'diplomats' | 'sentinels' | 'explorers';

export type MbtiCode =
  | 'INTJ'
  | 'INTP'
  | 'ENTJ'
  | 'ENTP'
  | 'INFJ'
  | 'INFP'
  | 'ENFJ'
  | 'ENFP'
  | 'ISTJ'
  | 'ISFJ'
  | 'ESTJ'
  | 'ESFJ'
  | 'ISTP'
  | 'ISFP'
  | 'ESTP'
  | 'ESFP';

export interface GroupTheme {
  id: PersonalityGroupId;
  name: string;
  tagline: string;
  description: string;
  accentHex: string;
  inkHex: string;
  softBgHex: string;
  cardBgHex: string;
  cardHoverBgHex: string;
  borderHex: string;
  barTrackHex: string;
}

export interface PersonalityTypeInfo {
  code: MbtiCode;
  title: string;
  group: PersonalityGroupId;
  shortDescription: string;
  fullDescription: string;
  strengths: string[];
  writingVoice: string;
}

/**
 * Repository scoring convention (src/dw/predictions.py & AGENTS.md):
 * Binary labels: I=0/E=1, S=0/N=1, F=0/T=1, P=0/J=1.
 * Each score is a probability in [0, 1] for the positive letter:
 *   - EI: probability of E (Extraverted)
 *   - NS: probability of N (Intuitive)
 *   - FT: probability of T (Thinking)
 *   - JP: probability of J (Judging)
 */
export interface MbtiDimensionScores {
  EI: number;
  NS: number;
  FT: number;
  JP: number;
}

export type AnalyzeInputMode = 'single' | 'multiple';

/**
 * Request payload sent to Python FastAPI POST /api/analyze.
 * Both Single Text and Multiple Posts send a list of separate text samples
 * so the backend can run src.etl.cleaning.clean_posts and join with <POST_SEP>.
 */
export interface AnalyzeApiRequest {
  texts: string[];
  input_mode: AnalyzeInputMode;
}

/**
 * Expected JSON response contract from Python FastAPI POST /api/analyze.
 */
export interface AnalyzeApiResponse {
  predicted_type: MbtiCode;
  scores?: Partial<MbtiDimensionScores> | null;
  model_version?: string | null;
}

/**
 * Normalized frontend prediction result.
 * Only holds verified fields returned by the backend—no invented confidence,
 * psychological explanations, or alternative predictions.
 */
export interface PredictionResult {
  predictedType: MbtiCode;
  scores: MbtiDimensionScores | null;
  modelVersion: string | null;
  analyzedPostCount: number;
  analyzedWordCount: number;
}

export interface AnalyzeErrorResponse {
  code?: 'MODEL_NOT_CONNECTED' | 'INVALID_INPUT' | 'BACKEND_ERROR';
  connected?: boolean;
  error?: string;
  message?: string;
}

export type AppRoute = 'home' | 'types' | 'analyze' | 'insights' | 'about';
