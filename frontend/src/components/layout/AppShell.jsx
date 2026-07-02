import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../lib/api';
import StaggeredMenu from './StaggeredMenu';
import UserProfileDropdown from './UserProfileDropdown';
import SettingsModal from '../../features/settings/SettingsModal';

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const fetchNotifs = useCallback(async () => {
    try {
      const data = await api.get('/procurement/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchNotifs(); const iv = setInterval(fetchNotifs, 30000); return () => clearInterval(iv); }, [fetchNotifs]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markRead = async (id) => {
    try { await api.put(`/procurement/notifications/${id}/read`); fetchNotifs(); } catch { /* silent */ }
  };
  const markAllRead = async () => {
    try { await api.put('/procurement/notifications/read-all'); fetchNotifs(); } catch { /* silent */ }
  };

  const userPerms = useAuthStore((s) => s.user?.permissions);
  if (!userPerms?.includes('notification:read')) return null;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="relative touch-target flex items-center justify-center w-10 h-10 rounded-lg text-graphite hover:text-obsidian hover:bg-bone transition-colors" type="button" aria-label="Notifications">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-paper border border-silver rounded-xl shadow-lg z-50 max-h-[480px] overflow-y-auto hide-scrollbar">
          <div className="flex items-center justify-between px-4 py-3 border-b border-silver">
            <span className="text-caption font-medium text-obsidian">Notifications</span>
            {unreadCount > 0 && <button onClick={markAllRead} className="text-caption text-lilac-bloom hover:underline" type="button">Mark all read</button>}
          </div>
          {notifications.length === 0 ? (
            <p className="text-body text-slate text-center py-6">No notifications</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className={`px-4 py-3 border-b border-silver/50 hover:bg-bone/50 transition-colors ${!n.isRead ? 'bg-lilac-bloom/5' : ''}`} onClick={() => { if (!n.isRead) markRead(n.id); }}>
                <p className="text-body font-medium text-obsidian">{n.title}</p>
                <p className="text-body text-graphite mt-0.5">{n.message}</p>
                <p className="text-caption text-slate mt-0.5">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function AppShell({ children }) {
  const navigate = useNavigate();
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
              className={`h-9 w-auto transition-opacity duration-200 cursor-pointer ${isAdmin && menuOpen ? 'invisible' : ''}`}
              onClick={() => navigate('/dashboard')}
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
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

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
