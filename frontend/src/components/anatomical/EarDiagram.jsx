import { useState } from 'react';

const zones = [
  { id: 'outer', label: 'Outer Ear', path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H8l-2-3 2-3h3v6z', x: 12, y: 12 },
  { id: 'canal', label: 'Ear Canal', path: 'M10 8v2a4 4 0 004 4h1', x: 14, y: 10 },
  { id: 'middle', label: 'Middle Ear', path: 'M8 12a4 4 0 004 4h2', x: 10, y: 14 },
  { id: 'inner', label: 'Inner Ear', path: 'M6 12h4m0 0l2-2m-2 2l2 2', x: 6, y: 12 },
];

export default function EarDiagram({ onZoneSelect, selectedZone, findings }) {
  const [hovered, setHovered] = useState(null);

  return (
    <div className="relative w-full max-w-sm mx-auto">
      <svg viewBox="0 0 24 24" className="w-full h-auto" fill="none" stroke="currentColor" strokeWidth="0.5">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="var(--color-bone)" stroke="var(--color-silver)" />
        {zones.map((zone) => {
          const isActive = selectedZone === zone.id || hovered === zone.id;
          const hasFinding = findings?.[zone.id];
          return (
            <g key={zone.id}>
              <path
                d={zone.path}
                fill={hasFinding ? 'var(--color-lilac-bloom)' : isActive ? 'var(--color-sky-veil)' : 'transparent'}
                stroke={isActive ? 'var(--color-graphite)' : 'var(--color-mist)'}
                strokeWidth={isActive ? 1.2 : 0.6}
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setHovered(zone.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onZoneSelect?.(zone.id)}
              />
              {hasFinding && (
                <circle cx={zone.x} cy={zone.y} r="0.8" fill="var(--color-lilac-bloom)" stroke="var(--color-graphite)" strokeWidth="0.3" />
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {zones.map((zone) => (
          <button
            key={zone.id}
            onClick={() => onZoneSelect?.(zone.id)}
            className={`text-left px-3 py-2 rounded-lg text-sm transition-colors touch-target
              ${selectedZone === zone.id ? 'bg-lilac-bloom text-obsidian font-medium' : 'bg-bone text-graphite hover:bg-silver'}
              ${findings?.[zone.id] ? 'ring-2 ring-lilac-bloom' : ''}`}
          >
            {zone.label}
            {findings?.[zone.id] && <span className="ml-1 text-slate">· marked</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
