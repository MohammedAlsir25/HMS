import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const serviceCatalogKeys = {
  all: ['accounting', 'service-items'],
  list: (params) => ['accounting', 'service-items', params],
};

export function useServiceItems(params) {
  return useQuery({
    queryKey: serviceCatalogKeys.list(params),
    queryFn: () => api.get(`/accounting/service-items?${params}`),
    enabled: !!params,
  });
}

export function useCreateServiceItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/accounting/service-items', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: serviceCatalogKeys.all }),
  });
}

export function useUpdateServiceItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/accounting/service-items/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: serviceCatalogKeys.all }),
  });
}
