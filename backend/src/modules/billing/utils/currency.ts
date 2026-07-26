const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  SAR: 3.75,
  AED: 3.67,
  EGP: 50.0,
  SDG: 500.0,
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  SAR: '\uFEFF',
  AED: '\u062F.\u0625',
  EGP: 'E£',
  SDG: 'SDG',
};

const CURRENCY_NAMES: Record<string, string> = {
  USD: 'US Dollar',
  SAR: 'Saudi Riyal',
  AED: 'UAE Dirham',
  EGP: 'Egyptian Pound',
  SDG: 'Sudanese Pound',
};

export function convertAmount(amount: number, fromCurrency: string, toCurrency: string): number {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  if (from === to) return amount;

  const fromRate = EXCHANGE_RATES[from];
  const toRate = EXCHANGE_RATES[to];

  if (fromRate === undefined || toRate === undefined) {
    throw new Error(`Unsupported currency: ${from === undefined ? from : to}`);
  }

  const amountInUSD = amount / fromRate;
  return Math.round(amountInUSD * toRate * 100) / 100;
}

export function formatCurrency(amount: number, currency: string): string {
  const code = currency.toUpperCase();
  const symbol = CURRENCY_SYMBOLS[code];
  if (!symbol) {
    return `${amount.toFixed(2)} ${code}`;
  }
  return `${symbol} ${amount.toFixed(2)}`;
}

export function getSupportedCurrencies(): Array<{ code: string; symbol: string; name: string; rateToUSD: number }> {
  return Object.keys(EXCHANGE_RATES).map((code) => ({
    code,
    symbol: CURRENCY_SYMBOLS[code] ?? code,
    name: CURRENCY_NAMES[code] ?? code,
    rateToUSD: EXCHANGE_RATES[code]!,
  }));
}

export function getExchangeRate(fromCurrency: string, toCurrency: string): number {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  if (from === to) return 1;

  const fromRate = EXCHANGE_RATES[from];
  const toRate = EXCHANGE_RATES[to];

  if (fromRate === undefined || toRate === undefined) {
    throw new Error(`Unsupported currency pair: ${from}/${to}`);
  }

  return toRate / fromRate;
}
