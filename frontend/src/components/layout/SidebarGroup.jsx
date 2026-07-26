import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

export default function SidebarGroup({ group, collapsed, pathname }) {
  const [open, setOpen] = useState(true);

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1">
        {group.items.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              title={item.label}
              className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors
                ${isActive ? 'bg-lilac-bloom/20 text-obsidian font-medium' : 'text-graphite hover:bg-bone hover:text-obsidian'}
              `}
            >
              <Icon className="w-5 h-5 shrink-0" />
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-3 py-2 text-caption font-medium text-slate uppercase tracking-wider hover:text-obsidian transition-colors"
      >
        <span>{group.label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-0' : '-rotate-90'}`} />
      </button>

      <div
        className="overflow-hidden transition-all duration-200"
        style={{ maxHeight: open ? `${group.items.length * 44}px` : '0' }}
      >
        <div className="space-y-0.5">
          {group.items.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-body transition-colors
                  ${isActive ? 'bg-lilac-bloom/20 text-obsidian font-medium' : 'text-graphite hover:bg-bone hover:text-obsidian'}
                `}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
