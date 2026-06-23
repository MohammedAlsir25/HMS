import { useState } from 'react';

const quadrants = [
  { id: 'upper-right', label: 'Upper Right', teeth: [18, 17, 16, 15, 14, 13, 12, 11], x: 2, y: 0 },
  { id: 'upper-left', label: 'Upper Left', teeth: [21, 22, 23, 24, 25, 26, 27, 28], x: 14, y: 0 },
  { id: 'lower-right', label: 'Lower Right', teeth: [48, 47, 46, 45, 44, 43, 42, 41], x: 2, y: 8 },
  { id: 'lower-left', label: 'Lower Left', teeth: [31, 32, 33, 34, 35, 36, 37, 38], x: 14, y: 8 },
];

const conditions = [
  { label: 'Healthy', color: 'fill-bone stroke-silver', value: 'healthy' },
  { label: 'Cavity', color: 'fill-red-200 stroke-red-400', value: 'cavity' },
  { label: 'Filled', color: 'fill-lilac-bloom stroke-obsidian', value: 'filled' },
  { label: 'Missing', color: 'fill-silver stroke-mist', value: 'missing' },
  { label: 'Crown', color: 'fill-sky-veil stroke-obsidian', value: 'crown' },
];

export default function ToothChart({ onToothSelect, selectedTooth, findings }) {
  const [activeCondition, setActiveCondition] = useState(null);

  const getToothColor = (num) => {
    const f = findings?.[num];
    if (!f) return conditions[0].color;
    const match = conditions.find((c) => c.value === f);
    return match ? match.color : conditions[0].color;
  };

  return (
    <div className="space-y-4">
      <svg viewBox="0 0 24 16" className="w-full max-w-md mx-auto">
        {quadrants.map((q) =>
          q.teeth.map((num, i) => {
            const col = i % 8;
            const isSelected = selectedTooth === num;
            return (
              <g
                key={num}
                className="cursor-pointer"
                onClick={() => onToothSelect?.(num)}
              >
                <rect
                  x={q.x + col * 1.2}
                  y={q.y + (col < 4 ? 0 : 0.5)}
                  width="1"
                  height={col < 4 ? '1.8' : '1.5'}
                  rx="0.2"
                  className={`${getToothColor(num)} ${isSelected ? 'stroke-obsidian stroke-[0.15]' : 'stroke-[0.08]'}`}
                />
                <text
                  x={q.x + col * 1.2 + 0.5}
                  y={q.y + (col < 4 ? 2.3 : 2)}
                  textAnchor="middle"
                  className="fill-slate"
                  fontSize="0.3"
                >
                  {num}
                </text>
              </g>
            );
          }),
        )}
        <line x1="12" y1="0" x2="12" y2="16" stroke="#d6d6d6" strokeWidth="0.05" />
        <line x1="0" y1="7" x2="24" y2="7" stroke="#d6d6d6" strokeWidth="0.05" />
      </svg>

      <div className="flex flex-wrap gap-2">
        {conditions.map((c) => (
          <button
            key={c.value}
            onClick={() => setActiveCondition(c.value === activeCondition ? null : c.value)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors touch-target
              ${activeCondition === c.value ? 'ring-2 ring-obsidian' : ''} bg-bone text-graphite`}
          >
            <span className={`w-4 h-4 rounded ${c.color.replace('fill-', 'bg-').replace('stroke-', 'border-')} border`} />
            {c.label}
          </button>
        ))}
      </div>

      {activeCondition && selectedTooth && (
        <p className="text-sm text-graphite">
          Tooth #{selectedTooth}: set to <strong>{conditions.find((c) => c.value === activeCondition)?.label}</strong>
        </p>
      )}
    </div>
  );
}
