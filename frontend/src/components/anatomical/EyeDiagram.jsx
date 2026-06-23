import { useState } from 'react';

const regions = [
  { id: 'cornea', label: 'Cornea', path: 'M12 4a8 8 0 00-8 8h16a8 8 0 00-8-8z', x: 12, y: 6 },
  { id: 'lens', label: 'Lens', path: 'M10 10h4v4h-4z', x: 12, y: 12 },
  { id: 'retina', label: 'Retina', path: 'M4 12a8 8 0 008 8 8 8 0 008-8', x: 12, y: 18 },
  { id: 'macula', label: 'Macula', path: 'M11 11h2v2h-2z', x: 12, y: 14 },
  { id: 'optic-disc', label: 'Optic Disc', path: 'M11 16h2v2h-2z', x: 12, y: 17 },
  { id: 'vitreous', label: 'Vitreous', path: 'M7 8h10v8H7z', x: 12, y: 12 },
];

export default function EyeDiagram({ onRegionSelect, selectedRegion, findings, side = 'OD' }) {
  const [hovered, setHovered] = useState(null);

  return (
    <div className="space-y-3">
      <div className="text-caption font-medium text-slate text-center">{side === 'OD' ? 'Right Eye (OD)' : 'Left Eye (OS)'}</div>
      <svg viewBox="0 0 24 24" className="w-full max-w-xs mx-auto" fill="none" stroke="currentColor" strokeWidth="0.5">
        <circle cx="12" cy="12" r="10" fill="#f5f2f0" stroke="#d6d6d6" strokeWidth="0.5" />
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
              <path
                d={r.path}
                fill={hasFinding ? '#f1ccff' : isActive ? '#91e0ff' : 'transparent'}
                stroke={isActive ? '#333' : '#bcbcbc'}
                strokeWidth={isActive ? 1.2 : 0.6}
                opacity={isActive ? 1 : 0.7}
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
