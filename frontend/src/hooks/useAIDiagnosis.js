import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';

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
