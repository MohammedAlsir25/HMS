import { useState } from 'react';
import { Input } from './Input';
import { Button } from './Button';

const PRESETS = [
  { label: 'Today', getRange: () => { const d = new Date().toISOString().slice(0, 10); return { startDate: d, endDate: d }; } },
  { label: 'This Week', getRange: () => { const now = new Date(); const day = now.getDay(); const start = new Date(now); start.setDate(now.getDate() - day); return { startDate: start.toISOString().slice(0, 10), endDate: now.toISOString().slice(0, 10) }; } },
  { label: 'This Month', getRange: () => { const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), 1); return { startDate: start.toISOString().slice(0, 10), endDate: now.toISOString().slice(0, 10) }; } },
  { label: 'Last Month', getRange: () => { const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth() - 1, 1); const end = new Date(now.getFullYear(), now.getMonth(), 0); return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) }; } },
  { label: 'This Quarter', getRange: () => { const now = new Date(); const q = Math.floor(now.getMonth() / 3); const start = new Date(now.getFullYear(), q * 3, 1); return { startDate: start.toISOString().slice(0, 10), endDate: now.toISOString().slice(0, 10) }; } },
  { label: 'This Year', getRange: () => { const now = new Date(); const start = new Date(now.getFullYear(), 0, 1); return { startDate: start.toISOString().slice(0, 10), endDate: now.toISOString().slice(0, 10) }; } },
  { label: 'Last 30 Days', getRange: () => { const now = new Date(); const start = new Date(now.getTime() - 30 * 86400000); return { startDate: start.toISOString().slice(0, 10), endDate: now.toISOString().slice(0, 10) }; } },
];

function getPresetLabel(start, end) {
  for (const p of PRESETS) {
    const r = p.getRange();
    if (r.startDate === start && r.endDate === end) return p.label;
  }
  return 'Custom';
}

export default function DateRangePicker({ startDate, endDate, onChange }) {
  const [activePreset, setActivePreset] = useState(() => getPresetLabel(startDate, endDate));

  const handlePreset = (preset) => {
    const range = preset.getRange();
    setActivePreset(preset.label);
    onChange(range);
  };

  const handleStartChange = (val) => {
    setActivePreset('Custom');
    onChange({ startDate: val, endDate });
  };

  const handleEndChange = (val) => {
    setActivePreset('Custom');
    onChange({ startDate, endDate: val });
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex gap-1.5 flex-wrap">
        {PRESETS.map((preset) => (
          <Button
            key={preset.label}
            variant={activePreset === preset.label ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => handlePreset(preset)}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input type="date" value={startDate} onChange={(e) => handleStartChange(e.target.value)} className="w-36" />
        <span className="text-slate">–</span>
        <Input type="date" value={endDate} onChange={(e) => handleEndChange(e.target.value)} className="w-36" />
      </div>
    </div>
  );
}
