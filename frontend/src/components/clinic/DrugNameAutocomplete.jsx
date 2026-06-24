import { useState, useRef, useEffect } from 'react';
import { useMedicationSearch } from '../../hooks/useMedicationSearch';

export default function DrugNameAutocomplete({ value, onChange, clinicSlug }) {
  const { query, results, loading, search, clear } = useMedicationSearch(clinicSlug);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleInput = (e) => {
    const v = e.target.value;
    onChange(v);
    search(v);
    setOpen(true);
  };

  const handleSelect = (item) => {
    onChange(item.name);
    setOpen(false);
    clear();
  };

  const stockColor = (qty, min) => {
    if (!min) return 'text-green-600 dark:text-green-400';
    const ratio = qty / min;
    if (ratio <= 0.5) return 'text-red-500 dark:text-red-400';
    if (ratio <= 1) return 'text-amber-500 dark:text-amber-400';
    return 'text-green-600 dark:text-green-400';
  };

  return (
    <div ref={ref} className="relative">
      <label className="block text-caption font-medium text-graphite mb-1">Drug Name</label>
      <input
        type="text"
        placeholder="e.g. Amlodipine"
        value={value}
        onChange={handleInput}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
      />
      {loading && (
        <div className="absolute right-3 top-9">
          <svg className="animate-spin h-4 w-4 text-lilac-bloom" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-paper border border-silver rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-4 py-2.5 hover:bg-lilac-bloom/10 cursor-pointer text-sm"
              onClick={() => handleSelect(item)}
            >
              <div>
                <span className="text-obsidian font-medium">{item.name}</span>
                <span className="text-slate ml-2 text-xs">{item.sku}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${stockColor(item.quantity, item.minStock)}`}>
                  Stock: {item.quantity}
                </span>
                {item.quantity > 0 && item.quantity <= (item.minStock || 0) && (
                  <span className="text-xs bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded">Low</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
