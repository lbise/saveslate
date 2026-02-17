export interface CurrencyOption {
  code: string;
  label: string;
}

export const WELL_KNOWN_CURRENCIES: CurrencyOption[] = [
  { code: 'CHF', label: 'Swiss Franc' },
  { code: 'EUR', label: 'Euro' },
  { code: 'USD', label: 'US Dollar' },
  { code: 'GBP', label: 'British Pound' },
  { code: 'CAD', label: 'Canadian Dollar' },
  { code: 'AUD', label: 'Australian Dollar' },
  { code: 'JPY', label: 'Japanese Yen' },
  { code: 'CNY', label: 'Chinese Yuan' },
  { code: 'SEK', label: 'Swedish Krona' },
  { code: 'NOK', label: 'Norwegian Krone' },
  { code: 'DKK', label: 'Danish Krone' },
];

export function getCurrencyOptionsWithFallback(currencyCode: string): CurrencyOption[] {
  const normalizedCode = currencyCode.trim().toUpperCase();
  if (!normalizedCode) {
    return WELL_KNOWN_CURRENCIES;
  }

  const hasKnownCurrency = WELL_KNOWN_CURRENCIES.some((currency) => currency.code === normalizedCode);
  if (hasKnownCurrency) {
    return WELL_KNOWN_CURRENCIES;
  }

  return [
    { code: normalizedCode, label: `${normalizedCode} (existing)` },
    ...WELL_KNOWN_CURRENCIES,
  ];
}
