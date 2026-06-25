import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const referralKeys = {
  all: ['referrals'],
  byId: (id) => ['referrals', id],
};

export function useReferrals() {
  return useQuery({
    queryKey: referralKeys.all,
    queryFn: () => api.get('/referrals'),
  });
}

export function useReferral(id) {
  return useQuery({
    queryKey: referralKeys.byId(id),
    queryFn: () => api.get(`/referrals/${id}`),
    enabled: !!id,
  });
}

export function useCreateReferral() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/referrals', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: referralKeys.all }),
  });
}

export function useUpdateReferralStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => api.patch(`/referrals/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: referralKeys.all }),
  });
}
