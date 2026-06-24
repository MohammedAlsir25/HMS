import { useState } from 'react';

const regions = [
  { id: 'superior-wall', label: 'Superior Wall', cx: 12, cy: 4, r: 6 },
  { id: 'inferior-wall', label: 'Inferior Wall', cx: 12, cy: 20, r: 6 },
  { id: 'medial-wall', label: 'Medial Wall', cx: 4, cy: 12, r: 6 },
  { id: 'lateral-wall', label: 'Lateral Wall', cx: 20, cy: 12, r: 6 },
  { id: 'apex', label: 'Orbital Apex', cx: 12, cy: 12, r: 2 },
];

export default function OrbitDiagram({ onRegionSelect, selectedRegion, findings }) {
  const [hovered, setHovered] = useState(null);

  return (
    <div className="space-y-3">
      <svg viewBox="0 0 24 24" className="w-full max-w-xs mx-auto">
        <rect x="2" y="2" width="20" height="20" rx="3" fill="var(--color-bone)" stroke="var(--color-silver)" strokeWidth="0.5" />
        <circle cx="12" cy="12" r="3" fill="none" stroke="var(--color-mist)" strokeWidth="0.3" strokeDasharray="0.5" />
        {regions.map((r) => {
          const isActive = selectedRegion === r.id || hovered === r.id;
          const hasFinding = findings?.[r.id];
          return (
            <g
              key={r.id}
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => setHovered(r.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onRegionSelect?.(r.id)}
            >
              <circle
                cx={r.cx}
                cy={r.cy}
                r={r.r}
                fill={hasFinding ? 'var(--color-lilac-bloom)' : isActive ? 'var(--color-sky-veil)' : 'transparent'}
                stroke={isActive ? 'var(--color-graphite)' : 'var(--color-mist)'}
                strokeWidth={isActive ? 1.2 : 0.4}
                opacity={isActive ? 0.8 : 0.5}
              />
            </g>
          );
        })}
      </svg>
      <div className="grid grid-cols-2 gap-2">
        {regions.map((r) => (
          <button
            key={r.id}
            onClick={() => onRegionSelect?.(r.id)}
            className={`text-left px-3 py-2 rounded-lg text-sm transition-colors touch-target
              ${selectedRegion === r.id ? 'bg-lilac-bloom text-obsidian font-medium' : 'bg-bone text-graphite hover:bg-silver'}
              ${findings?.[r.id] ? 'ring-2 ring-lilac-bloom' : ''}`}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
