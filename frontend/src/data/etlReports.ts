import { DatasetOverviewMetrics, EtlConfigId, EtlConfigReport } from '../types/insights';

/**
 * Verified dataset overview metrics from the main `label_clean` dataset
 * and PersonaLens repository documentation (README.md / AGENTS.md).
 */
export const VERIFIED_DATASET_OVERVIEW: DatasetOverviewMetrics = {
  totalUsers: 8675,
  cleanedPosts: 406793,
  personalityTypes: 16,
  detectedLeakageAfterPct: 0,
  sourceName: 'PersonalityCafe MBTI Dataset',
  sourcePlatformNote:
    'Data consists of PersonalityCafe forum posts, not Twitter/X posts. Post dates are not present in the dataset and are never fabricated.',
  mainConfigName: 'label_clean',
};

/**
 * Verified ETL reports sourced directly from:
 * - reports/etl/leakage_report_raw.json
 * - reports/etl/leakage_report_label_clean.json
 * - reports/etl/leakage_report_psychometric_clean.json
 */
export const VERIFIED_ETL_REPORTS: Record<EtlConfigId, EtlConfigReport> = {
  raw: {
    config: 'raw',
    displayName: 'Raw',
    isMainDataset: false,
    created_at: '2026-11-19T18:21:54+00:00',
    output: 'data/processed/raw_masked.parquet',
    posts_removed_by_post_cleaning: 2331,
    template_texts_found: 27,
    posts_removed_as_templates: 192,
    users_left_without_posts: 0,
    seconds: 187.0,
    before: {
      users: 8675,
      posts: 409318,
      leak_mentions_total: 180812,
      users_with_any_leak_pct: 96.66,
      users_with_own_type_pct: 89.95,
      encoding_artefacts: 2187,
      by_rule: {
        type_full: { mentions: 124808, users_pct: 95.9 },
        type_spaced: { mentions: 52, users_pct: 0.52 },
        type_wildcard: { mentions: 4912, users_pct: 24.52 },
        type_partial: { mentions: 1090, users_pct: 7.79 },
        temperament: { mentions: 4382, users_pct: 24.52 },
        mbti_term: { mentions: 7324, users_pct: 41.39 },
        cognitive_function: { mentions: 29409, users_pct: 45.26 },
        socionics: { mentions: 431, users_pct: 2.06 },
        enneagram: { mentions: 6961, users_pct: 18.25 },
        stacking: { mentions: 1443, users_pct: 5.24 },
      },
      top_mentions: [
        ['INFP', 12178],
        ['INFJ', 11307],
        ['INTJ', 10972],
        ['INTP', 9700],
        ['ENFP', 8064],
        ['ENTP', 6851],
        ['Fe', 4938],
        ['MBTI', 4862],
        ['Fi', 4653],
        ['ISTJ', 4551],
      ],
    },
    after: {
      users: 8675,
      posts: 406795,
      leak_mentions_total: 0,
      users_with_any_leak_pct: 0.0,
      users_with_own_type_pct: 0.0,
      encoding_artefacts: 0,
      by_rule: {
        type_full: { mentions: 0, users_pct: 0.0 },
        type_spaced: { mentions: 0, users_pct: 0.0 },
        type_wildcard: { mentions: 0, users_pct: 0.0 },
        type_partial: { mentions: 0, users_pct: 0.0 },
        temperament: { mentions: 0, users_pct: 0.0 },
        mbti_term: { mentions: 0, users_pct: 0.0 },
        cognitive_function: { mentions: 0, users_pct: 0.0 },
        socionics: { mentions: 0, users_pct: 0.0 },
        enneagram: { mentions: 0, users_pct: 0.0 },
        stacking: { mentions: 0, users_pct: 0.0 },
      },
      top_mentions: [],
    },
  },
  label_clean: {
    config: 'label_clean',
    displayName: 'Label Clean (Main Dataset)',
    isMainDataset: true,
    created_at: '2026-11-19T18:24:51+00:00',
    output: 'data/processed/label_clean_masked.parquet',
    posts_removed_by_post_cleaning: 1974,
    template_texts_found: 27,
    posts_removed_as_templates: 192,
    users_left_without_posts: 0,
    seconds: 177.7,
    before: {
      users: 8675,
      posts: 408959,
      leak_mentions_total: 74668,
      users_with_any_leak_pct: 84.46,
      users_with_own_type_pct: 48.93,
      encoding_artefacts: 2187,
      by_rule: {
        type_full: { mentions: 22883, users_pct: 64.06 },
        type_spaced: { mentions: 52, users_pct: 0.52 },
        type_wildcard: { mentions: 711, users_pct: 5.41 },
        type_partial: { mentions: 1090, users_pct: 7.79 },
        temperament: { mentions: 4382, users_pct: 24.52 },
        mbti_term: { mentions: 7310, users_pct: 41.39 },
        cognitive_function: { mentions: 29408, users_pct: 45.26 },
        socionics: { mentions: 431, users_pct: 2.06 },
        enneagram: { mentions: 6960, users_pct: 18.25 },
        stacking: { mentions: 1441, users_pct: 5.24 },
      },
      top_mentions: [
        ['Fe', 4938],
        ['MBTI', 4862],
        ['Fi', 4653],
        ['Ne', 4081],
        ['Ni', 3999],
        ['Ti', 3471],
        ['INFPs', 3150],
        ['INTJs', 2925],
        ['Se', 2858],
        ['Te', 2748],
      ],
    },
    after: {
      users: 8675,
      posts: 406793,
      leak_mentions_total: 0,
      users_with_any_leak_pct: 0.0,
      users_with_own_type_pct: 0.0,
      encoding_artefacts: 0,
      by_rule: {
        type_full: { mentions: 0, users_pct: 0.0 },
        type_spaced: { mentions: 0, users_pct: 0.0 },
        type_wildcard: { mentions: 0, users_pct: 0.0 },
        type_partial: { mentions: 0, users_pct: 0.0 },
        temperament: { mentions: 0, users_pct: 0.0 },
        mbti_term: { mentions: 0, users_pct: 0.0 },
        cognitive_function: { mentions: 0, users_pct: 0.0 },
        socionics: { mentions: 0, users_pct: 0.0 },
        enneagram: { mentions: 0, users_pct: 0.0 },
        stacking: { mentions: 0, users_pct: 0.0 },
      },
      top_mentions: [],
    },
  },
  psychometric_clean: {
    config: 'psychometric_clean',
    displayName: 'Psychometric Clean',
    isMainDataset: false,
    created_at: '2026-11-19T18:27:50+00:00',
    output: 'data/processed/psychometric_clean_masked.parquet',
    posts_removed_by_post_cleaning: 1959,
    template_texts_found: 27,
    posts_removed_as_templates: 192,
    users_left_without_posts: 0,
    seconds: 178.9,
    before: {
      users: 8675,
      posts: 408944,
      leak_mentions_total: 38206,
      users_with_any_leak_pct: 75.9,
      users_with_own_type_pct: 48.93,
      encoding_artefacts: 2187,
      by_rule: {
        type_full: { mentions: 22883, users_pct: 64.06 },
        type_spaced: { mentions: 52, users_pct: 0.52 },
        type_wildcard: { mentions: 711, users_pct: 5.41 },
        type_partial: { mentions: 1090, users_pct: 7.79 },
        temperament: { mentions: 4382, users_pct: 24.52 },
        mbti_term: { mentions: 50, users_pct: 0.56 },
        cognitive_function: { mentions: 207, users_pct: 1.58 },
        socionics: { mentions: 430, users_pct: 2.06 },
        enneagram: { mentions: 6960, users_pct: 18.25 },
        stacking: { mentions: 1441, users_pct: 5.24 },
      },
      top_mentions: [
        ['INFPs', 3150],
        ['INTJs', 2925],
        ['INFJs', 2678],
        ['INTPs', 2477],
        ['ENFPs', 1876],
        ['ENTPs', 1782],
        ['NT', 1003],
        ['NF', 988],
        ['ENTJs', 868],
        ['ENFJs', 824],
      ],
    },
    after: {
      users: 8675,
      posts: 406793,
      leak_mentions_total: 0,
      users_with_any_leak_pct: 0.0,
      users_with_own_type_pct: 0.0,
      encoding_artefacts: 0,
      by_rule: {
        type_full: { mentions: 0, users_pct: 0.0 },
        type_spaced: { mentions: 0, users_pct: 0.0 },
        type_wildcard: { mentions: 0, users_pct: 0.0 },
        type_partial: { mentions: 0, users_pct: 0.0 },
        temperament: { mentions: 0, users_pct: 0.0 },
        mbti_term: { mentions: 0, users_pct: 0.0 },
        cognitive_function: { mentions: 0, users_pct: 0.0 },
        socionics: { mentions: 0, users_pct: 0.0 },
        enneagram: { mentions: 0, users_pct: 0.0 },
        stacking: { mentions: 0, users_pct: 0.0 },
      },
      top_mentions: [],
    },
  },
};

