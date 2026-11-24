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
  /** Users per split from dw.dim_user (only when served by the API). */
  splitUsers?: Partial<Record<Exclude<DatasetSplit, 'all'>, number>>;
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
  words?: number;
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

export type DimensionKey = 'EI' | 'NS' | 'FT' | 'JP';

export interface DimensionMetrics {
  macro_f1: number;
  balanced_accuracy: number;
  accuracy: number;
}

/**
 * Metrics of one model on one split, from reports/models/<model>_<version>.json
 * (computed with scikit-learn by src.models.train). Only validation and test are served:
 * train predictions are in-sample (AGENTS.md caveat 3).
 */
export interface ModelPerformanceRow {
  model_name: string;
  model_version: string;
  algorithm: string;
  split: 'validation' | 'test';
  /** 16-type exact match (all four letters right). */
  type_accuracy: number;
  /** 16-type Macro-F1 / Balanced Accuracy. */
  macro_f1: number;
  balanced_accuracy: number;
  mean_letters_correct?: number | null;
  ei_accuracy: number;
  ns_accuracy: number;
  ft_accuracy: number;
  jp_accuracy: number;
  dimensions: Record<DimensionKey, DimensionMetrics>;
  /** Only set on majority-baseline rows. */
  majority_type?: string | null;
}

/** Top TF-IDF words per letter, e.g. topFeatures["tfidf_logreg v1"].EI.E */
export type TopFeatures = Record<string, Partial<Record<DimensionKey, Record<string, string[]>>>>;

/**
 * Matches dw.vw_confusion_matrix
 */
export interface ConfusionMatrixCell {
  model_name: string;
  model_version: string;
  split: 'validation' | 'test';
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

/** GET /api/insights/warehouse: live description of the dw star schema. */
export interface WarehouseColumn {
  name: string;
  type: string;
  pk: boolean;
  references: string | null;
}

export interface WarehouseTable {
  name: string;
  kind: 'fact' | 'dimension';
  grain: string;
  description: string;
  rows: number;
  bytes: number;
  columns: WarehouseColumn[];
}

export interface WarehouseInfo {
  schema: string;
  engine: string;
  databaseBytes: number;
  tables: WarehouseTable[];
  foreignKeys: { from_table: string; from_column: string; to_table: string }[];
  views: { name: string; description: string }[];
  etlRuns: {
    run: number;
    source: string;
    status: string;
    started_at: string | null;
    seconds: number | null;
    git_commit: string;
  }[];
  predictionRows: { model: string; split: string; rows: number }[];
}
