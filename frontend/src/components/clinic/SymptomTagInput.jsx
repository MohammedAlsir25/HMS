import { useState, useRef, useEffect } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

function emptySymptom(name) {
  return { name: name || '', onset: '', duration: '', severity: 5, description: '' };
}

export default function SymptomTagInput({ symptoms, onSymptomsChange, suggestions = [], onsetOptions = [], label = 'Symptoms' }) {
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [expandedIndex, setExpandedIndex] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const filtered = inputValue.length >= 1
    ? suggestions.filter((s) => s.toLowerCase().includes(inputValue.toLowerCase()) && !symptoms.some((sym) => sym.name.toLowerCase() === s.toLowerCase()))
    : [];

  useEffect(() => {
    if (showDropdown && dropdownRef.current) {
      const active = dropdownRef.current.querySelector('[data-highlighted]');
      active?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, showDropdown]);

  const addSymptom = (name) => {
    onSymptomsChange([...symptoms, emptySymptom(name)]);
    setInputValue('');
    setShowDropdown(false);
    setHighlightedIndex(-1);
    setExpandedIndex(-1);
    inputRef.current?.focus();
  };

  const removeSymptom = (idx) => {
    onSymptomsChange(symptoms.filter((_, i) => i !== idx));
    setExpandedIndex((prev) => {
      if (prev === idx) return -1;
      if (prev > idx) return prev - 1;
      return prev;
    });
  };

  const updateSymptom = (idx, field, value) => {
    onSymptomsChange(symptoms.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const toggleExpand = (idx) => {
    setExpandedIndex((prev) => (prev === idx ? -1 : idx));
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || filtered.length === 0) {
      if (e.key === 'Enter' && inputValue.trim() && !symptoms.some((s) => s.name.toLowerCase() === inputValue.trim().toLowerCase())) {
        e.preventDefault();
        addSymptom(inputValue.trim());
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
        e.preventDefault();
        addSymptom(filtered[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setHighlightedIndex(-1);
    }
  };

  const handleBlur = () => {
    setTimeout(() => setShowDropdown(false), 200);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Input
          ref={inputRef}
          label={label}
          placeholder="Type to search symptoms..."
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value); setShowDropdown(true); setHighlightedIndex(-1); }}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (inputValue.length >= 1 && filtered.length > 0) setShowDropdown(true); }}
          onBlur={handleBlur}
          className="w-full"
        />
        {showDropdown && filtered.length > 0 && (
          <div ref={dropdownRef} className="absolute z-20 w-full mt-1 bg-paper border border-silver rounded-lg shadow-md max-h-48 overflow-y-auto">
            {filtered.map((s, i) => (
              <button
                key={s}
                type="button"
                data-highlighted={i === highlightedIndex ? 'true' : undefined}
                onMouseEnter={() => setHighlightedIndex(i)}
                onClick={() => addSymptom(s)}
                className={`w-full text-left px-4 py-2 text-body transition-colors border-b border-silver/50 last:border-0 ${
                  i === highlightedIndex ? 'bg-lilac-bloom text-obsidian' : 'hover:bg-bone text-graphite'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {symptoms.length === 0 && (
        <p className="text-caption text-slate">No symptoms added yet. Type above to add symptoms.</p>
      )}

      {symptoms.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {symptoms.map((symp, idx) => (
            <span
              key={idx}
              onClick={() => toggleExpand(idx)}
              className={`inline-flex items-center gap-1 px-3 py-1 text-sm rounded-full border cursor-pointer transition-colors ${
                expandedIndex === idx
                  ? 'bg-lilac-bloom text-obsidian border-lilac-bloom'
                  : 'bg-lilac-bloom/20 text-obsidian border-lilac-bloom/30 hover:bg-lilac-bloom/30'
              }`}
            >
              {symp.name || `Symptom #${idx + 1}`}
              <button type="button" onClick={(e) => { e.stopPropagation(); removeSymptom(idx); }} className="text-slate hover:text-red-500 ml-0.5 leading-none">&times;</button>
            </span>
          ))}
        </div>
      )}

      {expandedIndex >= 0 && expandedIndex < symptoms.length && (
        <div className="bg-bone rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {onsetOptions.length > 0 ? (
              <select value={symptoms[expandedIndex].onset} onChange={(e) => updateSymptom(expandedIndex, 'onset', e.target.value)}
                className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                <option value="">Onset</option>
                {onsetOptions.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <Input label="Onset" placeholder="Onset..." value={symptoms[expandedIndex].onset} onChange={(e) => updateSymptom(expandedIndex, 'onset', e.target.value)} />
            )}
            <Input label="Duration" placeholder="e.g. 3 days" value={symptoms[expandedIndex].duration} onChange={(e) => updateSymptom(expandedIndex, 'duration', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-sm font-medium text-graphite block mb-1">Severity: {symptoms[expandedIndex].severity}/10</label>
              <input type="range" min="1" max="10" value={symptoms[expandedIndex].severity} onChange={(e) => updateSymptom(expandedIndex, 'severity', parseInt(e.target.value))}
                className="w-full accent-lilac-bloom" />
            </div>
            <Input label="Description" placeholder="Additional details..." value={symptoms[expandedIndex].description} onChange={(e) => updateSymptom(expandedIndex, 'description', e.target.value)} />
          </div>
        </div>
      )}
    </div>
  );
}
