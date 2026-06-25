import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useDebounce } from './useDebounce';

export function useAIDiagnosis() {
  const mutation = useMutation({
    mutationFn: ({ patientId, symptoms, vitals, specialty }) =>
      api.post('/ai/diagnose', { patientId, symptoms, vitals, specialty }),
  });

  return {
    diagnoses: mutation.data?.diagnoses ?? [],
    tests: mutation.data?.tests ?? [],
    treatments: mutation.data?.treatments ?? [],
    aiNotes: mutation.data?.notes ?? '',
    loading: mutation.isPending,
    error: mutation.error?.message ?? null,
    getDiagnosis: mutation.mutate,
    reset: mutation.reset,
  };
}

const icd10Keys = {
  search: (q) => ['icd10', 'search', q],
};

export function useIcd10Search(query) {
  const debouncedQuery = useDebounce(query, 300);

  return useQuery({
    queryKey: icd10Keys.search(debouncedQuery),
    queryFn: () => api.get(`/ai/icd10?q=${encodeURIComponent(debouncedQuery)}`),
    enabled: debouncedQuery.length >= 2,
  });
}
