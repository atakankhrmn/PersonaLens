import React, { useEffect } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { PERSONALITY_GROUPS } from '../data/personalities';
import { PersonalityTypeInfo } from '../types/personality';
import { PersonalityIllustration } from './PersonalityIllustration';

interface PersonalityDetailModalProps {
  personality: PersonalityTypeInfo | null;
  onClose: () => void;
  onGoToAnalyze: () => void;
}

export const PersonalityDetailModal: React.FC<PersonalityDetailModalProps> = ({
  personality,
  onClose,
  onGoToAnalyze,
}) => {
  useEffect(() => {
    if (!personality) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [personality, onClose]);

  if (!personality) return null;

  const group = PERSONALITY_GROUPS[personality.group];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#1E2430]/40 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-personality-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-3xl bg-white border border-black/[0.08] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close personality details"
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-[#374151] shadow-xs transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div
          className="px-6 sm:px-8 pt-8 pb-6 flex flex-col sm:flex-row items-center gap-6"
          style={{ backgroundColor: group.softBgHex }}
        >
          <PersonalityIllustration
            code={personality.code}
            title={`${personality.code} — ${personality.title}`}
            className="w-40 h-40 shrink-0"
          />

          <div className="space-y-2 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-semibold">
              <span className="font-mono tracking-wider" style={{ color: group.inkHex }}>
                {personality.code}
              </span>
              <span aria-hidden="true" className="text-[#9CA3AF]">
                ·
              </span>
              <span style={{ color: group.inkHex }}>{group.name}</span>
              <span aria-hidden="true" className="text-[#9CA3AF]">
                ·
              </span>
              <span className="text-[#5A6375] font-normal">{group.tagline}</span>
            </div>
            <h3
              id="modal-personality-title"
              className="font-display text-3xl font-bold text-[#1E2430] tracking-tight"
            >
              {personality.title}
            </h3>
            <p className="text-sm sm:text-base text-[#4B5364] leading-relaxed">
              {personality.shortDescription}
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <h4 className="font-display text-base font-semibold text-[#1E2430]">
              Archetype Overview
            </h4>
            <p className="text-[15px] text-[#4B5364] leading-relaxed">
              {personality.fullDescription}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-black/[0.06]">
            <div className="space-y-2">
              <h4 className="font-display text-sm font-semibold text-[#1E2430]">
                Signature Strengths
              </h4>
              <ul className="space-y-1.5 text-sm text-[#4B5364]">
                {personality.strengths.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: group.accentHex }}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-display text-sm font-semibold text-[#1E2430]">
                Typical Writing Voice
              </h4>
              <p className="text-sm text-[#4B5364] leading-relaxed">
                {personality.writingVoice}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-black/[0.06] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="text-xs text-[#6B7280]">
              Curious if your own writing matches {personality.code}?
            </span>
            <button
              type="button"
              onClick={() => {
                onClose();
                onGoToAnalyze();
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 cursor-pointer whitespace-nowrap"
              style={{ backgroundColor: group.accentHex }}
            >
              Test Your Writing
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
