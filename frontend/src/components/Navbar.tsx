import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { AppRoute } from '../types/personality';

interface NavbarProps {
  activeRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
}

const NAV_ITEMS: { id: AppRoute; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'types', label: 'Personality Types' },
  { id: 'analyze', label: 'Analyze Text' },
  { id: 'insights', label: 'Data Insights' },
  { id: 'about', label: 'About the Model' },
];

export const Navbar: React.FC<NavbarProps> = ({ activeRoute, onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (route: AppRoute) => {
    setMobileMenuOpen(false);
    onNavigate(route);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF9F6]/90 backdrop-blur-md border-b border-black/[0.06]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => handleNavClick('home')}
          className="font-display text-xl font-bold tracking-tight text-[#1E2430] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#33A474] rounded-md px-1"
        >
          PersonaLens
        </button>

        {/* Zone 2: Clean single-line navigation links */}
        <nav className="hidden md:flex items-center gap-7" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = activeRoute === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`relative py-1.5 text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#33A474] rounded-sm ${
                  isActive
                    ? 'text-[#1E2430]'
                    : 'text-[#5A6375] hover:text-[#1E2430]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[#33A474]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleNavClick('analyze')}
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[#1E2430] text-white text-sm font-semibold hover:bg-[#313A4D] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1E2430]"
          >
            Analyze My Text
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl text-[#1E2430] hover:bg-black/5 transition-colors cursor-pointer"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-black/[0.06] bg-[#FAF9F6] px-4 py-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activeRoute === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#ECF7F1] text-[#1D6446]'
                    : 'text-[#4B5364] hover:bg-black/[0.04]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
