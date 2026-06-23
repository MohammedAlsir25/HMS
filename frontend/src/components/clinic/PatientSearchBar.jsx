import { useRef } from 'react';
import { Input } from '../ui/Input';

export default function PatientSearchBar({ query, onSearch, results, loading, onSelect, onClear }) {
  const ref = useRef(null);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Input
          label="Search Patient"
          placeholder="Search by name, MRN, phone or national ID..."
          value={query}
          onChange={(e) => onSearch(e.target.value)}
          className="pr-10"
        />
        {query && (
          <button
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate hover:text-obsidian"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
      {loading && (
        <div className="absolute z-10 w-full mt-1 bg-paper border border-silver rounded-lg p-3 shadow-md">
          <p className="text-caption text-slate">Searching...</p>
        </div>
      )}
      {results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-paper border border-silver rounded-lg shadow-md max-h-60 overflow-y-auto">
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              className="w-full text-left px-4 py-3 hover:bg-bone transition-colors border-b border-silver/50 last:border-0"
            >
              <p className="text-body font-medium text-obsidian">{p.fullName}</p>
              <p className="text-caption text-slate">
                MRN: {p.mrn}
                {p.gender && ` · ${p.gender}`}
                {p.dateOfBirth && ` · ${new Date(p.dateOfBirth).toLocaleDateString()}`}
                {p.phone && ` · ${p.phone}`}
              </p>
              {p.chronicConditions?.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {p.chronicConditions.map((c) => (
                    <span key={c} className="text-xs bg-lilac-bloom/20 text-obsidian px-2 py-0.5 rounded-full">
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
