import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const labKeys = {
  all: ['lab'],
  tests: ['lab', 'tests'],
  orders: (params) => ['lab', 'orders', params],
  order: (id) => ['lab', 'order', id],
  stats: ['lab', 'stats'],
};

export function useLabTests() {
  return useQuery({
    queryKey: labKeys.tests,
    queryFn: () => api.get('/lab/tests'),
  });
}

export function useLabOrders(params) {
  return useQuery({
    queryKey: labKeys.orders(params),
    queryFn: () => api.get(`/lab/orders${params ? `?${params}` : ''}`),
  });
}

export function useLabOrder(id) {
  return useQuery({
    queryKey: labKeys.order(id),
    queryFn: () => api.get(`/lab/orders/${id}`),
    enabled: !!id,
  });
}

export function useLabStats() {
  return useQuery({
    queryKey: labKeys.stats,
    queryFn: () => api.get('/lab/stats'),
  });
}

export function useClaimOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.patch(`/lab/orders/${id}/claim`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: labKeys.orders }),
  });
}

export function useUnclaimOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.patch(`/lab/orders/${id}/unclaim`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: labKeys.orders }),
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => api.patch(`/lab/orders/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: labKeys.orders }),
  });
}

export function useSubmitResults() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, results }) => api.post(`/lab/orders/${id}/results`, { results }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: labKeys.orders }),
  });
}

export function useLabCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/lab/checkout', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: labKeys.orders });
      queryClient.invalidateQueries({ queryKey: labKeys.stats });
    },
  });
}
