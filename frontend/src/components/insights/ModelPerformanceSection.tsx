import React, { useMemo, useState } from 'react';
import { BarChart3, Info } from 'lucide-react';
import { TECHNICAL_GLOSSARY } from '../../data/etlReports';
import { PERSONALITY_GROUPS, PERSONALITY_MAP, PERSONALITY_TYPES } from '../../data/personalities';
import { MbtiCode } from '../../types/personality';
import { ModelInsightsPayload } from '../../services/insights';
import { DimensionKey, InsightsDataState, ModelPerformanceRow } from '../../types/insights';
import { TermTooltip } from './TermTooltip';

interface ModelPerformanceSectionProps {
  modelsState: InsightsDataState<ModelInsightsPayload>;
}

type EvalSplit = 'validation' | 'test';

const DIMENSIONS: {
  key: DimensionKey;
  axis: string;
  title: string;
  encoding: string;
  pos: string;
  neg: string;
  accent: string;
  bg: string;
  border: string;
}[] = [
  { key: 'EI', axis: 'E / I', title: 'Extraversion vs. Introversion', encoding: 'I = 0 · E = 1', pos: 'E', neg: 'I', accent: '#88619A', bg: '#F7F2FA', border: '#E1D2EB' },
  { key: 'NS', axis: 'N / S', title: 'Intuition vs. Sensing', encoding: 'S = 0 · N = 1', pos: 'N', neg: 'S', accent: '#33A474', bg: '#F0F9F4', border: '#C8E9D8' },
  { key: 'FT', axis: 'T / F', title: 'Thinking vs. Feeling', encoding: 'F = 0 · T = 1', pos: 'T', neg: 'F', accent: '#4298B4', bg: '#F0F7FA', border: '#C7E2ED' },
  { key: 'JP', axis: 'J / P', title: 'Judging vs. Perceiving', encoding: 'P = 0 · J = 1', pos: 'J', neg: 'P', accent: '#D99B26', bg: '#FEF9EC', border: '#F2DFB0' },
];

const TYPE_ORDER = PERSONALITY_TYPES.map((t) => t.code);
const PLACEHOLDER_TOKENS = new Set(['mbti_type', 'mbti_term', 'typology_term', 'cognitive_function', 'post_sep']);

const pct = (v: number | null | undefined, digits = 1) =>
  v == null ? '—' : `${(v * 100).toFixed(digits)}%`;
const dec = (v: number | null | undefined, digits = 3) => (v == null ? '—' : v.toFixed(digits));
const modelId = (m: ModelPerformanceRow) => `${m.model_name} ${m.model_version}`;
const meanDimF1 = (m: ModelPerformanceRow) =>
  DIMENSIONS.reduce((s, d) => s + (m.dimensions?.[d.key]?.macro_f1 ?? 0), 0) / DIMENSIONS.length;

function prettyModelName(m: ModelPerformanceRow): string {
  if (m.model_name === 'majority_baseline') return 'Majority baseline';
  return `${m.algorithm || m.model_name} · ${m.model_version}`;
}

const MetricCard: React.FC<{
  label: string;
  value: string;
  baseline?: string;
  hint?: React.ReactNode;
  tooltip?: { term: string; definition: string };
}> = ({ label, value, baseline, hint, tooltip }) => (
  <div className="rounded-2xl bg-white border border-black/[0.08] p-5 space-y-1.5">
    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#525B6E]">
      <span>{label}</span>
      {tooltip && <TermTooltip term={tooltip.term} definition={tooltip.definition} />}
    </div>
    <div className="font-display text-2xl font-bold text-[#1E2430] tabular-nums">{value}</div>
    {baseline && (
      <div className="text-[11px] text-[#6B7280] tabular-nums">Majority baseline: {baseline}</div>
    )}
    {hint && <div className="text-[11px] text-[#6B7280]">{hint}</div>}
  </div>
);

