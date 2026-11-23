import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface TermTooltipProps {
  term: string;
  definition: string;
}

export const TermTooltip: React.FC<TermTooltipProps> = ({ term, definition }) => {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-flex items-center align-middle"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-label={`Explain ${term}`}
        aria-expanded={open}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[#6B7280] hover:text-[#1E2430] hover:bg-black/[0.05] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#33A474]"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 w-64 rounded-xl bg-[#1E2430] text-white p-3 shadow-lg text-left pointer-events-none"
        >
          <span className="block text-[11px] font-semibold text-[#9BDCC0] mb-1">
            {term}
          </span>
          <span className="block text-xs leading-relaxed text-white/90 font-normal">
            {definition}
          </span>
        </span>
      )}
    </span>
  );
};
