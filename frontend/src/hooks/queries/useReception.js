import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const receptionKeys = {
  queue: (clinicId) => ['reception', 'queue', clinicId],
  stats: ['reception', 'queue', 'stats'],
};

export function useReceptionQueue(clinicId, refetchInterval = 8000) {
  return useQuery({
    queryKey: receptionKeys.queue(clinicId),
    queryFn: () => api.get(`/reception/queue/${clinicId}`),
    enabled: !!clinicId,
    refetchInterval,
  });
}

export function useReceptionQueueStats(refetchInterval = 8000) {
  return useQuery({
    queryKey: receptionKeys.stats,
    queryFn: () => api.get('/reception/queue/stats'),
    refetchInterval,
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/reception/check-in', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: receptionKeys.queue(variables.clinicId) });
      queryClient.invalidateQueries({ queryKey: receptionKeys.stats });
    },
  });
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => api.patch(`/reception/appointments/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reception', 'queue'] }),
  });
}

export function useUpdateAppointmentPriority() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, priority }) => api.patch(`/reception/appointments/${id}/priority`, { priority }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reception', 'queue'] }),
  });
}

export function useCallNext() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (clinicId) => api.post(`/reception/queue/${clinicId}/call-next`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reception', 'queue'] }),
  });
}
