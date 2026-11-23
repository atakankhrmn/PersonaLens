import React from 'react';
import { ArrowLeft, Info, Layers, RotateCcw } from 'lucide-react';
import { PERSONALITY_GROUPS, PERSONALITY_MAP } from '../data/personalities';
import { MbtiDimensionScores, PredictionResult as PredictionResultData } from '../types/personality';
import { PersonalityIllustration } from './PersonalityIllustration';

interface PredictionResultProps {
  result: PredictionResultData;
  submittedPosts: string[];
  onAnalyzeAgain: () => void;
  onExploreTypes: () => void;
}

interface DimensionAxisConfig {
  key: keyof MbtiDimensionScores;
  leftCode: 'I' | 'S' | 'F' | 'P';
  rightCode: 'E' | 'N' | 'T' | 'J';
  leftLabel: string;
  rightLabel: string;
}

/**
 * Repository convention (src/dw/predictions.py & AGENTS.md):
 * EI = P(E), NS = P(N), FT = P(T), JP = P(J).
 * Left side shows the 0-pole (I, S, F, P) and right side shows the 1-pole (E, N, T, J).
 */
const DIMENSION_AXES: DimensionAxisConfig[] = [
  {
    key: 'EI',
    leftCode: 'I',
    rightCode: 'E',
    leftLabel: 'Introverted',
    rightLabel: 'Extraverted',
  },
  {
    key: 'NS',
    leftCode: 'S',
    rightCode: 'N',
    leftLabel: 'Observant',
    rightLabel: 'Intuitive',
  },
  {
    key: 'FT',
    leftCode: 'F',
    rightCode: 'T',
    leftLabel: 'Feeling',
    rightLabel: 'Thinking',
  },
  {
    key: 'JP',
    leftCode: 'P',
    rightCode: 'J',
    leftLabel: 'Prospecting',
    rightLabel: 'Judging',
  },
];

