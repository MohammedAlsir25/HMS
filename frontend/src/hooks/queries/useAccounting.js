import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const accountingKeys = {
  summary: ['accounting', 'summary'],
  revenueByDay: (params) => ['accounting', 'revenue-by-day', params],
  revenueByType: (params) => ['accounting', 'revenue-by-type', params],
  revenueByDepartment: (params) => ['accounting', 'revenue-by-department', params],
  transactions: (params) => ['accounting', 'transactions', params],
  expenses: (params) => ['accounting', 'expenses', params],
  pnl: (params) => ['accounting', 'pnl', params],
  shifts: ['accounting', 'shifts'],
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

export function useRevenueByDepartment(params) {
  return useQuery({
    queryKey: accountingKeys.revenueByDepartment(params),
    queryFn: () => api.get(`/accounting/revenue-by-department?${params}`),
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

export function useCurrentShift() {
  return useQuery({
    queryKey: [accountingKeys.summary, 'currentShift'],
    queryFn: () => api.get('/pos/shift/current'),
  });
}

export function useOpenShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/accounting/shifts/open', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingKeys.summary });
      queryClient.invalidateQueries({ queryKey: accountingKeys.shifts });
    },
  });
}

export const cashMovementKeys = {
  list: (shiftId) => ['accounting', 'cash-movements', shiftId],
};

export function useCashMovements(shiftId) {
  return useQuery({
    queryKey: cashMovementKeys.list(shiftId),
    queryFn: () => api.get(`/accounting/cash-movements?shiftId=${shiftId}`),
    enabled: !!shiftId,
  });
}

export function useCreateCashMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/accounting/cash-movements', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting', 'cash-movements'] });
    },
  });
}

