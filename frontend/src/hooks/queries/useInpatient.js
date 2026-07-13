import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const inpatientKeys = {
  vitals: (bedId) => ['inpatient-vitals', bedId],
  nursingNotes: (bedId) => ['inpatient-nursing-notes', bedId],
  rounds: (wardId, date) => ['ward-rounds', wardId, date],
};

export function useBedVitals(bedId) {
  return useQuery({
    queryKey: inpatientKeys.vitals(bedId),
    queryFn: () => api.get(`/wards/beds/${bedId}/vitals`),
    enabled: !!bedId,
  });
}

export function useRecordVital() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bedId, ...data }) => api.post(`/wards/beds/${bedId}/vitals`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inpatient-vitals'] }),
  });
}

export function useBedNursingNotes(bedId) {
  return useQuery({
    queryKey: inpatientKeys.nursingNotes(bedId),
    queryFn: () => api.get(`/wards/beds/${bedId}/notes`),
    enabled: !!bedId,
  });
}

export function useCreateNursingNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bedId, content }) => api.post(`/wards/beds/${bedId}/notes`, { content }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inpatient-nursing-notes'] }),
  });
}

export function useWardRounds(wardId, date) {
  return useQuery({
    queryKey: inpatientKeys.rounds(wardId, date),
    queryFn: () => api.get(`/wards/rounds?wardId=${wardId}&date=${date}`),
    enabled: !!wardId && !!date,
  });
}

export function useCreateWardRound() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/wards/rounds', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ward-rounds'] }),
  });
}
