export const SHORTCUTS = [
  {
    id: 'global-search',
    key: 'k',
    ctrl: true,
    shift: false,
    alt: false,
    description: 'Quick search / command palette',
    category: 'Navigation',
  },
  {
    id: 'new-patient',
    key: 'n',
    ctrl: true,
    shift: false,
    alt: false,
    description: 'New patient registration',
    category: 'Navigation',
  },
  {
    id: 'escape-close',
    key: 'Escape',
    ctrl: false,
    shift: false,
    alt: false,
    description: 'Close modals and overlays',
    category: 'General',
  },
  {
    id: 'show-shortcuts',
    key: '?',
    ctrl: false,
    shift: false,
    alt: false,
    description: 'Show keyboard shortcuts',
    category: 'General',
  },
  {
    id: 'goto-dashboard',
    key: 'd',
    ctrl: true,
    shift: true,
    alt: false,
    description: 'Go to dashboard',
    category: 'Navigation',
  },
];

export function getShortcutLabel(shortcut) {
  const parts = [];
  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');
  if (shortcut.key === 'Escape') {
    parts.push('Esc');
  } else if (shortcut.key === '?') {
    parts.push('?');
  } else {
    parts.push(shortcut.key.toUpperCase());
  }
  return parts.join(' + ');
}