export const RULE_DISPLAY_LABELS: Record<string, string> = {
  type_full: 'Full MBTI Codes (e.g. INFPs)',
  type_spaced: 'Spaced Codes (e.g. I.N.F.J)',
  type_wildcard: 'Wildcard Codes (e.g. INxJ)',
  type_partial: 'Partial Codes (e.g. NFP)',
  temperament: 'Temperament Codes (NT/NF/SJ/SP)',
  mbti_term: 'MBTI System Terms',
  cognitive_function: 'Cognitive Functions (Fi, Ne...)',
  socionics: 'Socionics Codes',
  enneagram: 'Enneagram Wings (e.g. 4w5)',
  stacking: 'Instinctual Stackings (sx/so)',
};

export const TECHNICAL_GLOSSARY = {
  etl: {
    term: 'ETL (Extract, Transform, Load)',
    definition:
      'Automated pipeline extracting raw forum posts, fixing encoding artefacts, masking typology leakage, and loading clean records into the PostgreSQL star schema.',
  },
  dataLeakage: {
    term: 'Data Leakage',
    definition:
      'When target labels or typology hints (like "INFPs", "Fi", or "4w5") appear inside input text, letting models cheat instead of learning natural writing patterns.',
  },
  classImbalance: {
    term: 'Class Imbalance',
    definition:
      'Uneven representation across labels (~47:1 ratio across 16 MBTI types in PersonalityCafe), requiring balanced weights and macro-averaged metrics.',
  },
  macroF1: {
    term: 'Macro-F1',
    definition:
      'Unweighted average of F1 scores across all classes, giving rare personality types equal importance alongside majority types.',
  },
  balancedAccuracy: {
    term: 'Balanced Accuracy',
    definition:
      'Average recall obtained on each class, preventing models from looking artificially accurate simply by predicting the majority class.',
  },
  starSchema: {
    term: 'Star Schema (dw)',
    definition:
      'Data warehouse model separating measurable facts (fact_post, fact_prediction, fact_data_quality) from descriptive dimensions (dim_user, dim_mbti_type, dim_model).',
  },
} as const;
