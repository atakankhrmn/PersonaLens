import React, { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { TECHNICAL_GLOSSARY } from '../../data/etlReports';
import { ModelInsightsPayload } from '../../services/insights';
import { DatasetSplit, InsightsDataState } from '../../types/insights';
import { TermTooltip } from './TermTooltip';

interface ModelPerformanceSectionProps {
  modelsState: InsightsDataState<ModelInsightsPayload>;
}

const PLANNED_CLASSIFIERS = [
  {
    axis: 'E / I',
    title: 'Extraversion vs. Introversion',
    encoding: 'I = 0 · E = 1',
    accent: '#88619A',
    bg: '#F7F2FA',
    border: '#E1D2EB',
  },
  {
    axis: 'N / S',
    title: 'Intuition vs. Sensing',
    encoding: 'S = 0 · N = 1',
    accent: '#33A474',
    bg: '#F0F9F4',
    border: '#C8E9D8',
  },
  {
    axis: 'T / F',
    title: 'Thinking vs. Feeling',
    encoding: 'F = 0 · T = 1',
    accent: '#4298B4',
    bg: '#F0F7FA',
    border: '#C7E2ED',
  },
  {
    axis: 'J / P',
    title: 'Judging vs. Perceiving',
    encoding: 'P = 0 · J = 1',
    accent: '#D99B26',
    bg: '#FEF9EC',
    border: '#F2DFB0',
  },
];

export const ModelPerformanceSection: React.FC<ModelPerformanceSectionProps> = ({
  modelsState,
}) => {
  const [selectedSplit, setSelectedSplit] = useState<Exclude<DatasetSplit, 'all'>>('validation');

  const modelsForSplit = useMemo(() => {
    if (!modelsState.data?.models) return [];
    return modelsState.data.models.filter((m) => m.split === selectedSplit);
  }, [modelsState.data, selectedSplit]);

  const activeModel = modelsForSplit[0] || null;
  const hasModelResults = modelsState.status === 'ready' && activeModel !== null;

  return (
    <section className="space-y-8" aria-labelledby="model-performance-heading">
      {/* Header + Split Selector */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1">
          <h2
            id="model-performance-heading"
            className="font-display text-2xl font-bold text-[#1E2430]"
          >
            04. Model Performance
          </h2>
          <p className="text-sm text-[#525B6E]">
            Evaluation workspace for four binary classifiers (baseline TF-IDF + Logistic Regression; planned comparison TF-IDF + Linear SVM).
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Evaluation split"
          className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#F0EFEA] border border-black/[0.05] self-start"
        >
          {(['train', 'validation', 'test'] as const).map((split) => {
            const active = selectedSplit === split;
            return (
              <button
                key={split}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedSplit(split)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  active
                    ? 'bg-white text-[#1E2430] shadow-xs'
                    : 'text-[#5A6375] hover:text-[#1E2430]'
                }`}
              >
                {split}
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty State Banner when real training/validation results do not exist yet */}
      {!hasModelResults && (
        <div className="rounded-3xl bg-white border border-black/[0.08] p-8 sm:p-10 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#F4EFF7] border border-[#E1D2EB] flex items-center justify-center text-[#4F3460]">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div className="space-y-2 max-w-xl mx-auto">
            <h3 className="font-display text-xl font-bold text-[#1E2430]">
              Model evaluation results will appear here once training and validation are complete.
            </h3>
            <p className="text-sm text-[#525B6E] leading-relaxed">
              No synthetic evaluation scores are displayed. When baseline models are trained and registered via <span className="font-mono text-xs">src.dw.predictions.write_predictions</span>, this view will populate from <span className="font-mono text-xs">dw.dim_model</span>, <span className="font-mono text-xs">dw.fact_prediction</span>, <span className="font-mono text-xs">dw.vw_model_performance</span>, and <span className="font-mono text-xs">dw.vw_confusion_matrix</span>.
            </p>
          </div>
          <div className="text-xs font-mono text-[#6B7280]">
            Planned endpoint: {modelsState.plannedEndpoint} · Split selected: {selectedSplit}
          </div>
        </div>
      )}

      {/* Five Headline Metric Slots (Macro-F1, Balanced Accuracy, Precision, Recall, Full 16-Type Accuracy) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-2xl bg-white border border-black/[0.08] p-5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#525B6E]">
            <span>Macro-F1</span>
            <TermTooltip
              term={TECHNICAL_GLOSSARY.macroF1.term}
              definition={TECHNICAL_GLOSSARY.macroF1.definition}
            />
          </div>
          <div className="font-display text-2xl font-bold text-[#1E2430] tabular-nums">
            {hasModelResults && activeModel.macro_f1 != null
              ? `${(activeModel.macro_f1 * 100).toFixed(1)}%`
              : '—'}
          </div>
          <div className="text-[11px] text-[#6B7280]">
            {hasModelResults ? `${activeModel.model_name} (${selectedSplit})` : 'Awaiting training'}
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-black/[0.08] p-5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#525B6E]">
            <span>Balanced Accuracy</span>
            <TermTooltip
              term={TECHNICAL_GLOSSARY.balancedAccuracy.term}
              definition={TECHNICAL_GLOSSARY.balancedAccuracy.definition}
            />
          </div>
          <div className="font-display text-2xl font-bold text-[#1E2430] tabular-nums">
            {hasModelResults && activeModel.balanced_accuracy != null
              ? `${(activeModel.balanced_accuracy * 100).toFixed(1)}%`
              : '—'}
          </div>
          <div className="text-[11px] text-[#6B7280]">
            {hasModelResults ? 'Class-balanced recall' : 'Awaiting training'}
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-black/[0.08] p-5 space-y-1.5">
          <div className="text-xs font-semibold text-[#525B6E]">Precision</div>
          <div className="font-display text-2xl font-bold text-[#1E2430] tabular-nums">
            {hasModelResults && activeModel.precision != null
              ? `${(activeModel.precision * 100).toFixed(1)}%`
              : '—'}
          </div>
          <div className="text-[11px] text-[#6B7280]">
            {hasModelResults ? 'Macro-averaged' : 'Awaiting training'}
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-black/[0.08] p-5 space-y-1.5">
          <div className="text-xs font-semibold text-[#525B6E]">Recall</div>
          <div className="font-display text-2xl font-bold text-[#1E2430] tabular-nums">
            {hasModelResults && activeModel.recall != null
              ? `${(activeModel.recall * 100).toFixed(1)}%`
              : '—'}
          </div>
          <div className="text-[11px] text-[#6B7280]">
            {hasModelResults ? 'Macro-averaged' : 'Awaiting training'}
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-black/[0.08] p-5 space-y-1.5">
          <div className="text-xs font-semibold text-[#525B6E]">Full 16-Type Accuracy</div>
          <div className="font-display text-2xl font-bold text-[#1E2430] tabular-nums">
            {hasModelResults ? `${(activeModel.type_accuracy * 100).toFixed(1)}%` : '—'}
          </div>
          <div className="text-[11px] text-[#6B7280]">
            {hasModelResults ? 'Exact 4-letter match' : 'Awaiting training'}
          </div>
        </div>
      </div>

      {/* Four Binary Dimension Classifier Slots */}
      <div className="rounded-3xl bg-white border border-black/[0.08] p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
          <div>
            <h3 className="font-display text-lg font-bold text-[#1E2430]">
              Four Dimension-Level Classifiers
            </h3>
            <p className="text-xs text-[#6B7280]">
              Independent binary classifiers combined into the 16-type prediction
            </p>
          </div>
          <span className="font-mono text-[11px] text-[#6B7280]">dw.vw_model_performance</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANNED_CLASSIFIERS.map((dim) => {
            const metricVal = hasModelResults
              ? dim.axis === 'E / I'
                ? activeModel.ei_accuracy
                : dim.axis === 'N / S'
                  ? activeModel.ns_accuracy
                  : dim.axis === 'T / F'
                    ? activeModel.ft_accuracy
                    : activeModel.jp_accuracy
              : null;

            return (
              <div
                key={dim.axis}
                className="rounded-2xl border p-5 space-y-2"
                style={{ backgroundColor: dim.bg, borderColor: dim.border }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold" style={{ color: dim.accent }}>
                    {dim.axis}
                  </span>
                  <span className="font-mono text-[11px] text-[#525B6E]">{dim.encoding}</span>
                </div>
                <div className="font-display text-sm font-bold text-[#1E2430]">{dim.title}</div>
                <div className="pt-2 border-t border-black/[0.06] flex items-baseline justify-between">
                  <span className="text-xs text-[#525B6E]">Accuracy</span>
                  <span className="font-mono text-base font-bold text-[#1E2430] tabular-nums">
                    {metricVal != null ? `${(metricVal * 100).toFixed(1)}%` : 'Pending'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Model Comparison & 16x16 Confusion Matrix Placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white border border-black/[0.08] p-6 space-y-4">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h3 className="font-display text-lg font-bold text-[#1E2430]">
                Model Comparison
              </h3>
              <p className="text-xs text-[#6B7280]">
                Baseline TF-IDF + Logistic Regression vs. TF-IDF + Linear SVM & Majority Baseline
              </p>
            </div>
            <span className="font-mono text-[11px] text-[#6B7280]">dw.dim_model</span>
          </div>

          {hasModelResults ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse tabular-nums">
                <thead>
                  <tr className="border-b border-black/[0.06] text-[#525B6E]">
                    <th className="py-2.5 pr-3">Model</th>
                    <th className="py-2.5 px-2 text-right">Type Acc</th>
                    <th className="py-2.5 px-2 text-right">E/I</th>
                    <th className="py-2.5 px-2 text-right">N/S</th>
                    <th className="py-2.5 px-2 text-right">T/F</th>
                    <th className="py-2.5 pl-2 text-right">J/P</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.05]">
                  {modelsForSplit.map((row) => (
                    <tr key={`${row.model_name}-${row.model_version}`}>
                      <td className="py-2.5 pr-3 font-semibold text-[#1E2430]">
                        {row.model_name} · {row.model_version}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        {(row.type_accuracy * 100).toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        {(row.ei_accuracy * 100).toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        {(row.ns_accuracy * 100).toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        {(row.ft_accuracy * 100).toFixed(1)}%
                      </td>
                      <td className="py-2.5 pl-2 text-right">
                        {(row.jp_accuracy * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-black/[0.12] bg-[#FAF9F6] p-6 text-center space-y-2">
              <div className="text-sm font-semibold text-[#1E2430]">
                Model comparison table awaiting runs
              </div>
              <p className="text-xs text-[#525B6E] leading-relaxed">
                Planned models: Majority-Class Baseline, TF-IDF + Logistic Regression (<span className="font-mono">class_weight="balanced"</span>), and TF-IDF + Linear SVM.
              </p>
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white border border-black/[0.08] p-6 space-y-4">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h3 className="font-display text-lg font-bold text-[#1E2430]">
                16-Type Confusion Matrix
              </h3>
              <p className="text-xs text-[#6B7280]">
                True self-reported type vs. predicted type per user
              </p>
            </div>
            <span className="font-mono text-[11px] text-[#6B7280]">dw.vw_confusion_matrix</span>
          </div>

          <div className="rounded-2xl border border-dashed border-black/[0.12] bg-[#FAF9F6] p-6 text-center space-y-2">
            <div className="text-sm font-semibold text-[#1E2430]">
              Confusion matrix awaiting predictions
            </div>
            <p className="text-xs text-[#525B6E] leading-relaxed">
              Model evaluation results will appear here once training and validation are complete and <span className="font-mono">dw.fact_prediction</span> is populated.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
