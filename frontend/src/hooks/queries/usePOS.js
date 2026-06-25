import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const posKeys = {
  items: (category) => ['pos', 'items', category],
};

export function usePOSItems(category) {
  return useQuery({
    queryKey: posKeys.items(category),
    queryFn: () => api.get(`/pos/items?category=${category}`),
    enabled: !!category,
  });
}

export function usePOSTransact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/pos/transact', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: posKeys.items(variables.category) });
    },
  });
}
