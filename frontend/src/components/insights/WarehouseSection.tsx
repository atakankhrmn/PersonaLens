import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BrainCircuit,
  Database,
  Download,
  Filter,
  KeyRound,
  Link2,
  MonitorSmartphone,
  PieChart,
  ShieldCheck,
} from 'lucide-react';
import { InsightsDataState, WarehouseInfo, WarehouseTable } from '../../types/insights';
import { TermTooltip } from './TermTooltip';

interface WarehouseSectionProps {
  warehouseState: InsightsDataState<WarehouseInfo>;
}

// Star layout: facts in the middle, dimensions on both sides.
const LEFT_DIMS = ['dim_user', 'dim_mbti_type', 'dim_source'];
const FACTS = ['fact_post', 'fact_prediction', 'fact_data_quality'];
const RIGHT_DIMS = ['dim_date', 'dim_model', 'dim_etl_run'];

const FACT_STYLE = { bg: '#F4EFF7', border: '#E1D2EB', ink: '#4F3460', accent: '#88619A' };
const DIM_STYLE = { bg: '#ECF5F8', border: '#C7E2ED', ink: '#205B70', accent: '#4298B4' };

const GLOSSARY = {
  star: {
    term: 'Star schema',
    definition:
      'A warehouse design with fact tables (events or measurements) in the middle, linked by keys to dimension tables (who, what, when, where) around them. It keeps BI queries simple and fast.',
  },
  grain: {
    term: 'Grain',
    definition: 'What exactly one row of a fact table stands for, e.g. "one cleaned forum post".',
  },
  degenerate: {
    term: 'Degenerate attribute',
    definition:
      'A descriptive value kept directly on the fact row instead of in its own dimension (here: the cleaned post text).',
  },
  lineage: {
    term: 'Lineage',
    definition:
      'Being able to trace every row back to the run, time and code version (git commit) that loaded it.',
  },
};

const PIPELINE = [
  {
    icon: Download,
    title: 'Extract',
    command: 'src.data_loader.load_mbti',
    detail: 'Download the PersonalityCafe dataset (CC0) from Hugging Face, three configs.',
  },
  {
    icon: Filter,
    title: 'Transform',
    command: 'python -m src.etl.clean_leakage',
    detail: 'Fix encoding, mask MBTI / typology terms, drop empty, duplicate and template posts; write a quality report.',
  },
  {
    icon: Database,
    title: 'Load',
    command: 'python -m src.dw.load_dw',
    detail: 'One transaction: upsert dimensions, replace fact_post of the main source, append quality metrics, record the run in dim_etl_run.',
  },
  {
    icon: BrainCircuit,
    title: 'Model results',
    command: 'python -m src.models.train',
    detail: 'register_model → dim_model; write_predictions → fact_prediction (every user of every split).',
  },
  {
    icon: MonitorSmartphone,
    title: 'App',
    command: 'POST /api/analyze',
    detail: 'log_app_prediction stores the predicted type, scores and word count — never the text.',
  },
  {
    icon: PieChart,
    title: 'Serve',
    command: 'dw.vw_* views',
    detail: 'BI views feed the Power BI report and this Data Insights page through the Python API.',
  },
];

