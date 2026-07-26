import { useEffect, useState } from 'react';

export function useKeyboardShortcuts(shortcuts, deps = []) {
  const [isListening] = useState(false);

  useEffect(() => {
    function handler(e) {
      const target = /** @type {HTMLElement} */ (e.target);
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatch = e.key === shortcut.key || e.key.toLowerCase() === shortcut.key.toLowerCase();
        if (!keyMatch) continue;

        const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;

        if (ctrlMatch && shiftMatch && altMatch) {
          e.preventDefault();
          if (shortcut.handler) shortcut.handler(e);
          return;
        }
      }
    }

    window.addEventListener('keydown', handler);

    return () => {
      window.removeEventListener('keydown', handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { isListening };
}
