import { useState } from 'react';

const clockHours = [
  { id: '12', label: '12', angle: 0 },
  { id: '1', label: '1', angle: 30 },
  { id: '2', label: '2', angle: 60 },
  { id: '3', label: '3', angle: 90 },
  { id: '4', label: '4', angle: 120 },
  { id: '5', label: '5', angle: 150 },
  { id: '6', label: '6', angle: 180 },
  { id: '7', label: '7', angle: 210 },
  { id: '8', label: '8', angle: 240 },
  { id: '9', label: '9', angle: 270 },
  { id: '10', label: '10', angle: 300 },
  { id: '11', label: '11', angle: 330 },
];

export default function OpticNerveDiagram({ side = 'OD', onSectorSelect, selectedSector, findings }) {
  const [activeSector, setActiveSector] = useState(null);
  const cx = 100, cy = 100, rOuter = 80, rMid = 50, rInner = 22;
  const halfAngle = 15;

  const handleSectorClick = (sectorId) => {
    setActiveSector(prev => prev === sectorId ? null : sectorId);
    onSectorSelect?.(sectorId);
  };

  const isSelected = (id) => {
    const key = `${side}-sector-${id}`;
    return activeSector === id || selectedSector === id || findings?.[key];
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-caption font-medium text-graphite">{side === 'OD' ? 'Right Eye (OD)' : 'Left Eye (OS)'}</span>
        <span className="text-caption text-slate">Optic Nerve Head</span>
      </div>
      <svg viewBox="0 0 200 200" className="w-56 h-56">
        <defs>
          <radialGradient id="discGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff4e6" />
            <stop offset="60%" stopColor="#fce4c5" />
            <stop offset="100%" stopColor="#f5d5a0" />
          </radialGradient>
          <radialGradient id="cupGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f0d9b5" />
            <stop offset="100%" stopColor="#e8c9a0" />
          </radialGradient>
        </defs>

        {clockHours.map((ch) => {
          const rad = (ch.angle - 90) * Math.PI / 180;
          const selected = isSelected(ch.id);
          const x2 = cx + rOuter * Math.cos(rad);
          const y2 = cy + rOuter * Math.sin(rad);
          const x1 = cx + rMid * Math.cos(rad);
          const y1 = cy + rMid * Math.sin(rad);

          const radLeft = ((ch.angle - halfAngle) - 90) * Math.PI / 180;
          const radRight = ((ch.angle + halfAngle) - 90) * Math.PI / 180;
          const outerLeft = { x: cx + rOuter * Math.cos(radLeft), y: cy + rOuter * Math.sin(radLeft) };
          const outerRight = { x: cx + rOuter * Math.cos(radRight), y: cy + rOuter * Math.sin(radRight) };
          const innerLeft = { x: cx + rMid * Math.cos(radLeft), y: cy + rMid * Math.sin(radLeft) };
          const innerRight = { x: cx + rMid * Math.cos(radRight), y: cy + rMid * Math.sin(radRight) };

          return (
            <path
              key={ch.id}
              d={`M ${innerLeft.x} ${innerLeft.y} L ${outerLeft.x} ${outerLeft.y} A ${rOuter} ${rOuter} 0 0 1 ${outerRight.x} ${outerRight.y} L ${innerRight.x} ${innerRight.y} A ${rMid} ${rMid} 0 0 0 ${innerLeft.x} ${innerLeft.y} Z`}
              fill={selected ? '#c084fc' : '#f5e6d0'}
              stroke={selected ? '#a855f7' : '#d4c4a8'}
              strokeWidth="1"
              opacity={selected ? 0.7 : 0.4}
              className="cursor-pointer hover:opacity-70 transition-opacity"
              onClick={() => handleSectorClick(ch.id)}
            />
          );
        })}

        {clockHours.map((ch) => {
          const rad = (ch.angle - 90) * Math.PI / 180;
          const labelR = rOuter + 12;
          const lx = cx + labelR * Math.cos(rad);
          const ly = cy + labelR * Math.sin(rad);
          return (
            <text
              key={`label-${ch.id}`}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="central"
              className="text-[8px] fill-graphite font-medium pointer-events-none"
            >
              {ch.id}
            </text>
          );
        })}

        <circle cx={cx} cy={cy} r={rInner} fill="url(#cupGrad)" stroke="#d4c4a8" strokeWidth="1" />
        <circle cx={cx} cy={cy} r={rInner - 6} fill="#e0cca8" opacity={0.5} />

        <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke="#d4c4a8" strokeWidth="1.5" />
        <circle cx={cx} cy={cy} r={rMid} fill="none" stroke="#d4c4a8" strokeWidth="0.5" strokeDasharray="3 2" />

        <line x1={cx} y1={cy - rOuter} x2={cx} y2={cy + rOuter} stroke="#d4c4a8" strokeWidth="0.3" strokeDasharray="2 2" />
        <line x1={cx - rOuter} y1={cy} x2={cx + rOuter} y2={cy} stroke="#d4c4a8" strokeWidth="0.3" strokeDasharray="2 2" />

        <text x={cx} y={cy + 4} textAnchor="middle" dominantBaseline="central" className="text-[7px] fill-slate font-medium pointer-events-none">Cup</text>
      </svg>
      <div className="grid grid-cols-4 gap-1 mt-2 text-[10px] text-center text-slate w-full">
        <span className="font-semibold">Sup: 11-1</span>
        <span className="font-semibold">Inf: 5-7</span>
        <span className="font-semibold">Nasal: 2-4</span>
        <span className="font-semibold">Temp: 8-10</span>
      </div>
      {activeSector && (
        <p className="mt-1 text-caption text-lilac-bloom font-medium">
          Clock hour {activeSector} selected
        </p>
      )}
    </div>
  );
}
