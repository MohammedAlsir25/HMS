import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { api } from '../../lib/api';
import Sidebar from './Sidebar';
import UserProfileDropdown from './UserProfileDropdown';
import SyncStatusBadge from './SyncStatusBadge';
import SettingsModal from '../../features/settings/SettingsModal';
import WelcomeToast from '../ui/WelcomeToast';
import TourManager from '../ui/TourManager';
import UpdateManager from '../ui/UpdateManager';
import Breadcrumb from '../ui/Breadcrumb';

let appWindow = null;
async function getWindow() {
  if (typeof window === 'undefined' || !window.__TAURI_INTERNALS__) return null;
  if (!appWindow) {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    appWindow = getCurrentWindow();
  }
  return appWindow;
}

function isTauri() {
  return typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;
}

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
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const user = useAuthStore((s) => s.user);
  const setMobileSidebarOpen = useUIStore((s) => s.setMobileSidebarOpen);

  const handleMinimize = useCallback(async () => {
    const w = await getWindow();
    if (!w) return;
    w.minimize();
  }, []);

  const handleMaximize = useCallback(async () => {
    const w = await getWindow();
    if (!w) return;
    const max = await w.isMaximized();
    if (max) {
      w.unmaximize();
      setIsMaximized(false);
    } else {
      w.maximize();
      setIsMaximized(true);
    }
  }, []);

  const handleClose = useCallback(async () => {
    const w = await getWindow();
    if (!w) return;
    w.close();
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    let unlisten;
    (async () => {
      const w = await getWindow();
      setIsMaximized(await w.isMaximized());
      const { listen } = await import('@tauri-apps/api/event');
      unlisten = await listen('tauri://resize', async () => {
        setIsMaximized(await w.isMaximized());
      });
    })();
    return () => { if (unlisten) unlisten(); };
  }, []);

  return (
    <div className="relative h-dvh flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 ml-0 md:ml-16 lg:ml-72 transition-all duration-300">
        <WelcomeToast />

        <header className="sticky top-0 z-20 bg-paper/90 backdrop-blur-sm border-b border-silver/50 pt-1" data-tauri-drag-region>
          <div className="mx-auto flex items-center gap-3 px-4 md:px-6 lg:px-8 py-2" style={{ maxWidth: '1440px' }} data-tauri-drag-region="">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden shrink-0 touch-target flex items-center justify-center w-10 h-10 rounded-lg text-graphite hover:text-obsidian hover:bg-bone transition-colors"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              <NotificationBell />
              <TourManager />
              <SyncStatusBadge />
              <UserProfileDropdown onSettings={() => setSettingsOpen(true)} />
              {isTauri() && (
              <div className="flex items-center ml-1 md:ml-2 -mr-2 md:-mr-3">
                <button onClick={handleMinimize} className="w-[46px] h-[32px] flex items-center justify-center text-graphite hover:text-obsidian hover:bg-bone transition-colors rounded-none" type="button" aria-label="Minimize">
                  <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor"><rect width="10" height="1" /></svg>
                </button>
                <button onClick={handleMaximize} className="w-[46px] h-[32px] flex items-center justify-center text-graphite hover:text-obsidian hover:bg-bone transition-colors rounded-none" type="button" aria-label={isMaximized ? 'Restore' : 'Maximize'}>
                  {isMaximized ? (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="1" y="3" width="7" height="7" /><rect x="3" y="1" width="7" height="7" fill="transparent" /></svg>
                  ) : (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="1" y="1" width="8" height="8" /></svg>
                  )}
                </button>
                <button onClick={handleClose} className="w-[46px] h-[32px] flex items-center justify-center text-graphite hover:text-white hover:bg-red-500 transition-colors rounded-none" type="button" aria-label="Close">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 1l8 8M9 1l-8 8" /></svg>
                </button>
              </div>
              )}
            </div>
          </div>
        </header>

        <UpdateManager compact />

        <main
          className="flex-1 p-4 md:p-6 lg:p-8 flex flex-col overflow-y-auto"
          style={{ scrollBehavior: 'smooth' }}
        >
          <div className="mx-auto w-full flex-1 flex flex-col" style={{ maxWidth: '1440px' }}>
            <Breadcrumb />
            {children}
          </div>
        </main>

        <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </div>
    </div>
  );
}
