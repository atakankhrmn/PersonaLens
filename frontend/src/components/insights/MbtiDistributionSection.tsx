import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Database } from 'lucide-react';
import { GROUP_ORDER, PERSONALITY_GROUPS, PERSONALITY_TYPES } from '../../data/personalities';
import {
  DatasetSplit,
  DimensionDistributionRow,
  InsightsDataState,
  MbtiTypeDistributionRow,
} from '../../types/insights';
import { MbtiCode, PersonalityGroupId } from '../../types/personality';

const DIMENSION_COLORS: Record<string, string> = {
  'E/I': '#88619A',
  'N/S': '#33A474',
  'F/T': '#4298B4',
  'J/P': '#D99B26',
};

interface MbtiDistributionSectionProps {
  typesState: InsightsDataState<MbtiTypeDistributionRow[]>;
  dimensionsState: InsightsDataState<DimensionDistributionRow[]>;
}

interface EmptyWarehousePanelProps {
  title: string;
  viewName: string;
  endpoint: string;
  description: string;
}

const EmptyWarehousePanel: React.FC<EmptyWarehousePanelProps> = ({
  title,
  viewName,
  endpoint,
  description,
}) => (
  <div className="h-64 rounded-2xl border border-dashed border-black/[0.12] bg-[#FAF9F6] p-6 flex flex-col items-center justify-center text-center space-y-2.5">
    <div className="w-10 h-10 rounded-xl bg-white border border-black/[0.08] flex items-center justify-center text-[#4298B4]">
      <Database className="w-5 h-5" />
    </div>
    <div className="font-display text-base font-bold text-[#1E2430]">{title}</div>
    <p className="text-xs text-[#525B6E] max-w-sm leading-relaxed">{description}</p>
    <div className="text-[11px] font-mono text-[#6B7280] pt-1">
      {viewName} · {endpoint}
    </div>
  </div>
);