export const PredictionResult: React.FC<PredictionResultProps> = ({
  result,
  submittedPosts,
  onAnalyzeAgain,
  onExploreTypes,
}) => {
  const personality = PERSONALITY_MAP[result.predictedType];
  const group = PERSONALITY_GROUPS[personality.group];

  return (
    <div className="space-y-8">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onAnalyzeAgain}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#525B6E] hover:text-[#1E2430] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Text Input
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExploreTypes}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-black/[0.1] bg-white hover:bg-[#F5F4F0] text-sm font-medium text-[#1E2430] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Layers className="w-4 h-4" />
            Browse All 16 Types
          </button>
          <button
            type="button"
            onClick={onAnalyzeAgain}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1E2430] hover:bg-[#313A4D] text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" />
            Analyze Another Text
          </button>
        </div>
      </div>

      {/* Main Predicted Archetype Card */}
      <section
        className="rounded-3xl border overflow-hidden shadow-[0_14px_40px_-14px_rgba(30,36,48,0.1)] bg-white"
        style={{ borderColor: group.borderHex }}
      >
        <div
          className="p-8 sm:p-10 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
          style={{ backgroundColor: group.softBgHex }}
        >
          <div className="lg:col-span-5 flex justify-center">
            <PersonalityIllustration
              code={personality.code}
              title={`${personality.code} — ${personality.title}`}
              className="w-56 h-56 sm:w-64 sm:h-64"
            />
          </div>

          <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 text-sm font-medium">
              <span style={{ color: group.inkHex }} className="font-semibold">
                {group.name}
              </span>
              <span aria-hidden="true" className="text-[#9CA3AF]">
                ·
              </span>
              <span className="text-[#525B6E]">{group.tagline}</span>
              {result.modelVersion && (
                <>
                  <span aria-hidden="true" className="text-[#9CA3AF]">
                    ·
                  </span>
                  <span className="font-mono text-xs text-[#525B6E]">
                    Model {result.modelVersion}
                  </span>
                </>
              )}
            </div>

            <div className="space-y-2">
              <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-[#1E2430]">
                <span className="font-mono" style={{ color: group.inkHex }}>
                  {personality.code}
                </span>{' '}
                — {personality.title}
              </h1>
              <p className="text-lg font-medium text-[#374151] leading-relaxed">
                {personality.shortDescription}
              </p>
            </div>

            <p className="text-[15px] text-[#4B5364] leading-relaxed max-w-2xl mx-auto lg:mx-0">
              {personality.fullDescription}
            </p>
          </div>
        </div>

        {/* Dimension Bars (only rendered when backend returns valid scores) & Profile Details */}
        <div className="p-8 sm:p-10 space-y-10 bg-white">
          {result.scores && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
                <h2 className="font-display text-2xl font-bold text-[#1E2430]">
                  Four Dimension Probabilities
                </h2>
                <span className="text-xs text-[#6B7280] tabular-nums">
                  {result.analyzedPostCount}{' '}
                  {result.analyzedPostCount === 1 ? 'post' : 'posts'} ·{' '}
                  {result.analyzedWordCount}{' '}
                  {result.analyzedWordCount === 1 ? 'word' : 'words'} submitted
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {DIMENSION_AXES.map((axis) => {
                  const probRight = result.scores![axis.key];
                  const rightPct = Math.round(probRight * 100);
                  const leftPct = 100 - rightPct;
                  const isRightDominant = probRight >= 0.5;

                  return (
                    <div
                      key={axis.key}
                      className="p-5 rounded-2xl bg-[#FAF9F6] border border-black/[0.06] space-y-3"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span
                          className={`font-semibold ${
                            !isRightDominant ? 'text-[#1E2430]' : 'text-[#6B7280]'
                          }`}
                        >
                          {axis.leftLabel} ({axis.leftCode}){' '}
                          <span className="font-mono text-xs tabular-nums">
                            {leftPct}%
                          </span>
                        </span>
                        <span
                          className={`font-semibold ${
                            isRightDominant ? 'text-[#1E2430]' : 'text-[#6B7280]'
                          }`}
                        >
                          <span className="font-mono text-xs tabular-nums">
                            {rightPct}%
                          </span>{' '}
                          {axis.rightLabel} ({axis.rightCode})
                        </span>
                      </div>

                      <div
                        className="h-3 w-full rounded-full overflow-hidden flex"
                        style={{ backgroundColor: group.barTrackHex }}
                        role="progressbar"
                        aria-valuenow={isRightDominant ? rightPct : leftPct}
                        aria-valuemin={50}
                        aria-valuemax={100}
                        aria-label={`${axis.key} probability: ${
                          isRightDominant
                            ? `${rightPct}% ${axis.rightCode}`
                            : `${leftPct}% ${axis.leftCode}`
                        }`}
                      >
                        <div
                          className="h-full transition-all duration-500"
                          style={{
                            width: `${leftPct}%`,
                            backgroundColor: !isRightDominant ? group.accentHex : 'transparent',
                          }}
                        />
                        <div
                          className="h-full transition-all duration-500"
                          style={{
                            width: `${rightPct}%`,
                            backgroundColor: isRightDominant ? group.accentHex : 'transparent',
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs text-[#6B7280]">
                        <span>Axis {axis.key}</span>
                        <span className="font-mono tabular-nums">
                          P({axis.rightCode}) = {probRight.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Archetype Traits & Typical Voice */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-black/[0.06]">
            <div className="space-y-2.5">
              <h3 className="font-display text-lg font-bold text-[#1E2430]">
                Key Archetype Strengths
              </h3>
              <ul className="space-y-2 text-sm text-[#4B5364]">
                {personality.strengths.map((strength) => (
                  <li key={strength} className="flex items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: group.accentHex }}
                    />
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2.5">
              <h3 className="font-display text-lg font-bold text-[#1E2430]">
                Typical {personality.code} Writing Profile
              </h3>
              <p className="text-sm text-[#4B5364] leading-relaxed">
                {personality.writingVoice}
              </p>
            </div>
          </div>

          {/* Submitted Writing Samples Snapshot */}
          <details className="rounded-2xl bg-[#FAF9F6] border border-black/[0.06] px-5 py-4">
            <summary className="text-xs font-semibold text-[#4B5364] cursor-pointer select-none">
              View submitted writing ({result.analyzedPostCount}{' '}
              {result.analyzedPostCount === 1 ? 'post' : 'posts'} · {result.analyzedWordCount}{' '}
              {result.analyzedWordCount === 1 ? 'word' : 'words'} · kept in browser memory only)
            </summary>
            <div className="mt-3 space-y-3">
              {submittedPosts.map((post, idx) => (
                <div
                  key={idx}
                  className="rounded-xl bg-white border border-black/[0.06] px-4 py-3 space-y-1"
                >
                  {submittedPosts.length > 1 && (
                    <div className="text-[11px] font-semibold text-[#6B7280]">
                      Post {idx + 1}
                    </div>
                  )}
                  <p className="text-sm text-[#525B6E] leading-relaxed whitespace-pre-wrap">
                    {post}
                  </p>
                </div>
              ))}
            </div>
          </details>

          {/* Experimental Prediction Disclaimer */}
          <div className="rounded-2xl bg-[#F4F5F7] border border-black/[0.06] p-4 sm:p-5 flex items-start gap-3">
            <Info className="w-5 h-5 text-[#525B6E] shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-[#4B5364] leading-relaxed">
              <strong className="font-semibold text-[#1E2430]">
                Experimental Prediction Notice:
              </strong>{' '}
              This output is an experimental machine learning prediction trained on self-reported MBTI labels from forum writing, not an official MBTI® instrument or clinical psychological assessment.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
