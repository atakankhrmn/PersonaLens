import React, { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { GROUP_ORDER, PERSONALITY_GROUPS, PERSONALITY_TYPES } from '../data/personalities';
import { PersonalityGroupId, PersonalityTypeInfo } from '../types/personality';
import { PersonalityIllustration } from './PersonalityIllustration';

interface PersonalityTypesSectionProps {
  onSelectType: (personality: PersonalityTypeInfo) => void;
  showFilterBar?: boolean;
  heading?: string;
  subheading?: string;
}

export const PersonalityTypesSection: React.FC<PersonalityTypesSectionProps> = ({
  onSelectType,
  showFilterBar = true,
  heading = 'Explore the 16 Personality Types',
  subheading = 'Grouped into four foundational temperaments—Analysts, Diplomats, Sentinels, and Explorers—each with its own voice and perspective.',
}) => {
  const [selectedGroup, setSelectedGroup] = useState<'all' | PersonalityGroupId>('all');

  const visibleGroups =
    selectedGroup === 'all' ? GROUP_ORDER : GROUP_ORDER.filter((g) => g === selectedGroup);

  return (
    <section className="space-y-12" aria-labelledby="personality-types-heading">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="max-w-2xl space-y-3">
          <h2
            id="personality-types-heading"
            className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#1E2430] [text-wrap:balance]"
          >
            {heading}
          </h2>
          <p className="text-base text-[#525B6E] leading-relaxed">{subheading}</p>
        </div>

        {showFilterBar && (
          <div
            role="tablist"
            aria-label="Filter personality groups"
            className="inline-flex flex-wrap items-center gap-1 p-1.5 rounded-2xl bg-[#F0EFEA] border border-black/[0.05] self-start"
          >
            <button
              type="button"
              role="tab"
              aria-selected={selectedGroup === 'all'}
              onClick={() => setSelectedGroup('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer ${
                selectedGroup === 'all'
                  ? 'bg-white text-[#1E2430] shadow-sm'
                  : 'text-[#5A6375] hover:text-[#1E2430]'
              }`}
            >
              All Groups (16)
            </button>
            {GROUP_ORDER.map((groupId) => {
              const group = PERSONALITY_GROUPS[groupId];
              const isActive = selectedGroup === groupId;
              return (
                <button
                  key={groupId}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setSelectedGroup(groupId)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-white shadow-sm'
                      : 'text-[#5A6375] hover:text-[#1E2430]'
                  }`}
                  style={isActive ? { color: group.inkHex } : undefined}
                >
                  {group.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-16">
        {visibleGroups.map((groupId) => {
          const group = PERSONALITY_GROUPS[groupId];
          const typesInGroup = PERSONALITY_TYPES.filter((t) => t.group === groupId);

          return (
            <div key={groupId} className="space-y-6">
              {/* Group Header */}
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 pb-4 border-b border-black/[0.07]">
                <div className="space-y-1.5">
                  <div className="flex items-baseline gap-3">
                    <h3
                      className="font-display text-2xl sm:text-3xl font-bold tracking-tight"
                      style={{ color: group.inkHex }}
                    >
                      {group.name}
                    </h3>
                    <span className="text-xs font-medium text-[#6B7280]">
                      {group.tagline}
                    </span>
                  </div>
                  <p className="text-sm sm:text-base text-[#525B6E] max-w-2xl">
                    {group.description}
                  </p>
                </div>
              </div>

              {/* 4 Cards Per Row on Desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {typesInGroup.map((personality) => (
                  <button
                    key={personality.code}
                    type="button"
                    onClick={() => onSelectType(personality)}
                    className="group text-left rounded-3xl p-6 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1.5 hover:shadow-[0_18px_36px_-14px_rgba(30,36,48,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 cursor-pointer border"
                    style={{
                      backgroundColor: group.cardBgHex,
                      borderColor: group.borderHex,
                    }}
                  >
                    <div>
                      {/* Prominent Character Illustration */}
                      <div className="flex items-center justify-center pt-1 pb-4">
                        <PersonalityIllustration
                          code={personality.code}
                          title={`${personality.code} — ${personality.title}`}
                          className="w-40 h-40 sm:w-44 sm:h-44 transition-transform duration-200 group-hover:scale-[1.04]"
                        />
                      </div>

                      {/* Clean Card Identity */}
                      <div className="space-y-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span
                            className="font-mono text-sm font-semibold tracking-wider"
                            style={{ color: group.inkHex }}
                          >
                            {personality.code}
                          </span>
                          <span aria-hidden="true" className="text-[#9CA3AF]">
                            ·
                          </span>
                          <span className="text-xs font-medium text-[#6B7280]">
                            {group.name}
                          </span>
                        </div>

                        <h4 className="font-display text-xl font-bold text-[#1E2430] tracking-tight">
                          {personality.title}
                        </h4>

                        <p className="text-sm text-[#4B5364] leading-relaxed">
                          {personality.shortDescription}
                        </p>
                      </div>
                    </div>

                    <div
                      className="mt-5 pt-4 border-t flex items-center justify-center gap-1.5 text-xs font-semibold transition-opacity duration-150 opacity-80 group-hover:opacity-100"
                      style={{
                        borderColor: group.borderHex,
                        color: group.inkHex,
                      }}
                    >
                      <span>Read profile</span>
                      <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
