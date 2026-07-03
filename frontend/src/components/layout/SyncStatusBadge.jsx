import { useState, useEffect } from 'react';
import { syncEngine } from '../../lib/sync/syncEngine';

const COLORS = {
  idle: { dot: 'bg-green-500', ring: 'ring-green-300', label: 'Online' },
  syncing: { dot: 'bg-yellow-400 animate-pulse', ring: 'ring-yellow-200', label: 'Syncing' },
  error: { dot: 'bg-red-500', ring: 'ring-red-300', label: 'Sync error' },
  offline: { dot: 'bg-neutral-400', ring: 'ring-neutral-300', label: 'Offline' },
};

export default function SyncStatusBadge() {
  const [state, setState] = useState({ status: 'idle', lastSyncAt: null, error: null, pendingMutations: 0 });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const unsub = syncEngine.subscribe(setState);
    const onOnline = () => { setIsOnline(true); syncEngine.startAutoSync(); };
    const onOffline = () => { setIsOnline(false); syncEngine.stopAutoSync(); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { unsub(); window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  const displayStatus = !isOnline ? 'offline' : state.status;
  const { dot, ring, label } = COLORS[displayStatus] || COLORS.offline;

  return (
    <button
      className="relative flex items-center justify-center w-10 h-10 rounded-lg hover:bg-bone transition-colors touch-target group"
      onClick={() => { if (isOnline) syncEngine.syncAll(); }}
      title={state.lastSyncAt ? `Last sync: ${new Date(state.lastSyncAt).toLocaleString()}${state.pendingMutations ? ` (${state.pendingMutations} pending)` : ''}` : label}
      type="button"
      aria-label={label}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-graphite">
        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2" />
      </svg>
      {state.pendingMutations > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center bg-amber-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1">
          {state.pendingMutations > 9 ? '9+' : state.pendingMutations}
        </span>
      )}
      <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${dot} ring-2 ${ring}`} />
    </button>
  );
}
