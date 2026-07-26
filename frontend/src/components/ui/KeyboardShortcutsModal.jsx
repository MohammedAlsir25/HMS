import { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { SHORTCUTS, getShortcutLabel } from '../../lib/shortcuts';

export default function KeyboardShortcutsModal({ open, onClose }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => setLoaded(true), 50);
      return () => clearTimeout(t);
    }
    setLoaded(false);
  }, [open]);

  const grouped = useMemo(() => {
    /** @type {Record<string, typeof SHORTCUTS>} */
    const map = {};
    for (const s of SHORTCUTS) {
      if (!map[s.category]) map[s.category] = [];
      map[s.category].push(s);
    }
    return map;
  }, []);

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Keyboard Shortcuts">
      {!loaded ? (
        <div className="space-y-4 py-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-4 w-40 bg-bone rounded animate-pulse" />
              <div className="h-4 w-20 bg-bone rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-caption font-semibold text-slate uppercase tracking-wider mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {items.map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-1">
                    <span className="text-body text-obsidian">{s.description}</span>
                    <kbd className="px-2.5 py-1 text-caption font-mono bg-bone border border-silver rounded-lg text-graphite">
                      {getShortcutLabel(s)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
