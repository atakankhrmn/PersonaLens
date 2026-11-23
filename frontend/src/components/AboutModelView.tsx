import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { GROUP_ORDER, PERSONALITY_GROUPS } from '../data/personalities';

const FASTAPI_CONTRACT_SNIPPET = `POST /api/analyze
Content-Type: application/json

Request (Single Text or Multiple Posts):
{
  "texts": [
    "First writing sample...",
    "Second writing sample..."
  ],
  "input_mode": "multiple" // or "single"
}

Response (JSON):
{
  "predicted_type": "INTP",
  "scores": {
    "EI": 0.21,  // Probability of E (I=0, E=1)
    "NS": 0.88,  // Probability of N (S=0, N=1)
    "FT": 0.74,  // Probability of T (F=0, T=1)
    "JP": 0.32   // Probability of J (P=0, J=1)
  },
  "model_version": "tfidf_logreg_v1"
}`;

interface AboutModelViewProps {
  onGoToAnalyze: () => void;
}

export const AboutModelView: React.FC<AboutModelViewProps> = ({ onGoToAnalyze }) => {
  const [copiedContract, setCopiedContract] = useState(false);

  const handleCopyContract = async () => {
    try {
      await navigator.clipboard.writeText(FASTAPI_CONTRACT_SNIPPET);
      setCopiedContract(true);
      setTimeout(() => setCopiedContract(false), 2000);
    } catch {
      // Ignore clipboard permission errors silently
    }
  };

  return (
    <div className="space-y-12 max-w-4xl mx-auto">
      <div className="space-y-4">
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#1E2430] [text-wrap:balance]">
          About the PersonaLens Pipeline
        </h1>
        <p className="text-base sm:text-lg text-[#525B6E] leading-relaxed">
          PersonaLens is an experimental machine learning project trained on PersonalityCafe forum writing (8,675 users) to predict self-reported MBTI labels across four binary axes—while strictly preventing label leakage and never storing user input.
        </p>
      </div>

      {/* Four Binary Classifiers */}
      <section className="rounded-3xl bg-white border border-black/[0.08] p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <h2 className="font-display text-2xl font-bold text-[#1E2430]">
            Four Binary Classifiers & Scoring Convention
          </h2>
          <p className="text-sm text-[#525B6E] leading-relaxed">
            Both Single Text and Multiple Posts modes invoke the same four binary classifiers and combine their outputs into a four-letter MBTI prediction.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl bg-[#FAF9F6] border border-black/[0.05] space-y-1.5">
            <div className="font-mono text-xs font-semibold text-[#88619A]">EI · I=0 / E=1</div>
            <h3 className="font-display text-lg font-bold text-[#1E2430]">
              Introverted (I) vs. Extraverted (E)
            </h3>
            <p className="text-sm text-[#4B5364] leading-relaxed">
              The <span className="font-mono">EI</span> score reports the predicted probability of Extraversion (<span className="font-mono">E</span>) between 0.0 and 1.0.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-[#FAF9F6] border border-black/[0.05] space-y-1.5">
            <div className="font-mono text-xs font-semibold text-[#33A474]">NS · S=0 / N=1</div>
            <h3 className="font-display text-lg font-bold text-[#1E2430]">
              Observant (S) vs. Intuitive (N)
            </h3>
            <p className="text-sm text-[#4B5364] leading-relaxed">
              The <span className="font-mono">NS</span> score reports the predicted probability of Intuition (<span className="font-mono">N</span>) between 0.0 and 1.0.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-[#FAF9F6] border border-black/[0.05] space-y-1.5">
            <div className="font-mono text-xs font-semibold text-[#4298B4]">FT · F=0 / T=1</div>
            <h3 className="font-display text-lg font-bold text-[#1E2430]">
              Feeling (F) vs. Thinking (T)
            </h3>
            <p className="text-sm text-[#4B5364] leading-relaxed">
              The <span className="font-mono">FT</span> score reports the predicted probability of Thinking (<span className="font-mono">T</span>) between 0.0 and 1.0.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-[#FAF9F6] border border-black/[0.05] space-y-1.5">
            <div className="font-mono text-xs font-semibold text-[#BD881D]">JP · P=0 / J=1</div>
            <h3 className="font-display text-lg font-bold text-[#1E2430]">
              Prospecting (P) vs. Judging (J)
            </h3>
            <p className="text-sm text-[#4B5364] leading-relaxed">
              The <span className="font-mono">JP</span> score reports the predicted probability of Judging (<span className="font-mono">J</span>) between 0.0 and 1.0.
            </p>
          </div>
        </div>
      </section>

      {/* Leakage-Free ETL & Data Warehouse */}
      <section className="rounded-3xl bg-white border border-black/[0.08] p-6 sm:p-8 space-y-4">
        <h2 className="font-display text-2xl font-bold text-[#1E2430]">
          Leakage-Free Preprocessing & Privacy
        </h2>
        <div className="space-y-3 text-sm sm:text-[15px] text-[#4B5364] leading-relaxed">
          <p>
            <strong className="text-[#1E2430]">Identical Train & Inference Cleaning:</strong>{' '}
            Before inference, the list of submitted posts passes through <span className="font-mono text-[#205B70]">src.etl.cleaning.clean_posts</span>, which fixes encoding artefacts, drops empty or duplicate entries, masks typology leakage (<span className="font-mono">&lt;MBTI_TYPE&gt;</span>, <span className="font-mono">&lt;MBTI_TERM&gt;</span>, <span className="font-mono">&lt;COGNITIVE_FUNCTION&gt;</span>, <span className="font-mono">&lt;TYPOLOGY_TERM&gt;</span>), and preserves the model’s <span className="font-mono">&lt;POST_SEP&gt;</span> separator.
          </p>
          <p>
            <strong className="text-[#1E2430]">Zero User Text Storage:</strong>{' '}
            Following <span className="font-mono text-[#205B70]">src.dw.predictions.log_app_prediction</span>, only predicted type labels, dimension probabilities, and post/word counts are logged to PostgreSQL—submitted text is never stored.
          </p>
          <p>
            <strong className="text-[#1E2430]">Experimental Disclaimer:</strong>{' '}
            This system explores statistical language patterns associated with self-reported MBTI forum labels. It is not a validated clinical or official MBTI® psychological assessment.
          </p>
        </div>
      </section>

      {/* Four Personality Families */}
      <section className="rounded-3xl bg-white border border-black/[0.08] p-6 sm:p-8 space-y-5">
        <h2 className="font-display text-2xl font-bold text-[#1E2430]">
          Four Personality Families
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {GROUP_ORDER.map((id) => {
            const g = PERSONALITY_GROUPS[id];
            return (
              <div
                key={id}
                className="p-5 rounded-2xl border space-y-1.5"
                style={{ backgroundColor: g.cardBgHex, borderColor: g.borderHex }}
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="font-display text-lg font-bold" style={{ color: g.inkHex }}>
                    {g.name}
                  </h3>
                  <span className="text-xs font-medium text-[#5A6375]">{g.tagline}</span>
                </div>
                <p className="text-sm text-[#4B5364] leading-relaxed">{g.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* FastAPI Backend Integration Contract */}
      <section className="rounded-3xl bg-white border border-black/[0.08] p-6 sm:p-8 space-y-5">
        <div className="space-y-2">
          <h2 className="font-display text-2xl font-bold text-[#1E2430]">
            FastAPI Integration Contract
          </h2>
          <p className="text-sm text-[#4B5364] leading-relaxed">
            The trained scikit-learn models are not yet connected on the <span className="font-mono">main</span> branch. Once the Python FastAPI service is running, configure <span className="font-mono">PYTHON_API_URL</span> to connect <span className="font-mono">POST /api/analyze</span> using the list-based contract below.
          </p>
        </div>

        <div className="rounded-2xl bg-[#FAF9F6] border border-black/[0.08] overflow-hidden">
          <div className="px-4 py-3 border-b border-black/[0.06] flex items-center justify-between">
            <span className="text-xs font-semibold text-[#374151]">
              POST /api/analyze JSON Contract
            </span>
            <button
              type="button"
              onClick={handleCopyContract}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-black/[0.08] text-xs font-medium text-[#1E2430] hover:bg-[#F3F4F6] transition-colors cursor-pointer"
            >
              {copiedContract ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#33A474]" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Contract
                </>
              )}
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-[#374151] overflow-x-auto leading-relaxed">
            {FASTAPI_CONTRACT_SNIPPET}
          </pre>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onGoToAnalyze}
            className="px-6 py-3 rounded-xl bg-[#33A474] hover:bg-[#298B61] text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            Go to Text Analyzer
          </button>
        </div>
      </section>
    </div>
  );
};
