import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const preopKeys = {
  all: () => ['preoperative'],
  patients: () => [...preopKeys.all(), 'patients'],
  stats: () => [...preopKeys.all(), 'stats'],
  request: (id) => [...preopKeys.all(), 'request', id],
  operationTypes: (departmentId) => [...preopKeys.all(), 'operation-types', departmentId],
};

export function usePreoperativePatients() {
  return useQuery({
    queryKey: preopKeys.patients(),
    queryFn: () => api.get('/preoperative/patients'),
  });
}

export function usePreopStats() {
  return useQuery({
    queryKey: preopKeys.stats(),
    queryFn: () => api.get('/preoperative/stats'),
  });
}

export function useUpdatePreopStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, flaggedReason, referredTo }) =>
      api.patch(`/preoperative/${id}/status`, { status, flaggedReason, referredTo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: preopKeys.all() }),
  });
}

export function useCreatePreopRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/preoperative', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: preopKeys.all() }),
  });
}

export function useConfirmPreopRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.patch(`/preoperative/${id}/confirm`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: preopKeys.all() }),
  });
}

export function useRecordPreopWaiver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, signedBy, relationship, witnessedById }) =>
      api.patch(`/preoperative/${id}/waiver`, { signedBy, relationship, witnessedById }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: preopKeys.all() }),
  });
}

export function useRecordPreopPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.patch(`/preoperative/${id}/pay`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: preopKeys.all() }),
  });
}

export function useMarkLabDone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, diagnosticOrderId }) =>
      api.patch(`/preoperative/${id}/lab-done`, { diagnosticOrderId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: preopKeys.all() }),
  });
}

export function useMarkImagingDone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, aScanOrderId, bScanOrderId }) =>
      api.patch(`/preoperative/${id}/imaging-done`, { aScanOrderId, bScanOrderId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: preopKeys.all() }),
  });
}

export function useScheduleFromPreop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, scheduledDate, scheduledTime, orRoom, endTime }) =>
      api.patch(`/preoperative/${id}/schedule`, { scheduledDate, scheduledTime, orRoom, endTime }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: preopKeys.all() });
      queryClient.invalidateQueries({ queryKey: ['surgeries'] });
    },
  });
}

export function useCancelPreopRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cancelledReason }) =>
      api.patch(`/preoperative/${id}/cancel`, { cancelledReason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: preopKeys.all() }),
  });
}

export function useOperationTypes(departmentId) {
  return useQuery({
    queryKey: preopKeys.operationTypes(departmentId),
    queryFn: () => api.get(`/preoperative/operation-types?departmentId=${departmentId}`),
    enabled: !!departmentId,
  });
}
