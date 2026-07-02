import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const supplierKeys = {
  all: ['suppliers'],
};

export function useSuppliers(category) {
  const params = category ? `?category=${category}` : '';
  return useQuery({
    queryKey: [...supplierKeys.all, category].filter(Boolean),
    queryFn: () => api.get(`/pos/suppliers${params}`),
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/pos/suppliers', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: supplierKeys.all }),
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/pos/suppliers/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: supplierKeys.all }),
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/pos/suppliers/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: supplierKeys.all }),
  });
}
