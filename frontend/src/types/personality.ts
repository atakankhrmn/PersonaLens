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
 * Each score is a model score in [0, 1] for the positive letter (> 0.5 = that letter):
 *   - EI: score of E (Extraverted)
 *   - NS: score of N (Intuitive)
 *   - FT: score of T (Thinking)
 *   - JP: score of J (Judging)
 * The model is trained with class_weight="balanced", so these are NOT real-world
 * probabilities (AGENTS.md caveat 6): show them as "leans towards", never as "% chance".
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
  /** Words left after the same cleaning as the training data. */
  n_words?: number;
  n_posts?: number;
  /** False below MIN_WORDS (300): the UI must show the "not enough text" warning. */
  enough_text?: boolean;
  min_words?: number;
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
  /** null when the backend did not say (older API). */
  enoughText: boolean | null;
  minWords: number;
}

export interface AnalyzeErrorResponse {
  code?: 'MODEL_NOT_CONNECTED' | 'INVALID_INPUT' | 'BACKEND_ERROR';
  connected?: boolean;
  error?: string;
  message?: string;
}

export type AppRoute = 'home' | 'types' | 'analyze' | 'insights' | 'about';
