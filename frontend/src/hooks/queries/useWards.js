import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const wardKeys = {
  all: () => ['wards'],
  wards: () => [...wardKeys.all(), 'list'],
  beds: (filters) => [...wardKeys.all(), 'beds', filters],
  bedVitals: (bedId) => [...wardKeys.all(), 'vitals', bedId],
  bedNotes: (bedId) => [...wardKeys.all(), 'notes', bedId],
  rounds: (wardId, date) => [...wardKeys.all(), 'rounds', wardId, date],
  availableBeds: (wardId) => [...wardKeys.all(), 'available', wardId],
  dashboard: () => [...wardKeys.all(), 'dashboard'],
  wardPatients: (wardId) => [...wardKeys.all(), 'patients', wardId],
};

export function useWards() {
  return useQuery({
    queryKey: wardKeys.wards(),
    queryFn: () => api.get('/wards/wards'),
  });
}

export function useWardBeds(filters = {}) {
  const params = new URLSearchParams();
  if (filters.wardId) params.set('wardId', filters.wardId);
  if (filters.status) params.set('status', filters.status);
  const qs = params.toString();
  return useQuery({
    queryKey: wardKeys.beds(filters),
    queryFn: () => api.get(`/wards/beds${qs ? `?${qs}` : ''}`),
  });
}

export function useCreateWard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/wards/wards', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: wardKeys.all() }),
  });
}

export function useUpdateWard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/wards/wards/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: wardKeys.all() }),
  });
}

export function useDeleteWard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/wards/wards/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: wardKeys.all() }),
  });
}

export function useCreateBed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/wards/beds', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: wardKeys.all() }),
  });
}

export function useAssignBed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bedId, patientId, surgeryId, admissionDate }) =>
      api.patch(`/wards/beds/${bedId}/assign`, { patientId, surgeryId, admissionDate }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: wardKeys.all() }),
  });
}

export function useDischargeBed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bedId, dischargeDate, dischargeNotes }) =>
      api.patch(`/wards/beds/${bedId}/discharge`, { dischargeDate, dischargeNotes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: wardKeys.all() }),
  });
}

export function useSetBedMaintenance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bedId) => api.patch(`/wards/beds/${bedId}/maintenance`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: wardKeys.all() }),
  });
}

export function useReserveBed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bedId) => api.patch(`/wards/beds/${bedId}/reserve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: wardKeys.all() }),
  });
}

export function useAvailableBeds(wardId) {
  return useQuery({
    queryKey: wardKeys.availableBeds(wardId),
    queryFn: () => api.get(`/wards/beds/available?wardId=${wardId}`),
    enabled: !!wardId,
  });
}

export function useTransferBed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bedId, targetBedId }) =>
      api.post(`/wards/beds/${bedId}/transfer`, { targetBedId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: wardKeys.all() }),
  });
}

export function useBedVitals(bedId) {
  return useQuery({
    queryKey: wardKeys.bedVitals(bedId),
    queryFn: () => api.get(`/wards/beds/${bedId}/vitals`),
    enabled: !!bedId,
  });
}

export function useBedNotes(bedId) {
  return useQuery({
    queryKey: wardKeys.bedNotes(bedId),
    queryFn: () => api.get(`/wards/beds/${bedId}/notes`),
    enabled: !!bedId,
  });
}

export function useWardRounds(wardId, date) {
  const params = new URLSearchParams();
  if (wardId) params.set('wardId', wardId);
  if (date) params.set('date', date);
  const qs = params.toString();
  return useQuery({
    queryKey: wardKeys.rounds(wardId, date),
    queryFn: () => api.get(`/wards/rounds${qs ? `?${qs}` : ''}`),
  });
}

export function useCreateWardRound() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/wards/rounds', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: wardKeys.all() }),
  });
}

export function useWardDashboard() {
  return useQuery({
    queryKey: wardKeys.dashboard(),
    queryFn: () => api.get('/wards/dashboard'),
    placeholderData: (prev) => prev,
  });
}

export function useWardPatients(wardId) {
  return useQuery({
    queryKey: wardKeys.wardPatients(wardId),
    queryFn: () => api.get(`/wards/${wardId}/patients`),
    enabled: !!wardId,
  });
}
