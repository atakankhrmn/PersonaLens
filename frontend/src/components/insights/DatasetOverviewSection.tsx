import React, { useState } from 'react';
import {
  ArrowRight,
  BrainCircuit,
  Database,
  FileText,
  Filter,
  Sparkles,
} from 'lucide-react';
import { TECHNICAL_GLOSSARY } from '../../data/etlReports';
import { DatasetOverviewMetrics, InsightsDataState } from '../../types/insights';
import { TermTooltip } from './TermTooltip';

interface DatasetOverviewSectionProps {
  overviewState: InsightsDataState<DatasetOverviewMetrics>;
}

interface PipelineStage {
  id: string;
  label: string;
  shortDesc: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  bgHex: string;
  borderHex: string;
  inkHex: string;
}

const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: 'raw',
    label: 'Raw Forum Posts',
    shortDesc: 'PersonalityCafe (8,675 users)',
    detail:
      'Original PersonalityCafe forum threads (~47 posts per user across 16 self-reported MBTI labels). Contains encoding artefacts and direct typology mentions.',
    icon: FileText,
    bgHex: '#FAF9F6',
    borderHex: '#E5E7EB',
    inkHex: '#374151',
  },
  {
    id: 'etl',
    label: 'ETL & Cleaning',
    shortDesc: 'Zero detected leakage',
    detail:
      'src.etl.cleaning fixes 2,187 encoding artefacts, drops 192 copied template posts and empty entries, and masks MBTI codes, cognitive functions, and Enneagram/Socionics terms.',
    icon: Filter,
    bgHex: '#ECF7F1',
    borderHex: '#C8E9D8',
    inkHex: '#1D6446',
  },
  {
    id: 'dw',
    label: 'PostgreSQL Data Warehouse',
    shortDesc: 'Star schema (dw.*)',
    detail:
      'Idempotent star schema with dim_user, dim_mbti_type, dim_source, dim_model, fact_post (406,793 rows), fact_prediction, fact_data_quality, and analytical vw_* BI views.',
    icon: Database,
    bgHex: '#ECF5F8',
    borderHex: '#C7E2ED',
    inkHex: '#205B70',
  },
  {
    id: 'ml',
    label: 'Machine Learning',
    shortDesc: '4 binary classifiers',
    detail:
      'Planned scikit-learn pipeline training four independent binary classifiers (E/I, N/S, T/F, J/P) using class_weight="balanced" on user-level stratified splits.',
    icon: BrainCircuit,
    bgHex: '#F4EFF7',
    borderHex: '#E1D2EB',
    inkHex: '#4F3460',
  },
  {
    id: 'app',
    label: 'PersonaLens',
    shortDesc: 'Interactive discovery UI',
    detail:
      'Connects via POST /api/analyze for single-text and multi-post inference without storing user text, paired with this BI dashboard for transparent evaluation.',
    icon: Sparkles,
    bgHex: '#FDF6E6',
    borderHex: '#F2DFB0',
    inkHex: '#7A530B',
  },
];

