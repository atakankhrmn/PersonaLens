import { VERIFIED_DATASET_OVERVIEW, VERIFIED_ETL_REPORTS } from '../data/etlReports';
import {
  ConfusionMatrixCell,
  DatasetOverviewMetrics,
  DimensionDistributionRow,
  EtlConfigId,
  EtlConfigReport,
  InsightsDataState,
  MbtiTypeDistributionRow,
  ModelPerformanceRow,
  TopFeatures,
} from '../types/insights';

async function tryFetchJson<T>(endpoint: string): Promise<T | null> {
  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
      return null;
    }
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Proposed future endpoint: GET /api/insights/overview
 * Falls back to verified repository documentation constants when no DW API is active.
 */
export async function fetchDatasetOverview(): Promise<InsightsDataState<DatasetOverviewMetrics>> {
  const remote = await tryFetchJson<DatasetOverviewMetrics>('/api/insights/overview');
  if (remote && typeof remote.totalUsers === 'number') {
    return {
      status: 'ready',
      data: remote,
      sourceAttribution: 'Live PostgreSQL warehouse (dw.dim_user, dw.fact_post)',
      plannedEndpoint: 'GET /api/insights/overview',
      warehouseSource: 'dw.dim_user · dw.fact_post · dw.vw_data_quality_latest',
    };
  }

  return {
    status: 'ready',
    data: VERIFIED_DATASET_OVERVIEW,
    sourceAttribution:
      'Verified static export from PersonalityCafe label_clean ETL report & repository docs',
    plannedEndpoint: 'GET /api/insights/overview',
    warehouseSource: 'dw.dim_user · dw.fact_post · dw.vw_data_quality_latest',
  };
}

/**
 * Proposed future endpoint: GET /api/insights/etl
 * Falls back to verified static JSON reports from reports/etl/leakage_report_*.json.
 */
export async function fetchEtlReports(): Promise<
  InsightsDataState<Record<EtlConfigId, EtlConfigReport>>
> {
  const remote = await tryFetchJson<Record<EtlConfigId, EtlConfigReport>>('/api/insights/etl');
  if (remote && remote.label_clean && remote.raw && remote.psychometric_clean) {
    return {
      status: 'ready',
      data: remote,
      sourceAttribution: 'Live API: reports/etl/leakage_report_{raw,label_clean,psychometric_clean}.json',
      plannedEndpoint: 'GET /api/insights/etl',
      warehouseSource: 'dw.fact_data_quality · dw.vw_data_quality_latest',
    };
  }

  return {
    status: 'ready',
    data: VERIFIED_ETL_REPORTS,
    sourceAttribution:
      'Verified JSON snapshots: reports/etl/leakage_report_{raw,label_clean,psychometric_clean}.json',
    plannedEndpoint: 'GET /api/insights/etl',
    warehouseSource: 'dw.fact_data_quality · dw.vw_data_quality_latest',
  };
}

/**
 * Proposed future endpoint: GET /api/insights/types
 * Returns 'unavailable' until the backend exposes PostgreSQL dw.vw_type_distribution / dw.vw_posts_by_type.
 */
export async function fetchTypeDistribution(): Promise<
  InsightsDataState<MbtiTypeDistributionRow[]>
> {
  const remote = await tryFetchJson<MbtiTypeDistributionRow[]>('/api/insights/types');
  if (Array.isArray(remote) && remote.length > 0) {
    return {
      status: 'ready',
      data: remote,
      sourceAttribution: 'PostgreSQL Data Warehouse (dw.vw_type_distribution, dw.vw_posts_by_type)',
      plannedEndpoint: 'GET /api/insights/types',
      warehouseSource: 'dw.vw_type_distribution · dw.vw_posts_by_type · dw.vw_user_profile',
    };
  }

  return {
    status: 'unavailable',
    data: null,
    sourceAttribution: 'Awaiting PostgreSQL Data Warehouse API export',
    plannedEndpoint: 'GET /api/insights/types',
    warehouseSource: 'dw.vw_type_distribution · dw.vw_posts_by_type · dw.vw_user_profile',
  };
}

/**
 * Proposed future endpoint: GET /api/insights/dimensions
 * Returns 'unavailable' until the backend exposes PostgreSQL dw.vw_dimension_distribution.
 */
export async function fetchDimensionDistribution(): Promise<
  InsightsDataState<DimensionDistributionRow[]>
> {
  const remote = await tryFetchJson<DimensionDistributionRow[]>('/api/insights/dimensions');
  if (Array.isArray(remote) && remote.length > 0) {
    return {
      status: 'ready',
      data: remote,
      sourceAttribution: 'PostgreSQL Data Warehouse (dw.vw_dimension_distribution)',
      plannedEndpoint: 'GET /api/insights/dimensions',
      warehouseSource: 'dw.vw_dimension_distribution',
    };
  }

  return {
    status: 'unavailable',
    data: null,
    sourceAttribution: 'Awaiting PostgreSQL Data Warehouse API export',
    plannedEndpoint: 'GET /api/insights/dimensions',
    warehouseSource: 'dw.vw_dimension_distribution',
  };
}

export interface ModelInsightsPayload {
  models: ModelPerformanceRow[];
  /** Majority-class baseline (always the most common training type) per split. */
  baselines: ModelPerformanceRow[];
  confusionMatrix: ConfusionMatrixCell[];
  topFeatures: TopFeatures;
}

/**
 * Proposed future endpoint: GET /api/insights/models
 * Returns 'unavailable' until ML training/validation writes to dw.dim_model and dw.fact_prediction.
 */
export async function fetchModelPerformance(): Promise<InsightsDataState<ModelInsightsPayload>> {
  const remote = await tryFetchJson<ModelInsightsPayload>('/api/insights/models');
  if (remote && Array.isArray(remote.models) && remote.models.length > 0) {
    return {
      status: 'ready',
      data: {
        models: remote.models,
        baselines: Array.isArray(remote.baselines) ? remote.baselines : [],
        confusionMatrix: Array.isArray(remote.confusionMatrix) ? remote.confusionMatrix : [],
        topFeatures: remote.topFeatures || {},
      },
      sourceAttribution:
        'Model reports (reports/models/*.json, scikit-learn metrics) + PostgreSQL dw.vw_confusion_matrix',
      plannedEndpoint: 'GET /api/insights/models',
      warehouseSource: 'dw.dim_model · dw.fact_prediction · dw.vw_model_performance · dw.vw_confusion_matrix',
    };
  }

  return {
    status: 'unavailable',
    data: null,
    sourceAttribution: 'Awaiting trained model evaluation records in PostgreSQL',
    plannedEndpoint: 'GET /api/insights/models',
    warehouseSource: 'dw.dim_model · dw.fact_prediction · dw.vw_model_performance · dw.vw_confusion_matrix',
  };
}
