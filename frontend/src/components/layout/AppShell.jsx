import { useState, useCallback } from 'react';
import { useResponsive } from '../../hooks/useResponsive';
import StaggeredMenu from './StaggeredMenu';
import TabletNav from './TabletNav';

export default function AppShell({ children }) {
  const { isMobile } = useResponsive();
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = useCallback((forced) => {
    setMenuOpen((prev) => (forced !== undefined ? forced : !prev));
  }, []);

  return (
    <div className="relative min-h-screen">
      <StaggeredMenu position="left" isFixed isOpen={menuOpen} onToggle={toggleMenu} />

      <main
        className="min-h-screen p-4 md:p-6 lg:p-8 pt-24"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="mx-auto flex items-start gap-3" style={{ maxWidth: '1440px' }}>
          <button
            onClick={toggleMenu}
            className="shrink-0 mt-1 touch-target flex items-center justify-center w-12 h-12 rounded-lg text-graphite hover:text-obsidian hover:bg-bone transition-colors"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            type="button"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              {menuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M3 12h18M3 6h18M3 18h18" />
              )}
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            {children}
          </div>
        </div>
      </main>

      {isMobile && <TabletNav />}
    </div>
  );
}
