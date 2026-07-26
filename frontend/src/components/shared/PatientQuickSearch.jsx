import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

export default function PatientQuickSearch({ onSelect, placeholder = 'Search patients...', clinicSlug }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const fetchResults = useCallback(async (searchQuery) => {
    setLoading(true);
    try {
      let url = `/patients/search?q=${encodeURIComponent(searchQuery)}`;
      if (clinicSlug) url += `&clinicSlug=${encodeURIComponent(clinicSlug)}`;
      const data = await api.get(url);
      setResults(data);
      setIsOpen(true);
      setHighlightIndex(-1);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [clinicSlug]);

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => fetchResults(value), 300);
  };

  const handleKeyDown = (e) => {
    if (!isOpen || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < results.length) {
        onSelect(results[highlightIndex]);
        setQuery('');
        setIsOpen(false);
        setResults([]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian placeholder:text-slate focus:outline-none focus:ring-2 focus:ring-lilac-bloom focus:border-transparent transition-colors duration-150"
      />
      {loading && isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-paper border border-silver rounded-xl shadow-md px-4 py-3 text-caption text-slate">
          Searching...
        </div>
      )}
      {!loading && isOpen && results.length === 0 && query.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-paper border border-silver rounded-xl shadow-md px-4 py-3 text-caption text-slate">
          No patients found
        </div>
      )}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-paper border border-silver rounded-xl shadow-md max-h-72 overflow-y-auto">
          {results.map((patient, i) => (
            <button
              key={patient.id}
              onMouseDown={() => {
                onSelect(patient);
                setQuery('');
                setIsOpen(false);
                setResults([]);
              }}
              className={`w-full text-left px-4 py-3 flex items-center justify-between
                ${i === highlightIndex ? 'bg-lilac-bloom/20' : 'hover:bg-bone'}
                transition-colors`}
            >
              <div className="min-w-0">
                <p className="text-body text-obsidian truncate">{patient.fullName}</p>
                <p className="text-caption text-slate">
                  {patient.mrn} {patient.phone && `· ${patient.phone}`}
                </p>
              </div>
              <span className="text-caption text-slate shrink-0">
                {patient.gender === 'MALE' ? 'M' : patient.gender === 'FEMALE' ? 'F' : '-'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
