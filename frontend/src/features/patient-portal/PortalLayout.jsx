import { useState, useRef, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { Menu, Bell, LogOut, X } from 'lucide-react';
import { usePortalAuth } from './hooks/usePortalAuth';

function NotificationBell() {
  return (
    <button className="relative touch-target flex items-center justify-center w-10 h-10 rounded-lg text-graphite hover:text-obsidian hover:bg-bone transition-colors" type="button" aria-label="Notifications">
      <Bell className="w-5 h-5" />
    </button>
  );
}

export default function PortalLayout() {
  const { patient, logout, isAuthenticated } = usePortalAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/portal/login');
  }, [logout, navigate]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMobileMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-dvh flex flex-col bg-gray-50">
      <header className="sticky top-0 z-20 bg-white border-b border-silver shadow-sm">
        <div className="mx-auto flex items-center justify-between px-4 md:px-6 lg:px-8 h-16" style={{ maxWidth: '1200px' }}>
          <div className="flex items-center gap-3">
            <Link to="/portal/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-lilac-bloom flex items-center justify-center text-obsidian font-bold text-sm">JH</div>
              <span className="text-subheading font-semibold text-obsidian hidden sm:inline">AL Jawahir</span>
            </Link>
          </div>

          {isAuthenticated && patient && (
            <div className="hidden md:flex items-center gap-3">
              <span className="text-body text-graphite">{patient.fullName}</span>
              <NotificationBell />
              <button
                onClick={handleLogout}
                className="touch-target flex items-center justify-center w-10 h-10 rounded-lg text-graphite hover:text-red-500 hover:bg-bone transition-colors"
                type="button"
                aria-label="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}

          {isAuthenticated && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden touch-target flex items-center justify-center w-10 h-10 rounded-lg text-graphite hover:text-obsidian hover:bg-bone transition-colors"
              type="button"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
        </div>

        {mobileMenuOpen && isAuthenticated && (
          <div ref={menuRef} className="md:hidden border-t border-silver bg-white px-4 py-3 space-y-2">
            <p className="text-body font-medium text-obsidian">{patient?.fullName}</p>
            <button onClick={handleLogout} className="flex items-center gap-2 text-body text-red-500" type="button">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="mx-auto w-full" style={{ maxWidth: '1200px' }}>
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-silver bg-white py-4 px-4 text-center text-caption text-slate">
        AL Jawahir Hospital &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
