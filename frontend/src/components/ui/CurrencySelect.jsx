import { useSupportedCurrencies } from '../../hooks/queries/useCurrency';

export function CurrencySelect({ value, onChange, className = '' }) {
  const { data, isLoading } = useSupportedCurrencies();
  const currencies = data?.currencies || data || [];

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={isLoading}
      className={`w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom transition-colors duration-150 touch-target ${className}`}
    >
      {isLoading ? (
        <option value="">Loading currencies...</option>
      ) : currencies.length === 0 ? (
        <option value="">No currencies available</option>
      ) : (
        currencies.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} - {c.symbol || c.code}
          </option>
        ))
      )}
    </select>
  );
}
