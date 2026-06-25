import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useDebounce } from './useDebounce';

export function useMedicationSearch(clinicSlug) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  const { data: results = [], isLoading: loading } = useQuery({
    queryKey: ['medications', clinicSlug, debouncedQuery],
    queryFn: () => api.get(`/clinics/${clinicSlug}/medications?search=${encodeURIComponent(debouncedQuery)}`),
    enabled: debouncedQuery.length >= 2 && !!clinicSlug,
  });

  const search = useCallback((q) => {
    setQuery(q);
  }, []);

  const clear = useCallback(() => {
    setQuery('');
  }, []);

  return { query, results, loading, search, clear };
}
