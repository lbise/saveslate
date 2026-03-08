import { useCallback } from 'react';

import { formatCurrency, formatSignedCurrency } from '../lib/utils';
import { useSettings } from './useSettings';

interface CurrencyFormatters {
  formatCurrency: (amount: number, currency?: string) => string;
  formatSignedCurrency: (amount: number, currency?: string) => string;
}

export function useFormatCurrency(): CurrencyFormatters {
  const { defaultCurrency } = useSettings();

  const formatCurrencyFn = useCallback(
    (amount: number, currency?: string) =>
      formatCurrency(amount, currency ?? defaultCurrency),
    [defaultCurrency],
  );

  const formatSignedCurrencyFn = useCallback(
    (amount: number, currency?: string) =>
      formatSignedCurrency(amount, currency ?? defaultCurrency),
    [defaultCurrency],
  );

  return { formatCurrency: formatCurrencyFn, formatSignedCurrency: formatSignedCurrencyFn };
}
