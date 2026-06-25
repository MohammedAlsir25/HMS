import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const accountingKeys = {
  summary: ['accounting', 'summary'],
  revenueByDay: (params) => ['accounting', 'revenue-by-day', params],
  revenueByType: (params) => ['accounting', 'revenue-by-type', params],
  transactions: (params) => ['accounting', 'transactions', params],
  expenses: (params) => ['accounting', 'expenses', params],
  pnl: (params) => ['accounting', 'pnl', params],
  shifts: ['accounting', 'shifts'],
  checkout: ['accounting', 'checkout'],
};

export function useAccountingSummary() {
  return useQuery({
    queryKey: accountingKeys.summary,
    queryFn: () => api.get('/accounting/summary'),
  });
}

export function useRevenueByDay(params) {
  return useQuery({
    queryKey: accountingKeys.revenueByDay(params),
    queryFn: () => api.get(`/accounting/revenue-by-day?${params}`),
    enabled: !!params,
  });
}

export function useRevenueByType(params) {
  return useQuery({
    queryKey: accountingKeys.revenueByType(params),
    queryFn: () => api.get(`/accounting/revenue-by-type?${params}`),
    enabled: !!params,
  });
}

export function useAccountingTransactions(params) {
  return useQuery({
    queryKey: accountingKeys.transactions(params),
    queryFn: () => api.get(`/accounting/transactions?${params}`),
    enabled: !!params,
  });
}

export function useExpenses(params) {
  return useQuery({
    queryKey: accountingKeys.expenses(params),
    queryFn: () => api.get(`/accounting/expenses?${params}`),
    enabled: !!params,
  });
}

export function usePnL(params) {
  return useQuery({
    queryKey: accountingKeys.pnl(params),
    queryFn: () => api.get(`/accounting/pnl?${params}`),
    enabled: !!params,
  });
}

export function useOpenShift() {
  return useQuery({
    queryKey: accountingKeys.shifts,
    queryFn: () => api.get('/accounting/shifts/open'),
  });
}

export function useCloseShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/accounting/shifts/close', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountingKeys.shifts }),
  });
}

export function useAccountingCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/accounting/checkout', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingKeys.shifts });
      queryClient.invalidateQueries({ queryKey: accountingKeys.summary });
    },
  });
}
