import { useState, useCallback, useRef } from 'react';
import { api } from '../lib/api';

export function useMedicationSearch(clinicSlug) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);

  const search = useCallback((q) => {
    setQuery(q);
    if (timer.current) clearTimeout(timer.current);
    if (!q || q.length < 2) { setResults([]); return; }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const data = await api.get(`/clinics/${clinicSlug}/medications?search=${encodeURIComponent(q)}`);
        setResults(data || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [clinicSlug]);

  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
  }, []);

  return { query, results, loading, search, clear };
}
