import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const fixedAssetKeys = {
  all: ['accounting', 'fixed-assets'],
  list: (params) => ['accounting', 'fixed-assets', params],
};

export function useFixedAssets(params) {
  return useQuery({
    queryKey: fixedAssetKeys.list(params),
    queryFn: () => api.get(`/accounting/fixed-assets?${params}`),
    enabled: !!params,
  });
}

export function useCreateFixedAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/accounting/fixed-assets', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: fixedAssetKeys.all }),
  });
}

export function useUpdateFixedAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/accounting/fixed-assets/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: fixedAssetKeys.all }),
  });
}

export function useRunDepreciation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/accounting/fixed-assets/depreciation/run'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: fixedAssetKeys.all }),
  });
}
