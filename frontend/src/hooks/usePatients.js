import { useState, useCallback, useRef } from 'react';
import { api } from '../lib/api';

export function usePatients() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const timer = useRef(null);

  const search = useCallback((q) => {
    setQuery(q);
    if (timer.current) clearTimeout(timer.current);
    if (!q || q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const data = await api.get(`/reception/search?q=${encodeURIComponent(q)}`);
        setResults(data || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
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
