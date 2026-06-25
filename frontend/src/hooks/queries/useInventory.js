import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const inventoryKeys = {
  all: ['inventory'],
  items: (search) => ['inventory', 'items', search],
  item: (id) => ['inventory', 'item', id],
  transactions: ['inventory', 'transactions'],
};

export function useInventoryItems(search) {
  return useQuery({
    queryKey: inventoryKeys.items(search),
    queryFn: () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      return api.get(`/inventory/items${params}`);
    },
  });
}

export function useInventoryItem(id) {
  return useQuery({
    queryKey: inventoryKeys.item(id),
    queryFn: () => api.get(`/inventory/items/${id}`),
    enabled: !!id,
  });
}

export function useInventoryTransactions() {
  return useQuery({
    queryKey: inventoryKeys.transactions,
    queryFn: () => api.get('/inventory/transactions'),
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/inventory/items', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inventoryKeys.all }),
  });
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/inventory/items/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inventoryKeys.all }),
  });
}
