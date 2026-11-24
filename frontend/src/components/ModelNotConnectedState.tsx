import React from 'react';
import { ArrowLeft, Layers, PlugZap } from 'lucide-react';
import { PersonalityIllustration } from './PersonalityIllustration';

interface ModelNotConnectedStateProps {
  message?: string;
  onEditInput: () => void;
  onExploreTypes: () => void;
}

export const ModelNotConnectedState: React.FC<ModelNotConnectedStateProps> = ({
  message,
  onEditInput,
  onExploreTypes,
}) => {
  return (
    <section
      role="status"
      aria-live="polite"
      className="rounded-3xl border border-[#C7E2ED] bg-white shadow-[0_12px_36px_-12px_rgba(30,36,48,0.08)] overflow-hidden"
    >
      <div className="bg-[#ECF5F8] px-6 sm:px-10 py-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-4 flex justify-center">
          <PersonalityIllustration
            code="INTP"
            title="Logician character awaiting model connection"
            className="w-40 h-40 sm:w-44 sm:h-44"
          />
        </div>

        <div className="md:col-span-8 space-y-3 text-center md:text-left">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#205B70]">
            <PlugZap className="w-4 h-4" />
            <span>Prediction Backend Status</span>
            <span aria-hidden="true">·</span>
            <span>Awaiting FastAPI Service</span>
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#1E2430]">
            Model not connected yet
          </h2>

          <p className="text-sm sm:text-base text-[#4B5364] leading-relaxed">
            {message ||
              'The Python prediction API is not running. Start it from the repository root with "python -m src.api" (port 8000) and try again. No simulated or placeholder prediction was generated.'}
          </p>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-6 bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-[#4B5364]">
          <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-black/[0.06] space-y-1">
            <div className="font-semibold text-[#1E2430]">Unified Multi-Post Request</div>
            <p className="text-xs leading-relaxed">
              Both Single Text and Multiple Posts send <span className="font-mono text-[#205B70]">texts: string[]</span> to <span className="font-mono">POST /api/analyze</span> without premature concatenation.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-black/[0.06] space-y-1">
            <div className="font-semibold text-[#1E2430]">Training-Consistent Cleaning</div>
            <p className="text-xs leading-relaxed">
              The Python backend will apply <span className="font-mono text-[#205B70]">src.etl.cleaning.clean_posts</span> and join posts with <span className="font-mono">&lt;POST_SEP&gt;</span> before scikit-learn inference.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-black/[0.06]">
          <button
            type="button"
            onClick={onEditInput}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-black/[0.1] bg-white hover:bg-[#FAF9F6] text-sm font-medium text-[#1E2430] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Edit Writing Sample
          </button>

          <button
            type="button"
            onClick={onExploreTypes}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4298B4] hover:bg-[#36829B] text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            <Layers className="w-4 h-4" />
            Explore All 16 Personality Types
          </button>
        </div>
      </div>
    </section>
  );
};
