export const CURRENCY = 'SDG';

export function formatCurrency(v) {
  return `${CURRENCY} ${(Number(v) || 0).toFixed(2)}`;
}