export const ModelPerformanceSection: React.FC<ModelPerformanceSectionProps> = ({
  modelsState,
}) => {
  const [selectedSplit, setSelectedSplit] = useState<EvalSplit>('test');
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  const data = modelsState.data;
  const modelsForSplit = useMemo(
    () => (data?.models ?? []).filter((m) => m.split === selectedSplit),
    [data, selectedSplit]
  );
  const baseline = useMemo(
    () => (data?.baselines ?? []).find((b) => b.split === selectedSplit) ?? null,
    [data, selectedSplit]
  );
  const activeModel =
    modelsForSplit.find((m) => modelId(m) === selectedModelId) ?? modelsForSplit[0] ?? null;
  const activeId = activeModel ? modelId(activeModel) : null;
  const hasModelResults = modelsState.status === 'ready' && activeModel !== null;

  const confusion = useMemo(() => {
    if (!data || !activeModel) return null;
    const cells = data.confusionMatrix.filter(
      (c) =>
        c.split === selectedSplit &&
        c.model_name === activeModel.model_name &&
        c.model_version === activeModel.model_version
    );
    if (cells.length === 0) return null;
    const grid = new Map<string, number>();
    const rowTotals = new Map<string, number>();
    let total = 0;
    for (const c of cells) {
      grid.set(`${c.true_type}|${c.predicted_type}`, c.users);
      rowTotals.set(c.true_type, (rowTotals.get(c.true_type) ?? 0) + c.users);
      total += c.users;
    }
    return { grid, rowTotals, total };
  }, [data, activeModel, selectedSplit]);

  // Per-type precision / recall / F1 from the confusion matrix (same definition as
  // dw.vw_model_type_metrics and scikit-learn: types never predicted get precision 0).
  const perType = useMemo(() => {
    if (!confusion) return null;
    const rows = TYPE_ORDER.map((type) => {
      const support = confusion.rowTotals.get(type) ?? 0;
      const predicted = TYPE_ORDER.reduce((s, t) => s + (confusion.grid.get(`${t}|${type}`) ?? 0), 0);
      const correct = confusion.grid.get(`${type}|${type}`) ?? 0;
      const precision = predicted ? correct / predicted : 0;
      const recall = support ? correct / support : 0;
      const f1 = support + predicted ? (2 * correct) / (support + predicted) : 0;
      return { type, support, predicted, correct, precision, recall, f1, inScope: support + predicted > 0 };
    }).sort((a, b) => b.support - a.support);
    const scoped = rows.filter((r) => r.inScope);
    const macroF1 = scoped.reduce((s, r) => s + r.f1, 0) / (scoped.length || 1);
    return { rows, macroF1 };
  }, [confusion]);

  const topFeatures = activeId ? data?.topFeatures?.[activeId] : undefined;

  return (
    <section className="space-y-8" aria-labelledby="model-performance-heading">
      {/* Header + selectors */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="space-y-1">
          <h2 id="model-performance-heading" className="font-display text-2xl font-bold text-[#1E2430]">
            05. Model Performance
          </h2>
          <p className="text-sm text-[#525B6E]">
            Four binary classifiers (TF-IDF + Logistic Regression, compared with TF-IDF + Linear SVM), combined into the 16-type prediction.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {modelsForSplit.length > 1 && (
            <div role="tablist" aria-label="Model" className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#F0EFEA] border border-black/[0.05]">
              {modelsForSplit.map((m) => {
                const active = modelId(m) === activeId;
                return (
                  <button
                    key={modelId(m)}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSelectedModelId(modelId(m))}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      active ? 'bg-white text-[#1E2430] shadow-xs' : 'text-[#5A6375] hover:text-[#1E2430]'
                    }`}
                  >
                    {m.model_name === 'tfidf_logreg' ? 'LogReg' : m.model_name === 'tfidf_svm' ? 'Linear SVM' : m.model_name}
                  </button>
                );
              })}
            </div>
          )}
          <div role="tablist" aria-label="Evaluation split" className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#F0EFEA] border border-black/[0.05]">
            {(['test', 'validation'] as const).map((split) => {
              const active = selectedSplit === split;
              return (
                <button
                  key={split}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedSplit(split)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                    active ? 'bg-white text-[#1E2430] shadow-xs' : 'text-[#5A6375] hover:text-[#1E2430]'
                  }`}
                >
                  {split}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-[#ECF5F8] border border-[#C7E2ED] px-5 py-3.5 flex items-start gap-2.5 text-xs sm:text-sm text-[#205B70]">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          <strong>Test</strong> = held-out users, evaluated once for the final numbers; <strong>validation</strong> = used to tune <span className="font-mono">C</span>. Train results are not shown: they are in-sample and would look unrealistically good. Main metrics are Macro-F1 and Balanced Accuracy because the classes are imbalanced (77% I, 86% N).
        </span>
      </div>

      {!hasModelResults && (
        <div className="rounded-3xl bg-white border border-black/[0.08] p-8 sm:p-10 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#F4EFF7] border border-[#E1D2EB] flex items-center justify-center text-[#4F3460]">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div className="space-y-2 max-w-xl mx-auto">
            <h3 className="font-display text-xl font-bold text-[#1E2430]">
              Model results are not available
            </h3>
            <p className="text-sm text-[#525B6E] leading-relaxed">
              Start the Python API (<span className="font-mono text-xs">python -m src.api</span>). It serves the metrics from <span className="font-mono text-xs">reports/models/*.json</span> and the confusion matrix from <span className="font-mono text-xs">dw.vw_confusion_matrix</span>. No synthetic scores are displayed.
            </p>
          </div>
          <div className="text-xs font-mono text-[#6B7280]">Endpoint: {modelsState.plannedEndpoint}</div>
        </div>
      )}

      {hasModelResults && activeModel && (
        <>
          {/* Headline 16-type metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="16-Type Macro-F1"
              value={pct(activeModel.macro_f1)}
              baseline={pct(baseline?.macro_f1)}
              tooltip={TECHNICAL_GLOSSARY.macroF1}
            />
            <MetricCard
              label="Exact 4-Letter Match"
              value={pct(activeModel.type_accuracy)}
              baseline={baseline ? `${pct(baseline.type_accuracy)} (always ${baseline.majority_type ?? 'INFP'})` : undefined}
            />
            <MetricCard
              label="Letters Correct (of 4)"
              value={dec(activeModel.mean_letters_correct, 2)}
              baseline={dec(baseline?.mean_letters_correct, 2)}
            />
            <MetricCard
              label="Mean Axis Macro-F1"
              value={pct(meanDimF1(activeModel))}
              baseline={baseline ? pct(meanDimF1(baseline)) : undefined}
              tooltip={TECHNICAL_GLOSSARY.macroF1}
              hint="Average of the four binary classifiers"
            />
          </div>

          {/* Four dimension classifiers */}
          <div className="rounded-3xl bg-white border border-black/[0.08] p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
              <div>
                <h3 className="font-display text-lg font-bold text-[#1E2430]">Four Dimension-Level Classifiers</h3>
                <p className="text-xs text-[#6B7280]">
                  {prettyModelName(activeModel)} · {selectedSplit} split · 1,735 users
                </p>
              </div>
              <span className="font-mono text-[11px] text-[#6B7280]">reports/models/{activeModel.model_name}_{activeModel.model_version}.json</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {DIMENSIONS.map((dim) => {
                const m = activeModel.dimensions?.[dim.key];
                const b = baseline?.dimensions?.[dim.key];
                return (
                  <div key={dim.key} className="rounded-2xl border p-5 space-y-2" style={{ backgroundColor: dim.bg, borderColor: dim.border }}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold" style={{ color: dim.accent }}>{dim.axis}</span>
                      <span className="font-mono text-[11px] text-[#525B6E]">{dim.encoding}</span>
                    </div>
                    <div className="font-display text-sm font-bold text-[#1E2430]">{dim.title}</div>
                    <div className="pt-2 border-t border-black/[0.06] space-y-1.5 text-xs">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[#525B6E]">Macro-F1</span>
                        <span className="font-mono text-base font-bold text-[#1E2430] tabular-nums">{dec(m?.macro_f1)}</span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-[#525B6E]">Balanced Acc.</span>
                        <span className="font-mono font-semibold text-[#1E2430] tabular-nums">{dec(m?.balanced_accuracy)}</span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-[#525B6E]">Accuracy</span>
                        <span className="font-mono text-[#374151] tabular-nums">{pct(m?.accuracy)}</span>
                      </div>
                      <div className="flex items-baseline justify-between text-[#6B7280]">
                        <span>Baseline F1 / Acc.</span>
                        <span className="font-mono tabular-nums">{dec(b?.macro_f1)} / {pct(b?.accuracy)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-[#6B7280] leading-relaxed">
              Plain accuracy looks high for E/I and N/S only because most users are I and N: always answering "N" already gives {pct(baseline?.dimensions?.NS?.accuracy)} accuracy. Macro-F1 and Balanced Accuracy show what the model adds over that. N/S is the weakest axis.
            </p>
          </div>

          {/* Comparison table */}
          <div className="rounded-3xl bg-white border border-black/[0.08] p-6 space-y-4">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <h3 className="font-display text-lg font-bold text-[#1E2430]">Model Comparison (Macro-F1)</h3>
                <p className="text-xs text-[#6B7280]">TF-IDF + Logistic Regression vs. TF-IDF + Linear SVM vs. majority-class baseline · {selectedSplit}</p>
              </div>
              <span className="font-mono text-[11px] text-[#6B7280]">dw.dim_model</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse tabular-nums">
                <thead>
                  <tr className="border-b border-black/[0.06] text-[#525B6E]">
                    <th className="py-2.5 pr-3">Model</th>
                    <th className="py-2.5 px-2 text-right">E/I</th>
                    <th className="py-2.5 px-2 text-right">N/S</th>
                    <th className="py-2.5 px-2 text-right">T/F</th>
                    <th className="py-2.5 px-2 text-right">J/P</th>
                    <th className="py-2.5 px-2 text-right">16 types</th>
                    <th className="py-2.5 pl-2 text-right">Exact match</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.05]">
                  {[...modelsForSplit, ...(baseline ? [baseline] : [])].map((row) => {
                    const isActive = row === activeModel;
                    return (
                      <tr key={`${row.model_name}-${row.model_version}`} className={isActive ? 'bg-[#F7F5EF]' : ''}>
                        <td className={`py-2.5 pr-3 ${row.model_name === 'majority_baseline' ? 'text-[#6B7280]' : 'font-semibold text-[#1E2430]'}`}>
                          {prettyModelName(row)}
                        </td>
                        {DIMENSIONS.map((d) => (
                          <td key={d.key} className="py-2.5 px-2 text-right">{dec(row.dimensions?.[d.key]?.macro_f1)}</td>
                        ))}
                        <td className="py-2.5 px-2 text-right">{dec(row.macro_f1)}</td>
                        <td className="py-2.5 pl-2 text-right">{pct(row.type_accuracy)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Confusion matrix */}
          <div className="rounded-3xl bg-white border border-black/[0.08] p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
              <div>
                <h3 className="font-display text-lg font-bold text-[#1E2430]">16-Type Confusion Matrix</h3>
                <p className="text-xs text-[#6B7280]">
                  Rows: self-reported type · columns: predicted type · shading = share of the row · last column = recall
                </p>
              </div>
              <span className="font-mono text-[11px] text-[#6B7280]">dw.vw_confusion_matrix</span>
            </div>

            {confusion ? (
              <div className="overflow-x-auto">
                <table className="border-collapse text-[10px] tabular-nums mx-auto">
                  <thead>
                    <tr>
                      <th className="p-1 text-right text-[#6B7280] font-medium">true \ pred</th>
                      {TYPE_ORDER.map((t) => (
                        <th key={t} className="p-1 font-mono font-semibold text-[#525B6E] [writing-mode:vertical-rl] rotate-180">{t}</th>
                      ))}
                      <th className="p-1 pl-2 text-[#525B6E] font-semibold">n</th>
                      <th className="p-1 text-[#525B6E] font-semibold">recall</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TYPE_ORDER.map((trueType) => {
                      const rowTotal = confusion.rowTotals.get(trueType) ?? 0;
                      const correct = confusion.grid.get(`${trueType}|${trueType}`) ?? 0;
                      return (
                        <tr key={trueType}>
                          <th className="p-1 pr-2 font-mono font-semibold text-right text-[#525B6E]">{trueType}</th>
                          {TYPE_ORDER.map((predType) => {
                            const n = confusion.grid.get(`${trueType}|${predType}`) ?? 0;
                            const share = rowTotal ? n / rowTotal : 0;
                            const diag = trueType === predType;
                            const color = diag ? '51,164,116' : '136,97,154';
                            return (
                              <td
                                key={predType}
                                title={`true ${trueType} → predicted ${predType}: ${n} users (${(share * 100).toFixed(1)}% of ${trueType})`}
                                className={`w-7 h-7 text-center border border-white ${diag ? 'font-bold' : ''}`}
                                style={{
                                  backgroundColor: n ? `rgba(${color},${0.12 + share * 0.88})` : '#F7F7F5',
                                  color: share > 0.45 ? '#FFFFFF' : '#1E2430',
                                }}
                              >
                                {n || ''}
                              </td>
                            );
                          })}
                          <td className="p-1 pl-2 text-right text-[#525B6E]">{rowTotal}</td>
                          <td className="p-1 text-right font-semibold text-[#1E2430]">{rowTotal ? `${Math.round((correct / rowTotal) * 100)}%` : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="text-[11px] text-[#6B7280] mt-3 text-center">
                  {confusion.total.toLocaleString('en-US')} users. Rare types (ES**, under 2% of users each) are seldom predicted correctly; most errors are one letter away.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-black/[0.12] bg-[#FAF9F6] p-6 text-center space-y-2">
                <div className="text-sm font-semibold text-[#1E2430]">Confusion matrix needs the data warehouse</div>
                <p className="text-xs text-[#525B6E] leading-relaxed">
                  PostgreSQL is not reachable, or <span className="font-mono">dw.fact_prediction</span> has no rows for this model. Run <span className="font-mono">python -m src.models.train --final-test</span> with the database up.
                </p>
              </div>
            )}
          </div>

          {/* Per-type precision / recall / F1 */}
          {perType && (
            <div className="rounded-3xl bg-white border border-black/[0.08] p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
                <div>
                  <h3 className="font-display text-lg font-bold text-[#1E2430]">Results per Type</h3>
                  <p className="text-xs text-[#6B7280]">
                    Precision = share of the model's answers for that type that were right · Recall = share of users of that type that were found · sorted by number of users
                  </p>
                </div>
                <span className="font-mono text-[11px] text-[#6B7280]">dw.vw_confusion_matrix</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs tabular-nums">
                  <thead>
                    <tr className="text-left text-[#525B6E] border-b border-black/[0.06]">
                      <th className="py-2 pr-3">Type</th>
                      <th className="py-2 px-2 text-right">Users</th>
                      <th className="py-2 px-2 text-right">Predicted</th>
                      <th className="py-2 px-2 text-right">Correct</th>
                      <th className="py-2 px-2 text-right">Precision</th>
                      <th className="py-2 px-2 text-right">Recall</th>
                      <th className="py-2 pl-2 w-[32%]">F1</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04]">
                    {perType.rows.map((r) => {
                      const group = PERSONALITY_GROUPS[PERSONALITY_MAP[r.type as MbtiCode].group];
                      return (
                        <tr key={r.type}>
                          <td className="py-1.5 pr-3 font-mono font-bold" style={{ color: group.inkHex }}>{r.type}</td>
                          <td className="py-1.5 px-2 text-right text-[#374151]">{r.support}</td>
                          <td className="py-1.5 px-2 text-right text-[#374151]">{r.predicted}</td>
                          <td className="py-1.5 px-2 text-right text-[#374151]">{r.correct}</td>
                          <td className="py-1.5 px-2 text-right text-[#1E2430]">{pct(r.precision, 0)}</td>
                          <td className="py-1.5 px-2 text-right text-[#1E2430]">{pct(r.recall, 0)}</td>
                          <td className="py-1.5 pl-2">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2.5 rounded-full bg-[#F0EFEA] overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${r.f1 * 100}%`, backgroundColor: group.accentHex }} />
                              </div>
                              <span className="w-10 text-right font-semibold text-[#1E2430]">{dec(r.f1, 2)}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-[#6B7280] leading-relaxed">
                16-type Macro-F1 = average F1 of these types = <span className="font-semibold text-[#1E2430]">{dec(perType.macroF1, 3)}</span>. Common types (INFP, INFJ, INTP) are found most often; rare E-S types are almost never predicted, which keeps the Macro-F1 low.
              </p>
            </div>
          )}

          {/* Top words per letter */}
          {topFeatures && Object.keys(topFeatures).length > 0 && (
            <div className="rounded-3xl bg-white border border-black/[0.08] p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
                <div>
                  <h3 className="font-display text-lg font-bold text-[#1E2430]">Words That Push Towards Each Letter</h3>
                  <p className="text-xs text-[#6B7280]">Largest TF-IDF weights of {prettyModelName(activeModel)} (fitted on the train split)</p>
                </div>
                <span className="font-mono text-[11px] text-[#6B7280]">top_features</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DIMENSIONS.map((dim) => {
                  const f = topFeatures[dim.key];
                  if (!f) return null;
                  return (
                    <div key={dim.key} className="rounded-2xl border p-4 space-y-3" style={{ backgroundColor: dim.bg, borderColor: dim.border }}>
                      {[dim.pos, dim.neg].map((letter) => (
                        <div key={letter} className="space-y-1.5">
                          <div className="text-xs font-semibold" style={{ color: dim.accent }}>Towards {letter}</div>
                          <div className="flex flex-wrap gap-1.5">
                            {(f[letter] ?? []).slice(0, 10).map((word) => (
                              <span
                                key={word}
                                className={`px-2 py-0.5 rounded-md text-[11px] font-mono border ${
                                  PLACEHOLDER_TOKENS.has(word)
                                    ? 'bg-[#FEF6E7] border-[#F2DFB0] text-[#7A530B]'
                                    : 'bg-white border-black/[0.06] text-[#374151]'
                                }`}
                              >
                                {word}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-[#6B7280] leading-relaxed">
                Highlighted tokens such as <span className="font-mono">typology_term</span> or <span className="font-mono">mbti_type</span> are masking placeholders. They are identical for every type, so they do not leak the label, but they show that "talking about personality types" is itself a signal.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
};
