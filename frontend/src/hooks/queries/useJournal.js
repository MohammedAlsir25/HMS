import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const journalKeys = {
  accounts: ['accounting', 'accounts'],
  entries: (params) => ['accounting', 'journal-entries', params],
  entry: (id) => ['accounting', 'journal-entries', id],
};

export function useAccounts() {
  return useQuery({
    queryKey: journalKeys.accounts,
    queryFn: () => api.get('/accounting/accounts'),
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/accounting/accounts', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: journalKeys.accounts }),
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/accounting/accounts/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: journalKeys.accounts }),
  });
}

export function useJournalEntries(params) {
  return useQuery({
    queryKey: journalKeys.entries(params),
    queryFn: () => api.get(`/accounting/journal-entries?${params}`),
    enabled: !!params,
  });
}

export function useJournalEntry(id) {
  return useQuery({
    queryKey: journalKeys.entry(id),
    queryFn: () => api.get(`/accounting/journal-entries/${id}`),
    enabled: !!id,
  });
}

export function useCreateJournalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/accounting/journal-entries', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalKeys.accounts });
      queryClient.invalidateQueries({ queryKey: ['accounting', 'journal-entries'] });
    },
  });
}
