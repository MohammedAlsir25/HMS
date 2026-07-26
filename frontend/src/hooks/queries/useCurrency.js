import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export function useSupportedCurrencies() {
  return useQuery({
    queryKey: ['currencies'],
    queryFn: () => api.get('/billing/currencies'),
  });
}

export function useConvertCurrency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/billing/currencies/convert', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
    },
  });
}
