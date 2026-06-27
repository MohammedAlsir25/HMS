import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useDebounce } from './useDebounce';

export const patientKeys = {
  search: (q) => ['patients', 'search', q],
};

export function usePatientSearch({ enabled: extraEnabled = true } = {}) {
  const [query, setQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const debouncedQuery = useDebounce(query, 300);

  const { data: results = [], isLoading: loading } = useQuery({
    queryKey: patientKeys.search(debouncedQuery),
    queryFn: () => api.get(`/patients/search?q=${encodeURIComponent(debouncedQuery)}`),
    enabled: !!extraEnabled && !!debouncedQuery && debouncedQuery.length >= 2,
  });

  const search = useCallback((q) => {
    setQuery(q);
  }, []);

  const selectPatient = useCallback((patient) => {
    if (!patient) { setSelectedPatient(null); setQuery(''); return; }
    setSelectedPatient(patient);
    setQuery(patient.fullName);
  }, []);

  const clearPatient = useCallback(() => {
    setSelectedPatient(null);
    setQuery('');
  }, []);

  return { query, setQuery: search, results, loading, selectedPatient, selectPatient, clearPatient };
}

export const usePatients = usePatientSearch;
