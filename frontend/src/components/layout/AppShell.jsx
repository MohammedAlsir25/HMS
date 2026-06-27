import { useState, useCallback } from 'react';
import { useResponsive } from '../../hooks/useResponsive';
import { useAuthStore } from '../../stores/authStore';
import StaggeredMenu from './StaggeredMenu';
import TabletNav from './TabletNav';
import UserProfileDropdown from './UserProfileDropdown';
import SettingsModal from '../../features/settings/SettingsModal';

export default function AppShell({ children }) {
  const { isMobile } = useResponsive();
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'Super Admin';

  const toggleMenu = useCallback((forced) => {
    setMenuOpen((prev) => (forced !== undefined ? forced : !prev));
  }, []);

  return (
    <div className="relative min-h-screen">
      {isAdmin && <StaggeredMenu position="left" isFixed isOpen={menuOpen} onToggle={toggleMenu} />}

      <header className="sticky top-0 z-20 bg-paper/90 backdrop-blur-sm border-b border-silver/50">
        <div className="mx-auto flex items-center gap-3 px-4 md:px-6 lg:px-8 py-2" style={{ maxWidth: '1440px' }}>
          {isAdmin && (
            <button
              onClick={toggleMenu}
              className="shrink-0 touch-target flex items-center justify-center w-12 h-12 rounded-lg text-graphite hover:text-obsidian hover:bg-bone transition-colors"
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
          )}
          <div className="flex-1 flex justify-center">
            <img
              src="/logo.png"
              alt="Al Jawarih"
              className={`h-9 w-auto transition-opacity duration-200 ${isAdmin && menuOpen ? 'invisible' : ''}`}
            />
          </div>
          <div className="ml-auto">
            <UserProfileDropdown onSettings={() => setSettingsOpen(true)} />
          </div>
        </div>
      </header>

      <main
        className="min-h-screen p-4 md:p-6 lg:p-8"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="mx-auto" style={{ maxWidth: '1440px' }}>
          <div className="flex-1 min-w-0">
            {children}
          </div>
        </div>
      </main>

      {isMobile && <TabletNav />}

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
