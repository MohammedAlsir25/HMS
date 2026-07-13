import { useState, useEffect, useCallback } from 'react';
import { Button } from './Button';

function isTauri() {
  return typeof window !== 'undefined' && window.__TAURI_INTERNALS__;
}

export default function UpdateManager({ compact = false }) {
  const [tauri, setTauri] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('');
  const [update, setUpdate] = useState(null);
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloaded, setDownloaded] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  const [error, setError] = useState('');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isTauri()) return;
    setTauri(true);
    (async () => {
      try {
        const { getVersion } = await import('@tauri-apps/api/app');
        setCurrentVersion(await getVersion());
      } catch {
        setCurrentVersion('1.1.0');
      }
    })();
  }, []);

  const handleCheck = useCallback(async () => {
    if (!isTauri()) return;
    setChecking(true);
    setError('');
    setUpdate(null);
    setDownloaded(0);
    setTotalSize(0);
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const u = await check();
      if (u) setUpdate(u);
    } catch (err) {
      if (err.code !== 'ERR_MODULE_NOT_FOUND') {
        setError(err.message || 'Failed to check for updates');
      }
    }
    setChecking(false);
  }, []);

  useEffect(() => {
    if (!tauri) return;
    handleCheck();
  }, [tauri, handleCheck]);

  const handleInstall = useCallback(async () => {
    if (!update) return;
    setInstalling(true);
    setError('');
    setProgress(0);
    setDownloaded(0);
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const { restart } = await import('@tauri-apps/plugin-process');
      const u = await check();
      if (!u) { setInstalling(false); return; }
      setTotalSize(u.contentLength || 0);
      await u.downloadAndInstall((event) => {
        if (event.event === 'Started' && event.data.contentLength) {
          setTotalSize(event.data.contentLength);
          setProgress(1);
        }
        if (event.event === 'Progress' && event.data.chunkLength) {
          setDownloaded((prev) => {
            const next = prev + event.data.chunkLength;
            if (totalSize > 0) {
              setProgress(Math.min(Math.round((next / totalSize) * 100), 99));
            }
            return next;
          });
        }
      });
      setProgress(100);
      await restart();
    } catch (err) {
      setError(err.message || 'Installation failed');
      setInstalling(false);
    }
  }, [update, totalSize]);

  if (!tauri) return null;

  if (compact) {
    if (dismissed || !update) return null;
    return (
      <div className="bg-lilac-bloom/10 border-b border-lilac-bloom/20">
        <div className="mx-auto flex items-center justify-between px-4 md:px-6 lg:px-8 py-2" style={{ maxWidth: '1440px' }}>
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-lilac-bloom">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            <span className="text-sm text-obsidian">
              Update v{update.version} available
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={handleInstall} disabled={installing}>
              {installing ? `${progress}%` : 'Update'}
            </Button>
            <button onClick={() => setDismissed(true)} className="text-slate hover:text-obsidian text-lg leading-none touch-target">&times;</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-paper border border-silver rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-obsidian">Desktop App</h3>
          <p className="text-caption text-slate">Al Jawarih Hospital v{currentVersion || '1.1.0'}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={handleCheck} disabled={checking || installing}>
          {checking ? 'Checking...' : 'Check for Updates'}
        </Button>
      </div>

      {update && (
        <div className="bg-lilac-bloom/10 border border-lilac-bloom/30 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-obsidian">
                Update available: v{update.version}
              </p>
              {update.body && (
                <p className="text-caption text-slate mt-1">{update.body}</p>
              )}
            </div>
          </div>
          {installing ? (
            <div className="space-y-1">
              <div className="w-full bg-silver rounded-full h-2">
                <div className="bg-lilac-bloom h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-caption text-slate text-right">{Math.round(progress)}%</p>
            </div>
          ) : (
            <Button variant="primary" size="sm" onClick={handleInstall}>
              Download & Install
            </Button>
          )}
        </div>
      )}

      {!update && !checking && !error && (
        <p className="text-caption text-slate">You have the latest version.</p>
      )}

      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-3 py-2 rounded-lg flex items-center justify-between">
          <span className="text-xs">{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 dark:hover:text-red-200 text-lg leading-none touch-target">&times;</button>
        </div>
      )}
    </div>
  );
}
