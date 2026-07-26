import { useLocation } from 'react-router-dom';
import { PanelLeftClose, PanelLeft, LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { getVisibleNav } from '../../config/navigation';
import SidebarGroup from './SidebarGroup';

export default function Sidebar() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);
  const mobileSidebarOpen = useUIStore((s) => s.mobileSidebarOpen);
  const setMobileSidebarOpen = useUIStore((s) => s.setMobileSidebarOpen);

  const userPermissions = user?.permissions || [];
  const visibleGroups = getVisibleNav(userPermissions);
  const collapsed = sidebarCollapsed;
  const pathname = location.pathname;

  return (
    <>
      <aside
        className={`fixed top-0 left-0 h-dvh bg-paper border-r border-silver/50 flex flex-col z-30 transition-all duration-300
          ${collapsed ? 'w-16' : 'w-72'}
          max-md:fixed max-md:hidden
          ${mobileSidebarOpen ? 'max-md:!flex max-md:translate-x-0' : ''}
        `}
      >
        <div className="flex items-center gap-3 px-4 py-4 border-b border-silver/50 shrink-0">
          <img src="/logo.png" alt="Al Jawarih" className="h-9 w-auto shrink-0" />
          {!collapsed && <span className="text-body font-semibold text-obsidian truncate">Al Jawarih</span>}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {visibleGroups.map(group => (
            <SidebarGroup key={group.key} group={group} collapsed={collapsed} pathname={pathname} />
          ))}
        </nav>

        <div className="mt-auto border-t border-silver px-3 py-3">
          {collapsed ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-lilac-bloom/20 flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-obsidian">
                  {user?.fullName?.charAt(0) || '?'}
                </span>
              </div>
              <button
                onClick={logout}
                className="flex items-center justify-center w-9 h-9 rounded-lg text-graphite hover:text-red-500 hover:bg-bone transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-lilac-bloom/20 flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold text-obsidian">
                    {user?.fullName?.charAt(0) || '?'}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-body font-medium text-obsidian truncate">{user?.fullName || 'User'}</p>
                  <p className="text-caption text-slate truncate">{user?.role || ''}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="flex items-center justify-center w-9 h-9 rounded-lg text-graphite hover:text-red-500 hover:bg-bone transition-colors shrink-0"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => setSidebarCollapsed(!collapsed)}
          className="hidden md:flex items-center justify-center w-full py-2 border-t border-silver/50 text-graphite hover:text-obsidian hover:bg-bone transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </button>
      </aside>

      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-obsidian/30 z-20 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
    </>
  );
}