const DECISIONS = [
  {
    title: 'No invented dates',
    text: 'The forum data has no post timestamps, so dim_date only holds real load and prediction days.',
  },
  {
    title: 'One source in fact_post',
    text: 'The three cleaned configs are 98–99.7% identical; only the main one (label_clean) is stored, the other two contribute quality metrics.',
  },
  {
    title: 'Text kept for training',
    text: 'fact_post keeps the cleaned text as a degenerate attribute, so models can be trained straight from the warehouse.',
  },
  {
    title: 'Privacy by design',
    text: 'Predictions made in the app have no user and no text: only type, scores and counts are logged.',
  },
  {
    title: 'Honest evaluation',
    text: 'Train-split predictions are in-sample; dashboards and this page only show validation and test.',
  },
  {
    title: 'Idempotent loads',
    text: 'schema.sql and load_dw can be re-run safely; each run is recorded with its git commit (lineage).',
  },
];

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${bytes} B`;
}

const fmt = (n: number) => n.toLocaleString('en-US');

interface Line {
  key: string;
  from: string;
  to: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export const WarehouseSection: React.FC<WarehouseSectionProps> = ({ warehouseState }) => {
  const data = warehouseState.data;
  const [selected, setSelected] = useState<string>('fact_post');
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [lines, setLines] = useState<Line[]>([]);

  const tables = useMemo(() => {
    const map: Record<string, WarehouseTable> = {};
    for (const t of data?.tables ?? []) map[t.name] = t;
    return map;
  }, [data]);

  // unique table pairs linked by a foreign key
  const links = useMemo(() => {
    const seen = new Set<string>();
    const out: { from: string; to: string }[] = [];
    for (const fk of data?.foreignKeys ?? []) {
      const key = `${fk.from_table}->${fk.to_table}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ from: fk.from_table, to: fk.to_table });
      }
    }
    return out;
  }, [data]);

  const related = useMemo(() => {
    const set = new Set<string>([selected]);
    for (const l of links) {
      if (l.from === selected) set.add(l.to);
      if (l.to === selected) set.add(l.from);
    }
    return set;
  }, [links, selected]);

  // draw FK lines between the cards (desktop layout only)
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !data) return;
    const compute = () => {
      const box = container.getBoundingClientRect();
      if (box.width < 900) {
        setLines([]);
        return;
      }
      const next: Line[] = [];
      for (const l of links) {
        const a = cardRefs.current[l.from]?.getBoundingClientRect();
        const b = cardRefs.current[l.to]?.getBoundingClientRect();
        if (!a || !b) continue;
        const sameColumn = Math.abs(a.left - b.left) < 5;
        const aRightOfB = a.left > b.left;
        const x1 = sameColumn ? a.left - box.left : aRightOfB ? a.left - box.left : a.right - box.left;
        const x2 = sameColumn ? b.left - box.left : aRightOfB ? b.right - box.left : b.left - box.left;
        next.push({
          key: `${l.from}->${l.to}`,
          from: l.from,
          to: l.to,
          x1,
          y1: a.top + a.height / 2 - box.top,
          x2,
          y2: b.top + b.height / 2 - box.top,
        });
      }
      setLines(next);
    };
    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(container);
    return () => observer.disconnect();
  }, [data, links]);

  if (warehouseState.status !== 'ready' || !data) {
    return (
      <section className="space-y-6" aria-labelledby="warehouse-heading">
        <h2 id="warehouse-heading" className="font-display text-2xl font-bold text-[#1E2430]">
          04. Data Warehouse
        </h2>
        <div className="rounded-3xl bg-white border border-black/[0.08] p-8 text-center space-y-2">
          <Database className="w-8 h-8 mx-auto text-[#4298B4]" />
          <div className="font-display text-lg font-bold text-[#1E2430]">Warehouse not reachable</div>
          <p className="text-sm text-[#525B6E] max-w-xl mx-auto">
            Start PostgreSQL and the Python API (<span className="font-mono">python -m src.api</span>). This tab reads the live catalog of the <span className="font-mono">dw</span> schema; nothing here is hard-coded.
          </p>
        </div>
      </section>
    );
  }

  const facts = data.tables.filter((t) => t.kind === 'fact');
  const dims = data.tables.filter((t) => t.kind === 'dimension');
  const totalRows = data.tables.reduce((s, t) => s + t.rows, 0);
  const lastRun = data.etlRuns[0];
  const active = tables[selected];
  const appPredictions = data.predictionRows
    .filter((p) => p.split === 'app')
    .reduce((s, p) => s + p.rows, 0);

  const renderCard = (name: string) => {
    const t = tables[name];
    if (!t) return null;
    const style = t.kind === 'fact' ? FACT_STYLE : DIM_STYLE;
    const isSelected = name === selected;
    const isRelated = related.has(name);
    return (
      <button
        key={name}
        ref={(el) => {
          cardRefs.current[name] = el;
        }}
        type="button"
        onClick={() => setSelected(name)}
        aria-pressed={isSelected}
        className={`relative z-10 w-full text-left rounded-2xl border p-3.5 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#33A474] ${
          isSelected ? 'shadow-md -translate-y-0.5' : ''
        } ${isRelated ? 'opacity-100' : 'opacity-45 hover:opacity-80'}`}
        style={{
          backgroundColor: style.bg,
          borderColor: isSelected ? style.ink : style.border,
          borderWidth: isSelected ? 2 : 1,
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[13px] font-bold" style={{ color: style.ink }}>
            {name}
          </span>
          <span
            className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-white/70"
            style={{ color: style.accent }}
          >
            {t.kind}
          </span>
        </div>
        <div className="mt-1 text-[11px] text-[#4B5364]">{t.grain}</div>
        <div className="mt-1.5 font-mono text-xs font-semibold text-[#1E2430] tabular-nums">
          {fmt(t.rows)} rows
        </div>
      </button>
    );
  };

  return (
    <section className="space-y-8" aria-labelledby="warehouse-heading">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div className="space-y-1">
          <h2 id="warehouse-heading" className="font-display text-2xl font-bold text-[#1E2430]">
            04. Data Warehouse
          </h2>
          <p className="text-sm text-[#525B6E] max-w-3xl">
            The cleaned data, the model results and the data-quality metrics live in one PostgreSQL star schema. Everything on this page and in the Power BI report is read from it.
          </p>
        </div>
        <span className="text-xs text-[#6B7280]">Source: {warehouseState.sourceAttribution}</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-black/[0.08] p-5 space-y-1">
          <div className="text-xs font-semibold text-[#525B6E]">Tables</div>
          <div className="font-display text-2xl font-bold text-[#1E2430]">
            {facts.length} facts · {dims.length} dims
          </div>
          <div className="text-[11px] text-[#6B7280]">
            {data.foreignKeys.length} foreign keys · {data.views.length} BI views
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-black/[0.08] p-5 space-y-1">
          <div className="text-xs font-semibold text-[#525B6E]">Rows</div>
          <div className="font-display text-2xl font-bold text-[#1E2430] tabular-nums">{fmt(totalRows)}</div>
          <div className="text-[11px] text-[#6B7280]">{fmt(tables.fact_post?.rows ?? 0)} of them in fact_post</div>
        </div>
        <div className="rounded-2xl bg-white border border-black/[0.08] p-5 space-y-1">
          <div className="text-xs font-semibold text-[#525B6E]">Database Size</div>
          <div className="font-display text-2xl font-bold text-[#1E2430] tabular-nums">{formatBytes(data.databaseBytes)}</div>
          <div className="text-[11px] text-[#6B7280]">PostgreSQL {data.engine} · schema {data.schema}</div>
        </div>
        <div className="rounded-2xl bg-white border border-black/[0.08] p-5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#525B6E]">
            <span>Last Load</span>
            <TermTooltip term={GLOSSARY.lineage.term} definition={GLOSSARY.lineage.definition} />
          </div>
          <div className="font-display text-2xl font-bold text-[#1E2430]">
            {lastRun?.started_at ? new Date(lastRun.started_at).toLocaleDateString('en-GB') : '—'}
          </div>
          <div className="text-[11px] text-[#6B7280]">
            {lastRun ? `run #${lastRun.run} · ${lastRun.status} · commit ${lastRun.git_commit}` : 'no runs yet'}
          </div>
        </div>
      </div>

      {/* Star schema */}
      <div className="rounded-3xl bg-white border border-black/[0.08] p-6 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-xl font-bold text-[#1E2430]">Star Schema</h3>
            <TermTooltip term={GLOSSARY.star.term} definition={GLOSSARY.star.definition} />
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[#525B6E]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: FACT_STYLE.bg, border: `1px solid ${FACT_STYLE.border}` }} />
              fact
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: DIM_STYLE.bg, border: `1px solid ${DIM_STYLE.border}` }} />
              dimension
            </span>
            <span>Click a table to see its columns and links</span>
          </div>
        </div>

        <div ref={containerRef} className="relative grid grid-cols-1 lg:grid-cols-[1fr_1.1fr_1fr] gap-4 lg:gap-x-16 lg:gap-y-4">
          <svg className="absolute inset-0 w-full h-full pointer-events-none hidden lg:block" aria-hidden="true">
            {lines.map((l) => {
              const on = l.from === selected || l.to === selected;
              const sameColumn = Math.abs(l.x1 - l.x2) < 5;
              const d = sameColumn
                ? `M ${l.x1} ${l.y1} C ${l.x1 - 28} ${l.y1}, ${l.x2 - 28} ${l.y2}, ${l.x2} ${l.y2}`
                : `M ${l.x1} ${l.y1} C ${(l.x1 + l.x2) / 2} ${l.y1}, ${(l.x1 + l.x2) / 2} ${l.y2}, ${l.x2} ${l.y2}`;
              return (
                <path
                  key={l.key}
                  d={d}
                  fill="none"
                  stroke={on ? '#88619A' : '#D7D9DE'}
                  strokeWidth={on ? 2 : 1}
                  strokeDasharray={on ? undefined : '4 4'}
                />
              );
            })}
          </svg>
          <div className="space-y-4 lg:pt-6">{LEFT_DIMS.map(renderCard)}</div>
          <div className="space-y-4">{FACTS.map(renderCard)}</div>
          <div className="space-y-4 lg:pt-6">{RIGHT_DIMS.map(renderCard)}</div>
        </div>

        {/* Selected table details */}
        {active && (
          <div className="rounded-2xl bg-[#FAF9F6] border border-black/[0.06] p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-3">
              <div className="font-mono text-base font-bold text-[#1E2430]">dw.{active.name}</div>
              <p className="text-sm text-[#4B5364] leading-relaxed">{active.description}</p>
              <div className="flex items-center gap-1.5 text-xs text-[#525B6E]">
                <span className="font-semibold">Grain:</span> <span>{active.grain}</span>
                <TermTooltip term={GLOSSARY.grain.term} definition={GLOSSARY.grain.definition} />
              </div>
              {active.name === 'fact_post' && (
                <div className="flex items-center gap-1.5 text-xs text-[#525B6E]">
                  <span className="font-semibold">post_text</span> is a degenerate attribute
                  <TermTooltip term={GLOSSARY.degenerate.term} definition={GLOSSARY.degenerate.definition} />
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-white border border-black/[0.06] p-2">
                  <div className="font-mono text-sm font-bold text-[#1E2430] tabular-nums">{fmt(active.rows)}</div>
                  <div className="text-[10px] text-[#6B7280]">rows</div>
                </div>
                <div className="rounded-xl bg-white border border-black/[0.06] p-2">
                  <div className="font-mono text-sm font-bold text-[#1E2430]">{active.columns.length}</div>
                  <div className="text-[10px] text-[#6B7280]">columns</div>
                </div>
                <div className="rounded-xl bg-white border border-black/[0.06] p-2">
                  <div className="font-mono text-sm font-bold text-[#1E2430]">{formatBytes(active.bytes)}</div>
                  <div className="text-[10px] text-[#6B7280]">on disk</div>
                </div>
              </div>
              {active.name === 'fact_prediction' && (
                <div className="text-xs text-[#525B6E] space-y-1">
                  {data.predictionRows.map((p) => (
                    <div key={`${p.model}-${p.split}`} className="flex justify-between font-mono">
                      <span>{p.model} · {p.split}</span>
                      <span className="tabular-nums">{fmt(p.rows)}</span>
                    </div>
                  ))}
                  <p className="pt-1 text-[11px] text-[#6B7280]">
                    {fmt(appPredictions)} predictions came from this app; their text was never stored.
                  </p>
                </div>
              )}
            </div>
            <div className="lg:col-span-7">
              <div className="rounded-xl bg-white border border-black/[0.06] overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#F3F2EE] text-[#525B6E] text-left">
                      <th className="py-2 px-3 font-semibold">Column</th>
                      <th className="py-2 px-3 font-semibold">Type</th>
                      <th className="py-2 px-3 font-semibold">Key</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04]">
                    {active.columns.map((c) => (
                      <tr key={c.name}>
                        <td className="py-1.5 px-3 font-mono text-[#1E2430]">{c.name}</td>
                        <td className="py-1.5 px-3 text-[#6B7280]">{c.type}</td>
                        <td className="py-1.5 px-3">
                          {c.pk && (
                            <span className="inline-flex items-center gap-1 text-[#7A530B] font-semibold">
                              <KeyRound className="w-3 h-3" /> PK
                            </span>
                          )}
                          {c.references && (
                            <button
                              type="button"
                              onClick={() => setSelected(c.references!)}
                              className="inline-flex items-center gap-1 text-[#205B70] font-semibold hover:underline cursor-pointer"
                            >
                              <Link2 className="w-3 h-3" /> {c.references}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Load pipeline */}
      <div className="rounded-3xl bg-white border border-black/[0.08] p-6 sm:p-8 space-y-5">
        <h3 className="font-display text-xl font-bold text-[#1E2430]">How Data Gets In</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {PIPELINE.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="relative rounded-2xl bg-[#FAF9F6] border border-black/[0.06] p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-white border border-black/[0.06] flex items-center justify-center text-[#205B70]">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-semibold text-[#6B7280]">{i + 1}</span>
                  <span className="font-display text-sm font-bold text-[#1E2430]">{step.title}</span>
                </div>
                <div className="font-mono text-[10.5px] text-[#205B70] break-words">{step.command}</div>
                <p className="text-[11.5px] text-[#4B5364] leading-relaxed">{step.detail}</p>
                {i < PIPELINE.length - 1 && (
                  <ArrowRight className="hidden xl:block absolute -right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] z-10" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ETL runs */}
        <div className="rounded-3xl bg-white border border-black/[0.08] p-6 space-y-4">
          <div className="flex items-baseline justify-between">
            <h3 className="font-display text-lg font-bold text-[#1E2430]">Load History</h3>
            <span className="font-mono text-[11px] text-[#6B7280]">dw.dim_etl_run</span>
          </div>
          <table className="w-full text-xs tabular-nums">
            <thead>
              <tr className="text-left text-[#525B6E] border-b border-black/[0.06]">
                <th className="py-2 pr-2">Run</th>
                <th className="py-2 px-2">Source</th>
                <th className="py-2 px-2">Started</th>
                <th className="py-2 px-2">Status</th>
                <th className="py-2 pl-2">Commit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {data.etlRuns.map((r) => (
                <tr key={r.run}>
                  <td className="py-2 pr-2 font-semibold text-[#1E2430]">#{r.run}</td>
                  <td className="py-2 px-2 font-mono text-[10.5px] text-[#4B5364]">{r.source.replace('personalitycafe/', '')}</td>
                  <td className="py-2 px-2 text-[#4B5364]">
                    {r.started_at ? new Date(r.started_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                  </td>
                  <td className="py-2 px-2">
                    <span className={`px-1.5 py-0.5 rounded-md text-[10.5px] font-semibold ${r.status === 'success' ? 'bg-[#ECF7F1] text-[#1D6446]' : 'bg-[#FDEDED] text-[#9B2C2C]'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="py-2 pl-2 font-mono text-[10.5px] text-[#6B7280]">{r.git_commit || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-[#6B7280]">
            The main source loads posts; the other two configs only add quality metrics (fact_data_quality).
          </p>
        </div>

        {/* Views */}
        <div className="rounded-3xl bg-white border border-black/[0.08] p-6 space-y-4">
          <div className="flex items-baseline justify-between">
            <h3 className="font-display text-lg font-bold text-[#1E2430]">BI Views</h3>
            <span className="font-mono text-[11px] text-[#6B7280]">dw.vw_*</span>
          </div>
          <ul className="space-y-2">
            {data.views.map((v) => (
              <li key={v.name} className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3 text-xs">
                <span className="font-mono font-semibold text-[#205B70] sm:w-52 shrink-0">{v.name}</span>
                <span className="text-[#4B5364]">{v.description}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-[#6B7280]">
            Views hide the joins: the Power BI report and this page query them instead of the raw tables.
          </p>
        </div>
      </div>

      {/* Design decisions */}
      <div className="rounded-3xl bg-white border border-black/[0.08] p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#1D6446]" />
          <h3 className="font-display text-xl font-bold text-[#1E2430]">Design Decisions</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DECISIONS.map((d) => (
            <div key={d.title} className="rounded-2xl bg-[#FAF9F6] border border-black/[0.06] p-4 space-y-1">
              <div className="font-display text-sm font-bold text-[#1E2430]">{d.title}</div>
              <p className="text-xs text-[#4B5364] leading-relaxed">{d.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
