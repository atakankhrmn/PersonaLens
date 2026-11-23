import React from 'react';
import { AlertCircle, ArrowRight, Loader2, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { SAMPLE_WRITING_PROMPTS } from '../data/personalities';
import { countWords } from '../services/predictor';
import { AnalyzeInputMode } from '../types/personality';

const SAMPLE_MULTI_POSTS: string[] = [
  'I spend hours sketching out half-formed ideas in notebooks during train rides, wondering how small conversations shift someone’s perspective.',
  'When plans change at the last minute, I usually treat it as an unexpected detour rather than a setback—some of my favorite evenings started that way.',
  'I feel most energized after a long conversation about big-picture possibilities, books, and what people genuinely care about.',
];

interface TextAnalyzerProps {
  mode: AnalyzeInputMode;
  onModeChange: (mode: AnalyzeInputMode) => void;
  singleText: string;
  onSingleTextChange: (value: string) => void;
  multiplePosts: string[];
  onMultiplePostsChange: (posts: string[]) => void;
  onSubmit: () => void;
  isLoading: boolean;
  error: string | null;
  compact?: boolean;
}

export const TextAnalyzer: React.FC<TextAnalyzerProps> = ({
  mode,
  onModeChange,
  singleText,
  onSingleTextChange,
  multiplePosts,
  onMultiplePostsChange,
  onSubmit,
  isLoading,
  error,
  compact = false,
}) => {
  const singleTrimmed = singleText.trim();
  const singleWordCount = countWords(singleText);

  const nonEmptyPosts = multiplePosts.filter((post) => post.trim().length > 0);
  const totalMultipleWords = multiplePosts.reduce((sum, post) => sum + countWords(post), 0);

  const isSingleBrief = mode === 'single' && singleWordCount > 0 && singleWordCount < 10;
  const isMultipleBrief =
    mode === 'multiple' && nonEmptyPosts.length > 0 && totalMultipleWords < 15;

  const canSubmit =
    !isLoading &&
    (mode === 'single' ? singleTrimmed.length > 0 : nonEmptyPosts.length > 0);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading) {
      onSubmit();
    }
  };

  const handlePostChange = (index: number, value: string) => {
    const next = [...multiplePosts];
    next[index] = value;
    onMultiplePostsChange(next);
  };

  const handleAddPost = () => {
    onMultiplePostsChange([...multiplePosts, '']);
  };

  const handleRemovePost = (index: number) => {
    if (multiplePosts.length <= 1) return;
    onMultiplePostsChange(multiplePosts.filter((_, i) => i !== index));
  };

  const handleResetMultiple = () => {
    onMultiplePostsChange(['', '']);
  };

  return (
    <div
      className={`bg-white rounded-3xl border border-black/[0.08] shadow-[0_12px_36px_-12px_rgba(30,36,48,0.08)] ${
        compact ? 'p-6 sm:p-8' : 'p-6 sm:p-9'
      }`}
    >
      <form onSubmit={handleFormSubmit} className="space-y-6">
        {/* Header + Segmented Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-display text-lg sm:text-xl font-semibold text-[#1E2430]">
              {mode === 'single' ? 'Share a writing sample' : 'Enter multiple writing posts'}
            </h2>
            <p className="text-xs text-[#6B7280] tabular-nums">
              {mode === 'single'
                ? `${singleWordCount} ${singleWordCount === 1 ? 'word' : 'words'} · ${singleTrimmed.length} characters`
                : `${nonEmptyPosts.length} of ${multiplePosts.length} ${multiplePosts.length === 1 ? 'post' : 'posts'} filled · ${totalMultipleWords} total ${totalMultipleWords === 1 ? 'word' : 'words'}`}
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Writing input mode"
            className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#F0EFEA] border border-black/[0.05] self-start sm:self-auto"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'single'}
              disabled={isLoading}
              onClick={() => onModeChange('single')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer ${
                mode === 'single'
                  ? 'bg-white text-[#1E2430] shadow-xs'
                  : 'text-[#5A6375] hover:text-[#1E2430]'
              }`}
            >
              Single Text
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'multiple'}
              disabled={isLoading}
              onClick={() => onModeChange('multiple')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer ${
                mode === 'multiple'
                  ? 'bg-white text-[#1E2430] shadow-xs'
                  : 'text-[#5A6375] hover:text-[#1E2430]'
              }`}
            >
              Multiple Posts
            </button>
          </div>
        </div>

        {/* MODE 1: SINGLE TEXT */}
        {mode === 'single' && (
          <div className="space-y-4">
            <label htmlFor="personalens-single-input" className="sr-only">
              Single writing sample
            </label>
            <textarea
              id="personalens-single-input"
              value={singleText}
              onChange={(e) => onSingleTextChange(e.target.value)}
              rows={compact ? 6 : 7}
              maxLength={20000}
              disabled={isLoading}
              placeholder="Tell us about yourself, your thoughts, your interests, or how you see the world..."
              className="w-full rounded-2xl border border-black/[0.1] bg-[#FAF9F6] px-5 py-4 text-[15px] leading-relaxed text-[#1E2430] placeholder:text-[#8B93A4] focus:outline-none focus:bg-white focus:border-[#33A474] focus:ring-4 focus:ring-[#33A474]/15 transition-all duration-150 resize-y disabled:opacity-60"
            />

            {isSingleBrief && (
              <div
                role="status"
                className="flex items-start gap-2.5 rounded-xl bg-[#FEF9EC] border border-[#F2DFB0] px-4 py-3 text-xs sm:text-sm text-[#7A530B]"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Insufficient text warning: very brief samples carry limited linguistic signal. Adding a few more sentences helps, though you can still submit as-is.
                </span>
              </div>
            )}
          </div>
        )}

        {/* MODE 2: MULTIPLE POSTS */}
        {mode === 'multiple' && (
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-[#525B6E] leading-relaxed">
              Add separate journal entries, comments, or reflections. Each post stays separate and is sent as a list so the backend can clean and join them identically to training.
            </p>

            <div className="space-y-3.5">
              {multiplePosts.map((post, index) => {
                const postWords = countWords(post);
                return (
                  <div
                    key={index}
                    className="rounded-2xl border border-black/[0.08] bg-[#FAF9F6] p-4 space-y-2.5 transition-colors focus-within:bg-white focus-within:border-[#33A474]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <label
                        htmlFor={`personalens-post-${index}`}
                        className="text-xs font-semibold text-[#374151]"
                      >
                        Post {index + 1}
                      </label>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[#6B7280] tabular-nums">
                          {postWords} {postWords === 1 ? 'word' : 'words'}
                        </span>
                        {multiplePosts.length > 1 && (
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleRemovePost(index)}
                            aria-label={`Remove Post ${index + 1}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-[#6B7280] hover:text-[#9B2C2C] hover:bg-[#FDF2F2] transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <textarea
                      id={`personalens-post-${index}`}
                      value={post}
                      onChange={(e) => handlePostChange(index, e.target.value)}
                      rows={3}
                      maxLength={10000}
                      disabled={isLoading}
                      placeholder={`Write sample post #${index + 1}...`}
                      className="w-full bg-transparent text-[15px] leading-relaxed text-[#1E2430] placeholder:text-[#8B93A4] focus:outline-none resize-y disabled:opacity-60"
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <button
                type="button"
                disabled={isLoading || multiplePosts.length >= 20}
                onClick={handleAddPost}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-black/[0.1] bg-white hover:bg-[#F5F4F0] text-xs sm:text-sm font-semibold text-[#1E2430] transition-colors cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4 text-[#33A474]" />
                Add Another Post
              </button>

              <span className="text-xs text-[#6B7280] tabular-nums">
                {multiplePosts.length} {multiplePosts.length === 1 ? 'field' : 'fields'} · {totalMultipleWords} total {totalMultipleWords === 1 ? 'word' : 'words'}
              </span>
            </div>

            {isMultipleBrief && (
              <div
                role="status"
                className="flex items-start gap-2.5 rounded-xl bg-[#FEF9EC] border border-[#F2DFB0] px-4 py-3 text-xs sm:text-sm text-[#7A530B]"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Insufficient text warning: combined posts are still quite brief. Adding more detail across posts can provide stronger signal, though you may submit at any time.
                </span>
              </div>
            )}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl bg-[#FDF2F2] border border-[#F5C6C6] px-4 py-3 text-sm text-[#9B2C2C]"
          >
            {error}
          </div>
        )}

        {/* Samples + Primary Submit */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pt-2 border-t border-black/[0.06]">
          {mode === 'single' ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-[#6B7280] mr-1">Try a sample:</span>
              {SAMPLE_WRITING_PROMPTS.map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  disabled={isLoading}
                  onClick={() => onSingleTextChange(sample.text)}
                  className="px-3 py-1.5 rounded-lg bg-[#F3F4F6] hover:bg-[#E7EAEF] text-xs font-medium text-[#374151] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                >
                  {sample.label}
                </button>
              ))}
              {singleText.length > 0 && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => onSingleTextChange('')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#6B7280] hover:text-[#1E2430] hover:bg-black/[0.04] transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Clear
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => onMultiplePostsChange([...SAMPLE_MULTI_POSTS])}
                className="px-3 py-1.5 rounded-lg bg-[#F3F4F6] hover:bg-[#E7EAEF] text-xs font-medium text-[#374151] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                Load sample posts
              </button>
              {multiplePosts.some((p) => p.length > 0) || multiplePosts.length > 2 ? (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleResetMultiple}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#6B7280] hover:text-[#1E2430] hover:bg-black/[0.04] transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Posts
                </button>
              ) : null}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-[#33A474] hover:bg-[#298B61] active:bg-[#237753] disabled:bg-[#9FD3BC] text-white text-sm sm:text-base font-semibold shadow-sm transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#33A474]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending to Model...
              </>
            ) : (
              <>
                Analyze My Personality
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-[#6B7280] leading-relaxed">
          Experimental prediction only: estimates self-reported MBTI labels from writing and is not an official psychological assessment. Submitted writing is preprocessed with <span className="font-mono">clean_posts</span> and never stored.
        </p>
      </form>
    </div>
  );
};
