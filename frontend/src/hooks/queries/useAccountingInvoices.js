import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const accountingInvoiceKeys = {
  all: ['accounting', 'invoices'],
  list: (filters) => ['accounting', 'invoices', filters],
  detail: (id) => ['accounting', 'invoices', id],
  receipt: (id) => ['accounting', 'invoices', id, 'receipt'],
};

export function useAccountingInvoices(filters) {
  return useQuery({
    queryKey: accountingInvoiceKeys.list(filters),
    queryFn: () => api.get(`/accounting/invoices?${filters}`),
    enabled: !!filters,
  });
}

export function useAccountingInvoice(id) {
  return useQuery({
    queryKey: accountingInvoiceKeys.detail(id),
    queryFn: () => api.get(`/accounting/invoices/${id}`),
    enabled: !!id,
  });
}

export function useCreateAccountingInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/accounting/invoices', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountingInvoiceKeys.all }),
  });
}

export function useRecordInvoicePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/accounting/invoices/${id}/payment`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: accountingInvoiceKeys.all });
      queryClient.invalidateQueries({ queryKey: accountingInvoiceKeys.detail(variables.id) });
    },
  });
}

export function useInvoiceReceipt(id) {
  return useQuery({
    queryKey: accountingInvoiceKeys.receipt(id),
    queryFn: () => api.get(`/accounting/invoices/${id}/receipt`),
    enabled: !!id,
  });
}