export const DatasetOverviewSection: React.FC<DatasetOverviewSectionProps> = ({
  overviewState,
}) => {
  const [selectedStageId, setSelectedStageId] = useState<string>('etl');
  const metrics = overviewState.data;
  const activeStage =
    PIPELINE_STAGES.find((stage) => stage.id === selectedStageId) || PIPELINE_STAGES[1];

  return (
    <section className="space-y-8" aria-labelledby="overview-section-heading">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div className="space-y-1">
          <h2
            id="overview-section-heading"
            className="font-display text-2xl font-bold text-[#1E2430]"
          >
            01. Dataset Overview
          </h2>
          <p className="text-sm text-[#525B6E]">
            Verified corpus scope from the main <span className="font-mono text-xs">label_clean</span> dataset and repository documentation.
          </p>
        </div>
        <span className="text-xs text-[#6B7280]">
          Source: {overviewState.sourceAttribution}
        </span>
      </div>

      {/* Four KPI Cards */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="rounded-3xl bg-white border border-[#E1D2EB] p-6 shadow-[0_8px_24px_-12px_rgba(30,36,48,0.06)] transition-transform duration-200 hover:-translate-y-0.5 space-y-2">
            <div className="text-xs font-semibold text-[#4F3460]">Total Users</div>
            <div className="font-display text-3xl sm:text-4xl font-bold text-[#1E2430] tabular-nums">
              {metrics.totalUsers.toLocaleString('en-US')}
            </div>
            <p className="text-xs text-[#6B7280]">
              Unique forum authors in <span className="font-mono">dim_user</span>
            </p>
          </div>

          <div className="rounded-3xl bg-white border border-[#C7E2ED] p-6 shadow-[0_8px_24px_-12px_rgba(30,36,48,0.06)] transition-transform duration-200 hover:-translate-y-0.5 space-y-2">
            <div className="text-xs font-semibold text-[#205B70]">Cleaned Posts</div>
            <div className="font-display text-3xl sm:text-4xl font-bold text-[#1E2430] tabular-nums">
              {metrics.cleanedPosts.toLocaleString('en-US')}
            </div>
            <p className="text-xs text-[#6B7280]">
              Rows retained in <span className="font-mono">fact_post</span> (<span className="font-mono">label_clean</span>)
            </p>
          </div>

          <div className="rounded-3xl bg-white border border-[#F2DFB0] p-6 shadow-[0_8px_24px_-12px_rgba(30,36,48,0.06)] transition-transform duration-200 hover:-translate-y-0.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#7A530B]">
              <span>Personality Types</span>
              <TermTooltip
                term={TECHNICAL_GLOSSARY.classImbalance.term}
                definition={TECHNICAL_GLOSSARY.classImbalance.definition}
              />
            </div>
            <div className="font-display text-3xl sm:text-4xl font-bold text-[#1E2430] tabular-nums">
              {metrics.personalityTypes}
            </div>
            <p className="text-xs text-[#6B7280]">
              Self-reported MBTI labels across 4 groups
            </p>
          </div>

          <div className="rounded-3xl bg-white border border-[#C8E9D8] p-6 shadow-[0_8px_24px_-12px_rgba(30,36,48,0.06)] transition-transform duration-200 hover:-translate-y-0.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1D6446]">
              <span>Detected Leakage After Cleaning</span>
              <TermTooltip
                term={TECHNICAL_GLOSSARY.dataLeakage.term}
                definition={TECHNICAL_GLOSSARY.dataLeakage.definition}
              />
            </div>
            <div className="font-display text-3xl sm:text-4xl font-bold text-[#1D6446] tabular-nums">
              {metrics.detectedLeakageAfterPct}%
            </div>
            <p className="text-xs text-[#6B7280]">
              Measured by implemented cleaning rules
            </p>
          </div>
        </div>
      )}

      {/* Source Attribution & Platform Clarity */}
      {metrics && (
        <div className="rounded-3xl bg-white border border-black/[0.08] p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-5 space-y-2">
            <div className="text-xs font-semibold text-[#205B70]">Primary Data Source</div>
            <h3 className="font-display text-xl sm:text-2xl font-bold text-[#1E2430]">
              {metrics.sourceName}
            </h3>
            <p className="text-xs text-[#6B7280]">
              Preprocessed corpus: <span className="font-mono">personalitycafe/label_clean+leak_masked</span>
            </p>
          </div>
          <div className="lg:col-span-7 text-sm text-[#4B5364] leading-relaxed space-y-2">
            <p>{metrics.sourcePlatformNote}</p>
            <p className="text-xs text-[#6B7280]">
              Split policy: user-level stratified split (no overlapping authors between train, validation, and test). Predictions evaluate linguistic correlation with self-reported forum labels, not clinical diagnosis.
            </p>
          </div>
        </div>
      )}

      {/* Visual Interactive Data Pipeline */}
      <div className="rounded-3xl bg-white border border-black/[0.08] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-xl font-bold text-[#1E2430]">
              End-to-End Data & ML Architecture
            </h3>
            <TermTooltip
              term={TECHNICAL_GLOSSARY.starSchema.term}
              definition={TECHNICAL_GLOSSARY.starSchema.definition}
            />
          </div>
          <span className="text-xs text-[#6B7280]">Select a stage to inspect its role</span>
        </div>

        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {PIPELINE_STAGES.map((stage, index) => {
            const Icon = stage.icon;
            const isSelected = stage.id === activeStage.id;
            return (
              <React.Fragment key={stage.id}>
                <button
                  type="button"
                  onClick={() => setSelectedStageId(stage.id)}
                  className={`flex-1 text-left rounded-2xl p-4 border transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#33A474] ${
                    isSelected
                      ? 'shadow-md -translate-y-0.5'
                      : 'hover:-translate-y-0.5 opacity-90 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: stage.bgHex,
                    borderColor: isSelected ? stage.inkHex : stage.borderHex,
                  }}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <div
                      className="w-8 h-8 rounded-xl bg-white/80 flex items-center justify-center shrink-0"
                      style={{ color: stage.inkHex }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span
                      className="font-display text-sm font-bold leading-snug"
                      style={{ color: stage.inkHex }}
                    >
                      {stage.label}
                    </span>
                  </div>
                  <div className="text-xs text-[#4B5364]">{stage.shortDesc}</div>
                </button>

                {index < PIPELINE_STAGES.length - 1 && (
                  <div
                    aria-hidden="true"
                    className="flex items-center justify-center text-[#9CA3AF] shrink-0 py-1 lg:py-0"
                  >
                    <ArrowRight className="w-4 h-4 rotate-90 lg:rotate-0" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Selected Stage Details */}
        <div className="rounded-2xl bg-[#FAF9F6] border border-black/[0.06] px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="text-xs font-semibold" style={{ color: activeStage.inkHex }}>
              {activeStage.label} · {activeStage.shortDesc}
            </div>
            <p className="text-sm text-[#4B5364] leading-relaxed">{activeStage.detail}</p>
          </div>
        </div>
      </div>
    </section>
  );
};
