import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const surgeryKeys = {
  byDate: (date) => ['surgeries', date],
  followUps: (filters) => ['surgery-follow-ups', filters],
  availability: (date) => ['surgery-availability', date],
  stats: (filters) => ['surgery-stats', filters],
  notes: (id) => ['surgery-notes', id],
  discharge: (id) => ['surgery-discharge', id],
};

export function useSurgeries(date) {
  return useQuery({
    queryKey: surgeryKeys.byDate(date),
    queryFn: () => api.get(`/surgeries?date=${date}`),
    enabled: !!date,
  });
}

export function useSurgeryAvailability(date) {
  return useQuery({
    queryKey: surgeryKeys.availability(date),
    queryFn: () => api.get(`/surgeries/availability?date=${date}`),
    enabled: !!date,
  });
}

export function useSurgeryStats(filters = {}) {
  const params = new URLSearchParams();
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  const qs = params.toString();
  return useQuery({
    queryKey: surgeryKeys.stats(filters),
    queryFn: () => api.get(`/surgeries/stats${qs ? `?${qs}` : ''}`),
  });
}

export function useCreateSurgery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/surgeries', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['surgeries'] }),
  });
}

export function useUpdateSurgeryStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => api.patch(`/surgeries/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['surgeries'] }),
  });
}

export function useUpdateSurgeryDisposition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, disposition, admittedWardId }) =>
      api.patch(`/surgeries/${id}/disposition`, { disposition, admittedWardId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['surgeries'] }),
  });
}

export function useSurgeryNotes(surgeryId) {
  return useQuery({
    queryKey: surgeryKeys.notes(surgeryId),
    queryFn: () => api.get(`/surgeries/${surgeryId}/notes`),
    enabled: !!surgeryId,
  });
}

export function useCreateSurgeryNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ surgeryId, content }) => api.post(`/surgeries/${surgeryId}/notes`, { content }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['surgery-notes'] }),
  });
}

export function useSurgeryDischarge(surgeryId) {
  return useQuery({
    queryKey: surgeryKeys.discharge(surgeryId),
    queryFn: () => api.get(`/surgeries/${surgeryId}/discharge`),
    enabled: !!surgeryId,
  });
}

export function useCreateDischargeSummary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ surgeryId, ...data }) => api.post(`/surgeries/${surgeryId}/discharge`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['surgery-discharge'] }),
  });
}

export function useSurgeryFollowUps(filters = {}) {
  const params = new URLSearchParams();
  if (filters.date) params.set('date', filters.date);
  if (filters.status) params.set('status', filters.status);
  const qs = params.toString();
  return useQuery({
    queryKey: surgeryKeys.followUps(filters),
    queryFn: () => api.get(`/surgeries/follow-ups${qs ? `?${qs}` : ''}`),
    enabled: true,
  });
}

export function useCreateFollowUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ surgeryId, scheduledAt, notes }) =>
      api.post(`/surgeries/${surgeryId}/follow-ups`, { scheduledAt, notes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['surgery-follow-ups'] }),
  });
}

export function useUpdateFollowUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ followUpId, status, notes }) =>
      api.patch(`/surgeries/follow-ups/${followUpId}`, { status, notes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['surgery-follow-ups'] }),
  });
}
