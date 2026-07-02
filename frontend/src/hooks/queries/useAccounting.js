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
  debts: ['accounting', 'debts'],
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

export function useDebts() {
  return useQuery({
    queryKey: accountingKeys.debts,
    queryFn: () => api.get('/accounting/debts'),
  });
}

export function useCreateDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/accounting/debts', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountingKeys.debts }),
  });
}

export function usePayDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount }) => api.put(`/accounting/debts/${id}/payment`, { amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingKeys.debts });
      queryClient.invalidateQueries({ queryKey: accountingKeys.summary });
    },
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
