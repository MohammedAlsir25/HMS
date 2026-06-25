import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useDebounce } from './useDebounce';

export function useMedicationSearch(clinicSlug) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.length < 2 || !clinicSlug) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    api.get(`/clinics/${clinicSlug}/medications?search=${encodeURIComponent(debouncedQuery)}`)
      .then((data) => setResults(data || []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [debouncedQuery, clinicSlug]);

  const search = useCallback((q) => {
    setQuery(q);
    if (q.length < 2) setResults([]);
  }, []);

  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
  }, []);

  return { query, results, loading, search, clear };
}
