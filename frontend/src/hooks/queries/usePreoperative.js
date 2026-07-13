import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const preopKeys = {
  all: () => ['preoperative'],
  patients: () => [...preopKeys.all(), 'patients'],
};

export function usePreoperativePatients() {
  return useQuery({
    queryKey: preopKeys.patients(),
    queryFn: () => api.get('/preoperative/patients'),
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
