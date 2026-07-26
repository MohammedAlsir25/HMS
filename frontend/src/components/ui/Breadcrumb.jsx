import { useLocation } from 'react-router-dom';
import { findNavItem } from '../../config/navigation';

export default function Breadcrumb() {
  const { pathname } = useLocation();
  const nav = findNavItem(pathname);
  if (!nav) return null;

  return (
    <nav className="text-caption text-slate mb-4">
      <span>{nav.group}</span>
      <span className="mx-2">/</span>
      <span className="text-obsidian font-medium">{nav.item}</span>
    </nav>
  );
}
