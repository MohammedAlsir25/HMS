import { useState, useEffect, useCallback } from 'react';
import { Button } from './Button';

function isTauri() {
  return typeof window !== 'undefined' && window.__TAURI__;
}

async function tauriUpdater() {
  const { check } = await import('@tauri-apps/plugin-updater');
  const { relaunch } = await import('@tauri-apps/api/process');
  return { check, relaunch };
}

export default function UpdateManager({ alwaysShow = false }) {
  const [tauri, setTauri] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(null);
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    setTauri(isTauri());
  }, []);

  const handleCheck = useCallback(async () => {
    if (!isTauri()) return;
    setChecking(true);
    setError('');
    setUpdateAvailable(null);
    try {
      const { check } = await tauriUpdater();
      const update = await check();
      if (update) {
        setUpdateAvailable(update);
      } else {
        setUpdateAvailable(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to check for updates');
    }
    setChecking(false);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!updateAvailable) return;
    setInstalling(true);
    setError('');
    try {
      const { check, relaunch } = await tauriUpdater();
      const update = await check();
      if (!update) { setInstalling(false); return; }
      await update.downloadAndInstall((event) => {
        if (event.event === 'DownloadProgress') {
          const total = event.data.contentLength || 1;
          const downloaded = event.data.chunkLength || 0;
          setProgress((prev) => Math.min(prev + (downloaded / total) * 100, 99));
        }
      });
      setProgress(100);
      await relaunch();
    } catch (err) {
      setError(err.message || 'Installation failed');
      setInstalling(false);
    }
  }, [updateAvailable]);

  if (!tauri && !alwaysShow) return null;

  return (
    <div className="bg-paper border border-silver rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-obsidian">Desktop App</h3>
          <p className="text-caption text-slate">Al Jawarih Hospital v1.0.0</p>
        </div>
        <Button variant="secondary" size="sm" onClick={handleCheck} disabled={checking || installing}>
          {checking ? 'Checking...' : 'Check for Updates'}
        </Button>
      </div>

      {updateAvailable && (
        <div className="bg-lilac-bloom/10 border border-lilac-bloom/30 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-obsidian">
                Update available: v{updateAvailable.version}
              </p>
              {updateAvailable.body && (
                <p className="text-caption text-slate mt-1">{updateAvailable.body}</p>
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

      {!updateAvailable && !checking && !error && (
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
