import { useCallback, useMemo, useState } from 'react';

import { readStorageWithLegacy } from '../lib/storage-migration';
import { SettingsContext } from './settings-context';

import type { ReactNode } from 'react';

const STORAGE_KEY = 'saveslate:settings:default-currency';
const LEGACY_STORAGE_KEY = 'melomoney:settings:default-currency';
const FALLBACK_CURRENCY = 'CHF';

function loadCurrency(): string {
  try {
    const raw = readStorageWithLegacy(STORAGE_KEY, LEGACY_STORAGE_KEY);
    if (!raw) return FALLBACK_CURRENCY;
    const normalized = raw.trim().toUpperCase();
    return normalized || FALLBACK_CURRENCY;
  } catch {
    return FALLBACK_CURRENCY;
  }
}

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [defaultCurrency, setDefaultCurrencyState] = useState(loadCurrency);

  const setDefaultCurrency = useCallback((currency: string) => {
    setDefaultCurrencyState(currency);
    localStorage.setItem(STORAGE_KEY, currency);
  }, []);

  const value = useMemo(
    () => ({ defaultCurrency, setDefaultCurrency }),
    [defaultCurrency, setDefaultCurrency],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
