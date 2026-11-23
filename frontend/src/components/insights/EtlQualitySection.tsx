import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Info, ShieldCheck } from 'lucide-react';
import { RULE_DISPLAY_LABELS, TECHNICAL_GLOSSARY } from '../../data/etlReports';
import { EtlConfigId, EtlConfigReport, InsightsDataState } from '../../types/insights';
import { TermTooltip } from './TermTooltip';

interface EtlQualitySectionProps {
  etlState: InsightsDataState<Record<EtlConfigId, EtlConfigReport>>;
}

const CONFIG_ORDER: EtlConfigId[] = ['raw', 'label_clean', 'psychometric_clean'];

export const EtlQualitySection: React.FC<EtlQualitySectionProps> = ({ etlState }) => {
  const [selectedConfig, setSelectedConfig] = useState<EtlConfigId>('label_clean');
  const [pctMetricMode, setPctMetricMode] = useState<'any' | 'own'>('any');

  const reports = etlState.data;
  const activeReport = reports ? reports[selectedConfig] : null;

  const leakagePctComparison = useMemo(() => {
    if (!reports) return [];
    return CONFIG_ORDER.map((id) => {
      const r = reports[id];
      return {
        configId: id,
        name: id === 'label_clean' ? 'Label Clean (Main)' : r.displayName,
        before:
          pctMetricMode === 'any'
            ? r.before.users_with_any_leak_pct
            : r.before.users_with_own_type_pct,
        after:
          pctMetricMode === 'any'
            ? r.after.users_with_any_leak_pct
            : r.after.users_with_own_type_pct,
      };
    });
  }, [reports, pctMetricMode]);

  const mentionsComparison = useMemo(() => {
    if (!reports) return [];
    return CONFIG_ORDER.map((id) => {
      const r = reports[id];
      return {
        configId: id,
        name: id === 'label_clean' ? 'Label Clean (Main)' : r.displayName,
        before: r.before.leak_mentions_total,
        after: r.after.leak_mentions_total,
      };
    });
  }, [reports]);

  const postsRetentionChartData = useMemo(() => {
    if (!activeReport) return [];
    return [
      {
        stage: 'Posts Retained',
        count: activeReport.after.posts,
        color: '#33A474',
      },
      {
        stage: 'Removed (Post Cleaning)',
        count: activeReport.posts_removed_by_post_cleaning,
        color: '#4298B4',
      },
      {
        stage: 'Removed (Copied Templates)',
        count: activeReport.posts_removed_as_templates,
        color: '#E4AE3A',
      },
    ];
  }, [activeReport]);

  const ruleBreakdownData = useMemo(() => {
    if (!activeReport) return [];
    return Object.entries(activeReport.before.by_rule)
      .map(([ruleKey, stats]) => ({
        ruleKey,
        label: RULE_DISPLAY_LABELS[ruleKey] || ruleKey,
        mentions: stats.mentions,
        usersPct: stats.users_pct,
      }))
      .sort((a, b) => b.mentions - a.mentions);
  }, [activeReport]);

  if (!reports || !activeReport) {
    return (
      <div className="rounded-3xl bg-white border border-black/[0.08] p-8 text-center text-sm text-[#525B6E]">
        ETL quality reports are unavailable.
      </div>
    );
  }

  const totalPostReduction =
    activeReport.before.posts - activeReport.after.posts;

  return (
    <section className="space-y-8" aria-labelledby="etl-section-heading">
      {/* Section Header + Config Selector Dropdown */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2
              id="etl-section-heading"
              className="font-display text-2xl font-bold text-[#1E2430]"
            >
              03. ETL & Data Quality
            </h2>
            <TermTooltip
              term={TECHNICAL_GLOSSARY.etl.term}
              definition={TECHNICAL_GLOSSARY.etl.definition}
            />
          </div>
          <p className="text-sm text-[#525B6E]">
            Verified metrics from <span className="font-mono text-xs">reports/etl/leakage_report_*.json</span> comparing dataset configurations before and after cleaning.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <label
            htmlFor="etl-config-select"
            className="text-xs font-semibold text-[#525B6E] whitespace-nowrap"
          >
            Dataset Configuration
          </label>
          <select
            id="etl-config-select"
            value={selectedConfig}
            onChange={(e) => setSelectedConfig(e.target.value as EtlConfigId)}
            className="rounded-xl border border-black/[0.12] bg-white px-4 py-2.5 text-sm font-semibold text-[#1E2430] shadow-xs focus:outline-none focus:border-[#33A474] cursor-pointer"
          >
            <option value="label_clean">Label Clean (Main Dataset)</option>
            <option value="raw">Raw</option>
            <option value="psychometric_clean">Psychometric Clean</option>
          </select>
        </div>
      </div>

      {/* Selected Configuration Summary Cards */}
      <div className="rounded-3xl bg-[#ECF7F1] border border-[#C8E9D8] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-[#1D6446]">
              Selected Configuration · {activeReport.isMainDataset ? 'Main Training Dataset' : 'Comparison Experiment'}
            </div>
            <h3 className="font-display text-xl sm:text-2xl font-bold text-[#1E2430]">
              {activeReport.displayName}
            </h3>
          </div>
          <span className="font-mono text-xs text-[#1D6446]">
            {activeReport.output}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="rounded-2xl bg-white/90 border border-[#C8E9D8] p-4 space-y-1">
            <div className="text-xs text-[#525B6E]">Posts Before → After</div>
            <div className="font-display text-lg font-bold text-[#1E2430] tabular-nums">
              {activeReport.before.posts.toLocaleString('en-US')} →{' '}
              {activeReport.after.posts.toLocaleString('en-US')}
            </div>
          </div>

          <div className="rounded-2xl bg-white/90 border border-[#C8E9D8] p-4 space-y-1">
            <div className="text-xs text-[#525B6E]">Total Post Reduction</div>
            <div className="font-display text-lg font-bold text-[#1E2430] tabular-nums">
              -{totalPostReduction.toLocaleString('en-US')}
            </div>
            <div className="text-[11px] text-[#6B7280] tabular-nums">
              {activeReport.posts_removed_by_post_cleaning.toLocaleString('en-US')} cleaning +{' '}
              {activeReport.posts_removed_as_templates.toLocaleString('en-US')} templates
            </div>
          </div>

          <div className="rounded-2xl bg-white/90 border border-[#C8E9D8] p-4 space-y-1">
            <div className="text-xs text-[#525B6E]">Users w/ Leakage</div>
            <div className="font-display text-lg font-bold text-[#1D6446] tabular-nums">
              {activeReport.before.users_with_any_leak_pct.toFixed(2)}% →{' '}
              {activeReport.after.users_with_any_leak_pct}%
            </div>
          </div>

          <div className="rounded-2xl bg-white/90 border border-[#C8E9D8] p-4 space-y-1">
            <div className="text-xs text-[#525B6E]">Leakage Mentions</div>
            <div className="font-display text-lg font-bold text-[#1D6446] tabular-nums">
              {activeReport.before.leak_mentions_total.toLocaleString('en-US')} →{' '}
              {activeReport.after.leak_mentions_total}
            </div>
          </div>

          <div className="rounded-2xl bg-white/90 border border-[#C8E9D8] p-4 space-y-1">
            <div className="text-xs text-[#525B6E]">Artefacts Fixed / Lost Users</div>
            <div className="font-display text-lg font-bold text-[#1E2430] tabular-nums">
              {activeReport.before.encoding_artefacts.toLocaleString('en-US')} /{' '}
              {activeReport.users_left_without_posts}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1: Leakage % Before/After & Leakage Mentions Before/After */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Grouped Bar Chart: Leakage Percentages Before vs After */}
        <div className="rounded-3xl bg-white border border-black/[0.08] p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="font-display text-lg font-bold text-[#1E2430]">
                Users With Detected Leakage (%) Before vs. After
              </h3>
              <p className="text-xs text-[#6B7280]">
                All three dataset configurations compared
              </p>
            </div>

            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#F0EFEA] self-start">
              <button
                type="button"
                onClick={() => setPctMetricMode('any')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  pctMetricMode === 'any'
                    ? 'bg-white text-[#1E2430] shadow-xs'
                    : 'text-[#5A6375]'
                }`}
              >
                Any Leakage
              </button>
              <button
                type="button"
                onClick={() => setPctMetricMode('own')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  pctMetricMode === 'own'
                    ? 'bg-white text-[#1E2430] shadow-xs'
                    : 'text-[#5A6375]'
                }`}
              >
                Own Type
              </button>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={leakagePctComparison}
                margin={{ top: 12, right: 12, left: -12, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#4B5364' }} />
                <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#4B5364' }} />
                <Tooltip
                  formatter={(value) => [`${Number(value).toFixed(2)}%`, undefined]}
                  contentStyle={{ borderRadius: '12px', borderColor: '#E5E7EB', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="before" name="Before Cleaning (%)" fill="#88619A" radius={[6, 6, 0, 0]} />
                <Bar dataKey="after" name="After Cleaning (%)" fill="#33A474" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Before/After Detected Leakage Mentions */}
        <div className="rounded-3xl bg-white border border-black/[0.08] p-6 space-y-4">
          <div>
            <h3 className="font-display text-lg font-bold text-[#1E2430]">
              Detected Leakage Mentions Before vs. After
            </h3>
            <p className="text-xs text-[#6B7280]">
              Total typology mentions masked by <span className="font-mono">clean_text</span> across configs
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={mentionsComparison}
                margin={{ top: 12, right: 12, left: 6, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#4B5364' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#4B5364' }}
                  tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                />
                <Tooltip
                  formatter={(value) => [Number(value).toLocaleString('en-US'), undefined]}
                  contentStyle={{ borderRadius: '12px', borderColor: '#E5E7EB', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  dataKey="before"
                  name="Mentions Before"
                  fill="#E4AE3A"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="after"
                  name="Mentions After"
                  fill="#33A474"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2: Posts Retained vs Removed + Leakage Breakdown by Rule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. Posts Retained vs Removed */}
        <div className="rounded-3xl bg-white border border-black/[0.08] p-6 space-y-4">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h3 className="font-display text-lg font-bold text-[#1E2430]">
                Posts Retained vs. Removed ({activeReport.displayName})
              </h3>
              <p className="text-xs text-[#6B7280] tabular-nums">
                {activeReport.before.posts.toLocaleString('en-US')} raw posts →{' '}
                {activeReport.after.posts.toLocaleString('en-US')} retained ({totalPostReduction.toLocaleString('en-US')} removed without double-counting)
              </p>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={postsRetentionChartData}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 24, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#4B5364' }}
                  tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                />
                <YAxis
                  dataKey="stage"
                  type="category"
                  width={150}
                  tick={{ fontSize: 11, fill: '#1E2430' }}
                />
                <Tooltip
                  formatter={(value) => [Number(value).toLocaleString('en-US'), 'Posts']}
                  contentStyle={{ borderRadius: '12px', borderColor: '#E5E7EB', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {postsRetentionChartData.map((entry) => (
                    <Cell key={entry.stage} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-black/[0.06] text-xs">
            <div>
              <div className="text-[#6B7280]">Retained Posts</div>
              <div className="font-mono font-semibold text-[#1D6446] tabular-nums">
                {activeReport.after.posts.toLocaleString('en-US')}
              </div>
            </div>
            <div>
              <div className="text-[#6B7280]">Post Cleaning</div>
              <div className="font-mono font-semibold text-[#205B70] tabular-nums">
                {activeReport.posts_removed_by_post_cleaning.toLocaleString('en-US')}
              </div>
            </div>
            <div>
              <div className="text-[#6B7280]">Copied Templates ({activeReport.template_texts_found} texts)</div>
              <div className="font-mono font-semibold text-[#7A530B] tabular-nums">
                {activeReport.posts_removed_as_templates.toLocaleString('en-US')}
              </div>
            </div>
          </div>
        </div>

        {/* Rule Breakdown for Selected Config */}
        <div className="rounded-3xl bg-white border border-black/[0.08] p-6 space-y-4">
          <div>
            <h3 className="font-display text-lg font-bold text-[#1E2430]">
              Masked Mentions by Cleaning Rule ({activeReport.displayName})
            </h3>
            <p className="text-xs text-[#6B7280]">
              Counts detected before cleaning across all 10 deterministic regex rules
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={ruleBreakdownData.slice(0, 7)}
                layout="vertical"
                margin={{ top: 4, right: 20, left: 16, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#4B5364' }}
                  tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                />
                <YAxis
                  dataKey="label"
                  type="category"
                  width={175}
                  tick={{ fontSize: 11, fill: '#1E2430' }}
                />
                <Tooltip
                  formatter={(value) => [Number(value).toLocaleString('en-US'), 'Mentions Masked']}
                  contentStyle={{ borderRadius: '12px', borderColor: '#E5E7EB', fontSize: '12px' }}
                />
                <Bar dataKey="mentions" fill="#4298B4" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. Compact Comparison Table Across All Three Configurations */}
      <div className="rounded-3xl bg-white border border-black/[0.08] overflow-hidden">
        <div className="px-6 py-5 border-b border-black/[0.06] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="font-display text-lg font-bold text-[#1E2430]">
              Configuration Comparison Table
            </h3>
            <p className="text-xs text-[#6B7280]">
              Side-by-side summary of verified ETL quality reports
            </p>
          </div>
          <span className="text-xs text-[#6B7280]">{etlState.sourceAttribution}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-[#FAF9F6] border-b border-black/[0.06] text-xs font-semibold text-[#525B6E]">
                <th className="py-3.5 px-5">Configuration</th>
                <th className="py-3.5 px-4 text-right">Users</th>
                <th className="py-3.5 px-4 text-right">Posts Before</th>
                <th className="py-3.5 px-4 text-right">Posts After</th>
                <th className="py-3.5 px-4 text-right">Leakage Users (Before → After)</th>
                <th className="py-3.5 px-4 text-right">Mentions (Before → After)</th>
                <th className="py-3.5 px-4 text-right">Artefacts Fixed</th>
                <th className="py-3.5 px-5 text-right">Templates Removed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05] tabular-nums">
              {CONFIG_ORDER.map((id) => {
                const r = reports[id];
                const isSelected = id === selectedConfig;
                return (
                  <tr
                    key={id}
                    onClick={() => setSelectedConfig(id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#ECF7F1]/60' : 'hover:bg-[#FAF9F6]'
                    }`}
                  >
                    <td className="py-3.5 px-5 font-semibold text-[#1E2430] whitespace-nowrap">
                      {r.displayName}
                    </td>
                    <td className="py-3.5 px-4 text-right text-[#4B5364]">
                      {r.before.users.toLocaleString('en-US')}
                    </td>
                    <td className="py-3.5 px-4 text-right text-[#4B5364]">
                      {r.before.posts.toLocaleString('en-US')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-[#1E2430]">
                      {r.after.posts.toLocaleString('en-US')}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-[#88619A] font-medium">
                        {r.before.users_with_any_leak_pct.toFixed(2)}%
                      </span>{' '}
                      →{' '}
                      <span className="text-[#1D6446] font-semibold">
                        {r.after.users_with_any_leak_pct}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-[#7A530B] font-medium">
                        {r.before.leak_mentions_total.toLocaleString('en-US')}
                      </span>{' '}
                      →{' '}
                      <span className="text-[#1D6446] font-semibold">
                        {r.after.leak_mentions_total}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-[#4B5364]">
                      {r.before.encoding_artefacts.toLocaleString('en-US')}
                    </td>
                    <td className="py-3.5 px-5 text-right text-[#4B5364]">
                      {r.posts_removed_as_templates.toLocaleString('en-US')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Prominent Leakage Prevention Explanation & Honest 0% Caveat */}
      <div className="rounded-3xl bg-white border border-black/[0.08] p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#1D6446]">
            <ShieldCheck className="w-4 h-4" />
            <span>Why Leakage Prevention Matters in Text Classification</span>
          </div>
          <h3 className="font-display text-xl font-bold text-[#1E2430]">
            Preventing Shortcut Learning From Explicit Self-Labels
          </h3>
          <p className="text-sm text-[#4B5364] leading-relaxed">
            In the baseline <span className="font-mono">label_clean</span> Hugging Face dataset, 84.46% of users still mentioned typology clues—such as pluralized types (<span className="font-mono">INFPs</span>), cognitive functions (<span className="font-mono">Fe</span>, <span className="font-mono">Fi</span>, <span className="font-mono">Ne</span>), or Enneagram codes (<span className="font-mono">4w5</span>)—and 48.93% explicitly wrote their own MBTI label. Without masking, a classifier learns to match those tokens rather than genuine linguistic style, failing completely on real-world writing where users do not state their type.
          </p>
        </div>

        <div className="lg:col-span-5 rounded-2xl bg-[#FAF9F6] border border-black/[0.07] p-5 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#1E2430]">
            <Info className="w-4 h-4 text-[#4298B4]" />
            <span>Interpretation Scope of “0% Detected Leakage”</span>
          </div>
          <p className="text-xs text-[#4B5364] leading-relaxed">
            Reporting <strong>0% detected leakage</strong> means zero remaining matches were found by the implemented deterministic cleaning rules and independent regex audit (<span className="font-mono">src.etl.cleaning.find_leaks</span>). It is an empirical verification of rule coverage—not a universal guarantee that every subtle or indirect typology hint has been eliminated.
          </p>
          <p className="text-xs text-[#6B7280] leading-relaxed">
            In <span className="font-mono">label_clean</span>, the 2,166 post reduction consists strictly of 1,974 posts removed by post-level cleaning and 192 copied template posts, with zero overlap or double-counting.
          </p>
        </div>
      </div>
    </section>
  );
};
