import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { VERIFIED_DATASET_OVERVIEW, VERIFIED_ETL_REPORTS } from '../../data/etlReports';
import {
  fetchDatasetOverview,
  fetchDimensionDistribution,
  fetchEtlReports,
  fetchModelPerformance,
  fetchTypeDistribution,
  ModelInsightsPayload,
} from '../../services/insights';
import {
  DatasetOverviewMetrics,
  DimensionDistributionRow,
  EtlConfigId,
  EtlConfigReport,
  InsightsDataState,
  MbtiTypeDistributionRow,
} from '../../types/insights';
import { DatasetOverviewSection } from './DatasetOverviewSection';
import { EtlQualitySection } from './EtlQualitySection';
import { MbtiDistributionSection } from './MbtiDistributionSection';
import { ModelPerformanceSection } from './ModelPerformanceSection';

type InsightsTab = 'overview' | 'distribution' | 'etl' | 'models';

const TAB_ITEMS: { id: InsightsTab; label: string }[] = [
  { id: 'overview', label: 'Dataset Overview' },
  { id: 'distribution', label: 'MBTI Distribution' },
  { id: 'etl', label: 'ETL & Data Quality' },
  { id: 'models', label: 'Model Performance' },
];

export const DataInsightsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<InsightsTab>('overview');
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [overviewState, setOverviewState] = useState<
    InsightsDataState<DatasetOverviewMetrics>
  >({
    status: 'ready',
    data: VERIFIED_DATASET_OVERVIEW,
    sourceAttribution: 'Verified repository overview metrics',
    plannedEndpoint: 'GET /api/insights/overview',
    warehouseSource: 'dw.dim_user · dw.fact_post',
  });

  const [etlState, setEtlState] = useState<
    InsightsDataState<Record<EtlConfigId, EtlConfigReport>>
  >({
    status: 'ready',
    data: VERIFIED_ETL_REPORTS,
    sourceAttribution: 'Verified ETL JSON snapshots',
    plannedEndpoint: 'GET /api/insights/etl',
    warehouseSource: 'dw.fact_data_quality · dw.vw_data_quality_latest',
  });

  const [typesState, setTypesState] = useState<
    InsightsDataState<MbtiTypeDistributionRow[]>
  >({
    status: 'loading',
    data: null,
    sourceAttribution: 'Awaiting PostgreSQL Data Warehouse API',
    plannedEndpoint: 'GET /api/insights/types',
    warehouseSource: 'dw.vw_type_distribution · dw.vw_posts_by_type',
  });

  const [dimensionsState, setDimensionsState] = useState<
    InsightsDataState<DimensionDistributionRow[]>
  >({
    status: 'loading',
    data: null,
    sourceAttribution: 'Awaiting PostgreSQL Data Warehouse API',
    plannedEndpoint: 'GET /api/insights/dimensions',
    warehouseSource: 'dw.vw_dimension_distribution',
  });

  const [modelsState, setModelsState] = useState<
    InsightsDataState<ModelInsightsPayload>
  >({
    status: 'loading',
    data: null,
    sourceAttribution: 'Awaiting trained model evaluation records',
    plannedEndpoint: 'GET /api/insights/models',
    warehouseSource: 'dw.dim_model · dw.fact_prediction · dw.vw_model_performance',
  });

  useEffect(() => {
    let mounted = true;

    async function loadInsights() {
      const [overview, etl, types, dimensions, models] = await Promise.all([
        fetchDatasetOverview(),
        fetchEtlReports(),
        fetchTypeDistribution(),
        fetchDimensionDistribution(),
        fetchModelPerformance(),
      ]);

      if (!mounted) return;
      setOverviewState(overview);
      setEtlState(etl);
      setTypesState(types);
      setDimensionsState(dimensions);
      setModelsState(models);
      setIsInitialLoading(false);
    }

    loadInsights();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-10">
      {/* Dashboard Header */}
      <header className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-medium text-[#5A6375]">
              <span>Data Warehouse & BI Analytics</span>
              <span aria-hidden="true">·</span>
              <span>PersonalityCafe MBTI Corpus</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#1E2430]">
              Data Insights
            </h1>
            <p className="text-base sm:text-lg text-[#525B6E] leading-relaxed">
              Explore the data, preprocessing pipeline, and machine learning insights behind PersonaLens.
            </p>
          </div>

          {isInitialLoading && (
            <div className="inline-flex items-center gap-2 text-xs font-medium text-[#5A6375]">
              <Loader2 className="w-4 h-4 animate-spin text-[#33A474]" />
              <span>Checking warehouse endpoints...</span>
            </div>
          )}
        </div>

        {/* 4-Section Dashboard Tabs */}
        <div
          role="tablist"
          aria-label="Data Insights sections"
          className="inline-flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-[#F0EFEA] border border-black/[0.05]"
        >
          {TAB_ITEMS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-white text-[#1E2430] shadow-xs'
                    : 'text-[#5A6375] hover:text-[#1E2430]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Active Dashboard Section */}
      {activeTab === 'overview' && (
        <DatasetOverviewSection overviewState={overviewState} />
      )}
      {activeTab === 'distribution' && (
        <MbtiDistributionSection
          typesState={typesState}
          dimensionsState={dimensionsState}
        />
      )}
      {activeTab === 'etl' && <EtlQualitySection etlState={etlState} />}
      {activeTab === 'models' && (
        <ModelPerformanceSection modelsState={modelsState} />
      )}

      {/* Privacy & Architecture Attribution Footer Note */}
      <div className="rounded-2xl bg-white border border-black/[0.06] px-5 py-4 text-xs text-[#5A6375] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <span>
          Dataset statistics reflect verified PersonalityCafe ETL outputs (<span className="font-mono">label_clean</span>). User-submitted text from the analyzer is never stored or mixed into warehouse metrics.
        </span>
        <span className="font-mono text-[11px] text-[#6B7280] shrink-0">
          Browser never connects directly to PostgreSQL
        </span>
      </div>
    </div>
  );
};
