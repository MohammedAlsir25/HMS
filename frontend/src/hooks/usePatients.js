import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useDebounce } from './useDebounce';

export function usePatients() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    api.get(`/reception/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((data) => setResults(data || []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  const search = useCallback((q) => {
    setQuery(q);
    if (!q || q.length < 2) setResults([]);
  }, []);

  const selectPatient = useCallback((patient) => {
    setSelectedPatient(patient);
    setQuery(patient.fullName);
    setResults([]);
  }, []);

  const clearPatient = useCallback(() => {
    setSelectedPatient(null);
    setQuery('');
    setResults([]);
  }, []);

  return { query, setQuery: search, results, loading, selectedPatient, selectPatient, clearPatient };
}