export const MbtiDistributionSection: React.FC<MbtiDistributionSectionProps> = ({
  typesState,
  dimensionsState,
}) => {
  const [groupFilter, setGroupFilter] = useState<'all' | PersonalityGroupId>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | MbtiCode>('all');
  const [splitFilter, setSplitFilter] = useState<DatasetSplit>('all');

  // The API returns one row per type x split; sum the splits into one row per type
  // so every chart shows exactly one bar per type.
  const filteredTypeRows = useMemo(() => {
    if (!typesState.data) return [];
    const matching = typesState.data.filter((row) => {
      if (groupFilter !== 'all' && row.temperament !== groupFilter) return false;
      if (typeFilter !== 'all' && row.type_code !== typeFilter) return false;
      if (splitFilter !== 'all' && row.split && row.split !== splitFilter) return false;
      return true;
    });
    const byType = new Map<MbtiCode, MbtiTypeDistributionRow>();
    for (const row of matching) {
      const prev = byType.get(row.type_code);
      if (!prev) {
        byType.set(row.type_code, { ...row, posts: row.posts ?? 0, words: row.words ?? 0 });
      } else {
        prev.users += row.users;
        prev.posts = (prev.posts ?? 0) + (row.posts ?? 0);
        prev.words = (prev.words ?? 0) + (row.words ?? 0);
      }
    }
    const rows = [...byType.values()].map((r) => ({
      ...r,
      posts_per_user: r.users ? Math.round(((r.posts ?? 0) / r.users) * 10) / 10 : 0,
      avg_words_per_post: r.posts ? Math.round(((r.words ?? 0) / r.posts) * 10) / 10 : 0,
    }));
    return rows.sort((a, b) => b.users - a.users);
  }, [typesState.data, groupFilter, typeFilter, splitFilter]);

  const totalFilteredUsers = filteredTypeRows.reduce((sum, r) => sum + r.users, 0);

  const groupSummaryRows = useMemo(() => {
    if (filteredTypeRows.length === 0) return [];
    return GROUP_ORDER.map((groupId) => {
      const matching = filteredTypeRows.filter((r) => r.temperament === groupId);
      const users = matching.reduce((sum, r) => sum + r.users, 0);
      const posts = matching.reduce((sum, r) => sum + (r.posts || 0), 0);
      return {
        groupId,
        name: PERSONALITY_GROUPS[groupId].name,
        color: PERSONALITY_GROUPS[groupId].accentHex,
        users,
        posts,
      };
    });
  }, [filteredTypeRows]);

  const hasTypeData = typesState.status === 'ready' && filteredTypeRows.length > 0;
  const hasDimensionData =
    dimensionsState.status === 'ready' &&
    Array.isArray(dimensionsState.data) &&
    dimensionsState.data.length > 0;

  return (
    <section className="space-y-8" aria-labelledby="distribution-section-heading">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="space-y-1">
          <h2
            id="distribution-section-heading"
            className="font-display text-2xl font-bold text-[#1E2430]"
          >
            02. MBTI Distribution
          </h2>
          <p className="text-sm text-[#525B6E]">
            Class balance and posting volume across the 16 self-reported types, 4 dimensions, and 4 temperament families.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-[#525B6E]">
            <span>Group</span>
            <select
              value={groupFilter}
              onChange={(e) => {
                setGroupFilter(e.target.value as 'all' | PersonalityGroupId);
                setTypeFilter('all');
              }}
              className="rounded-xl border border-black/[0.1] bg-white px-3 py-2 text-xs font-semibold text-[#1E2430] focus:outline-none focus:border-[#33A474]"
            >
              <option value="all">All Groups</option>
              {GROUP_ORDER.map((id) => (
                <option key={id} value={id}>
                  {PERSONALITY_GROUPS[id].name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-xs font-medium text-[#525B6E]">
            <span>MBTI Type</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | MbtiCode)}
              className="rounded-xl border border-black/[0.1] bg-white px-3 py-2 text-xs font-semibold text-[#1E2430] focus:outline-none focus:border-[#33A474]"
            >
              <option value="all">All 16 Types</option>
              {PERSONALITY_TYPES.filter(
                (t) => groupFilter === 'all' || t.group === groupFilter
              ).map((t) => (
                <option key={t.code} value={t.code}>
                  {t.code} — {t.title}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-xs font-medium text-[#525B6E]">
            <span>Split</span>
            <select
              value={splitFilter}
              onChange={(e) => setSplitFilter(e.target.value as DatasetSplit)}
              className="rounded-xl border border-black/[0.1] bg-white px-3 py-2 text-xs font-semibold text-[#1E2430] focus:outline-none focus:border-[#33A474]"
            >
              <option value="all">All Splits</option>
              <option value="train">Train</option>
              <option value="validation">Validation</option>
              <option value="test">Test</option>
            </select>
          </label>
        </div>
      </div>

      {/* Status Notice when DW endpoints are not connected yet */}
      {(!hasTypeData || !hasDimensionData) && (
        <div className="rounded-2xl bg-[#ECF5F8] border border-[#C7E2ED] px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-[#205B70]">
              PostgreSQL Warehouse Views Not Connected Yet
            </div>
            <p className="text-xs sm:text-sm text-[#4B5364]">
              Per-type counts are not fabricated. Charts below are wired to <span className="font-mono">dw.vw_type_distribution</span>, <span className="font-mono">dw.vw_dimension_distribution</span>, <span className="font-mono">dw.vw_posts_by_type</span>, and <span className="font-mono">dw.vw_user_profile</span> once exported via API.
            </p>
          </div>
          <span className="font-mono text-[11px] text-[#205B70] whitespace-nowrap shrink-0">
            GET /api/insights/types · /dimensions
          </span>
        </div>
      )}

      {/* 4 Reusable Chart Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: All 16 MBTI Types */}
        <div className="rounded-3xl bg-white border border-black/[0.08] p-6 space-y-4">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h3 className="font-display text-lg font-bold text-[#1E2430]">
                Distribution of All 16 MBTI Types
              </h3>
              <p className="text-xs text-[#6B7280]">
                User counts per type colored by personality group
              </p>
            </div>
            <span className="font-mono text-[11px] text-[#6B7280]">dw.vw_type_distribution</span>
          </div>

          {hasTypeData ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredTypeRows} margin={{ top: 10, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis dataKey="type_code" interval={0} angle={-45} textAnchor="end" height={44} tick={{ fontSize: 10, fill: '#4B5364' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#4B5364' }} />
                  <Tooltip
                    formatter={(raw) => {
                      const value = Number(raw ?? 0);
                      return [
                      `${value.toLocaleString('en-US')} users (${totalFilteredUsers ? ((value / totalFilteredUsers) * 100).toFixed(1) : 0}%)`,
                      'Users',
                    ];
                    }}
                  />
                  <Bar dataKey="users" name="Users" radius={[6, 6, 0, 0]}>
                    {filteredTypeRows.map((entry) => (
                      <Cell
                        key={entry.type_code}
                        fill={PERSONALITY_GROUPS[entry.temperament]?.accentHex || '#4298B4'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyWarehousePanel
              title="16-Type Distribution Ready for Data"
              viewName="dw.vw_type_distribution"
              endpoint={typesState.plannedEndpoint}
              description="Waiting for verified per-type user counts across INTJ–ESFP and train/validation/test splits."
            />
          )}
        </div>

        {/* Chart 2: Four MBTI Dimensions */}
        <div className="rounded-3xl bg-white border border-black/[0.08] p-6 space-y-4">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h3 className="font-display text-lg font-bold text-[#1E2430]">
                Four MBTI Dimension Distributions
              </h3>
              <p className="text-xs text-[#6B7280]">
                Class balance across E/I, N/S, F/T, and J/P poles (all 8,675 users)
              </p>
            </div>
            <span className="font-mono text-[11px] text-[#6B7280]">
              dw.vw_dimension_distribution
            </span>
          </div>

          {hasDimensionData ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dimensionsState.data!}
                  margin={{ top: 10, right: 12, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis dataKey="letter" tick={{ fontSize: 12, fill: '#4B5364' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#4B5364' }} />
                  <Tooltip
                    formatter={(raw, _name, item) => {
                      const value = Number(raw ?? 0);
                      const row = item?.payload as DimensionDistributionRow | undefined;
                      return [
                      `${value.toLocaleString('en-US')} users (${row?.pct ?? '—'}% of ${row?.dimension ?? ''})`,
                      'Users',
                    ];
                    }}
                  />
                  <Bar dataKey="users" name="Users" radius={[6, 6, 0, 0]}>
                    {dimensionsState.data!.map((entry) => (
                      <Cell
                        key={`${entry.dimension}-${entry.letter}`}
                        fill={DIMENSION_COLORS[entry.dimension] || '#33A474'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyWarehousePanel
              title="Dimension Class Balance Ready for Data"
              viewName="dw.vw_dimension_distribution"
              endpoint={dimensionsState.plannedEndpoint}
              description="Waiting for dimension-level user counts and percentages from PostgreSQL."
            />
          )}
        </div>

        {/* Chart 3: Analysts vs Diplomats vs Sentinels vs Explorers */}
        <div className="rounded-3xl bg-white border border-black/[0.08] p-6 space-y-4">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h3 className="font-display text-lg font-bold text-[#1E2430]">
                Personality Group Comparison
              </h3>
              <p className="text-xs text-[#6B7280]">
                Analysts, Diplomats, Sentinels, and Explorers user totals
              </p>
            </div>
            <span className="font-mono text-[11px] text-[#6B7280]">dw.vw_type_distribution</span>
          </div>

          {hasTypeData ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={groupSummaryRows} margin={{ top: 10, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#4B5364' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#4B5364' }} />
                  <Tooltip />
                  <Bar dataKey="users" name="Users" radius={[6, 6, 0, 0]}>
                    {groupSummaryRows.map((entry) => (
                      <Cell key={entry.groupId} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyWarehousePanel
              title="Four-Family Comparison Ready for Data"
              viewName="dw.vw_type_distribution"
              endpoint={typesState.plannedEndpoint}
              description="Will compare Analysts, Diplomats, Sentinels, and Explorers once per-type warehouse records are connected."
            />
          )}
        </div>

        {/* Chart 4: Number of Posts per Personality Type */}
        <div className="rounded-3xl bg-white border border-black/[0.08] p-6 space-y-4">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h3 className="font-display text-lg font-bold text-[#1E2430]">
                Posts & Word Volume per Personality Type
              </h3>
              <p className="text-xs text-[#6B7280]">
                Post volume and average length across archetypes
              </p>
            </div>
            <span className="font-mono text-[11px] text-[#6B7280]">
              dw.vw_posts_by_type · dw.vw_user_profile
            </span>
          </div>

          {hasTypeData ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredTypeRows} margin={{ top: 10, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis dataKey="type_code" interval={0} angle={-45} textAnchor="end" height={44} tick={{ fontSize: 10, fill: '#4B5364' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#4B5364' }} />
                  <Tooltip
                    formatter={(raw, _name, item) => {
                      const value = Number(raw ?? 0);
                      const row = item?.payload as MbtiTypeDistributionRow | undefined;
                      return [
                      `${value.toLocaleString('en-US')} posts · ${row?.posts_per_user ?? '—'} per user · ${row?.avg_words_per_post ?? '—'} words/post`,
                      'Cleaned posts',
                    ];
                    }}
                  />
                  <Bar dataKey="posts" name="Cleaned Posts" fill="#88619A" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyWarehousePanel
              title="Posts per Type Volume Ready for Data"
              viewName="dw.vw_posts_by_type"
              endpoint={typesState.plannedEndpoint}
              description="Will visualize post counts, posts per user, and average words per post from fact_post aggregations."
            />
          )}
        </div>
      </div>
    </section>
  );
};
