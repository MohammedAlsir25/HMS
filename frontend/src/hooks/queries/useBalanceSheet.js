import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const balanceSheetKeys = {
  all: ['accounting', 'balance-sheet'],
  detail: (asOfDate) => ['accounting', 'balance-sheet', asOfDate],
};

export function useBalanceSheet(asOfDate) {
  return useQuery({
    queryKey: balanceSheetKeys.detail(asOfDate),
    queryFn: () => api.get(`/accounting/balance-sheet${asOfDate ? `?asOfDate=${asOfDate}` : ''}`),
  });
}
