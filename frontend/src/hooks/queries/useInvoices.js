import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { posKeys } from './usePOS';

export const invoiceKeys = {
  all: (category) => ['invoices', category],
  detail: (category, id) => ['invoices', category, id],
};

export function useInvoices(category) {
  return useQuery({
    queryKey: invoiceKeys.all(category),
    queryFn: () => api.get(`/pos/${category}/invoices`),
    enabled: !!category,
  });
}

export function useInvoice(category, id) {
  return useQuery({
    queryKey: invoiceKeys.detail(category, id),
    queryFn: () => api.get(`/pos/${category}/invoices/${id}`),
    enabled: !!category && !!id,
  });
}

export function useCreateInvoice(category) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post(`/pos/${category}/invoices`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all(category) });
      queryClient.invalidateQueries({ queryKey: posKeys.items(category) });
    },
  });
}

export function useUpdateInvoicePayment(category) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/pos/${category}/invoices/${id}/payment`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all(category) });
    },
  });
}
