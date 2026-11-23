import { MbtiCode, PersonalityGroupId } from './personality';

export type EtlConfigId = 'raw' | 'label_clean' | 'psychometric_clean';

export type DatasetSplit = 'all' | 'train' | 'validation' | 'test';

export interface EtlRuleCount {
  mentions: number;
  users_pct: number;
}

export interface EtlStageSnapshot {
  users: number;
  posts: number;
  leak_mentions_total: number;
  users_with_any_leak_pct: number;
  users_with_own_type_pct: number;
  encoding_artefacts: number;
  by_rule: Record<string, EtlRuleCount>;
  top_mentions: Array<[string, number]>;
}

export interface EtlConfigReport {
  config: EtlConfigId;
  displayName: string;
  isMainDataset: boolean;
  created_at: string;
  output: string;
  posts_removed_by_post_cleaning: number;
  template_texts_found: number;
  posts_removed_as_templates: number;
  users_left_without_posts: number;
  seconds: number;
  before: EtlStageSnapshot;
  after: EtlStageSnapshot;
}

export interface DatasetOverviewMetrics {
  totalUsers: number;
  cleanedPosts: number;
  personalityTypes: number;
  detectedLeakageAfterPct: number;
  sourceName: string;
  sourcePlatformNote: string;
  mainConfigName: string;
}

/**
 * Matches dw.vw_type_distribution & dw.vw_posts_by_type
 */
export interface MbtiTypeDistributionRow {
  type_code: MbtiCode;
  temperament: PersonalityGroupId;
  split?: Exclude<DatasetSplit, 'all'>;
  users: number;
  pct_of_split?: number;
  posts?: number;
  posts_per_user?: number;
  avg_words_per_post?: number;
  words_per_user?: number;
}

/**
 * Matches dw.vw_dimension_distribution
 */
export interface DimensionDistributionRow {
  dimension: 'E/I' | 'N/S' | 'F/T' | 'J/P';
  letter: 'E' | 'I' | 'N' | 'S' | 'T' | 'F' | 'J' | 'P';
  users: number;
  pct: number;
}

/**
 * Matches dw.dim_model + dw.vw_model_performance
 */
export interface ModelPerformanceRow {
  model_name: string;
  model_version: string;
  algorithm: string;
  split: Exclude<DatasetSplit, 'all'>;
  users: number;
  type_accuracy: number;
  ei_accuracy: number;
  ns_accuracy: number;
  ft_accuracy: number;
  jp_accuracy: number;
  macro_f1?: number | null;
  balanced_accuracy?: number | null;
  precision?: number | null;
  recall?: number | null;
}

/**
 * Matches dw.vw_confusion_matrix
 */
export interface ConfusionMatrixCell {
  model_name: string;
  model_version: string;
  split: Exclude<DatasetSplit, 'all'>;
  true_type: MbtiCode;
  predicted_type: MbtiCode;
  users: number;
}

export type InsightsAvailability = 'loading' | 'ready' | 'unavailable' | 'error';

export interface InsightsDataState<T> {
  status: InsightsAvailability;
  data: T | null;
  sourceAttribution: string;
  plannedEndpoint: string;
  warehouseSource: string;
  errorMessage?: string;
}
