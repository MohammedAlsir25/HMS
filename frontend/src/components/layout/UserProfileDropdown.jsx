import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Avatar } from '../ui/Avatar';

export default function UserProfileDropdown({ onSettings }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(e.target) &&
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) {
        close();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;

    const updatePos = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setPos({
          top: rect.bottom + 8,
          right: document.documentElement.clientWidth - rect.right,
        });
      }
    };

    updatePos();
    document.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);

    return () => {
      document.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open, close]);

  if (!user) return null;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-bone transition-colors touch-target"
        aria-label="User menu"
        aria-expanded={open}
        type="button"
      >
        <Avatar src={user.avatarUrl} name={user.fullName} size="md" />
        <span className="text-body text-obsidian hidden md:inline">{user.fullName}</span>
      </button>

      {open && (
        <div
          ref={menuRef}
          className="fixed z-50 w-64 bg-paper border border-silver rounded-xl shadow-md py-2 animate-in fade-in slide-in-from-top-2 duration-150"
          style={{ top: `${pos.top}px`, right: `${pos.right}px` }}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <Avatar src={user.avatarUrl} name={user.fullName} size="md" />
            <div className="min-w-0">
              <p className="text-body font-medium text-obsidian truncate">{user.fullName}</p>
              {user.clinic?.name && (
                <p className="text-caption text-slate truncate">{user.clinic.name}</p>
              )}
            </div>
          </div>

          <div className="border-t border-silver my-1" />

          <button
            onClick={() => { close(); onSettings?.(); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-body text-obsidian hover:bg-bone transition-colors touch-target"
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
            Settings
          </button>

          <button
            onClick={() => { close(); logout(); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-body text-red-600 hover:bg-bone transition-colors touch-target"
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Sign Out
          </button>
        </div>
      )}
    </>
  );
}
