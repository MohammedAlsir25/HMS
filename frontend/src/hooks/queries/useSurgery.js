import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const surgeryKeys = {
  byDate: (date) => ['surgeries', date],
};

export function useSurgeries(date) {
  return useQuery({
    queryKey: surgeryKeys.byDate(date),
    queryFn: () => api.get(`/surgeries?date=${date}`),
    enabled: !!date,
  });
}

export function useUpdateSurgeryStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => api.patch(`/surgeries/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['surgeries'] }),
  });
}
