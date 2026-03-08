import { createContext } from 'react';

import type { UserSettings } from '../types';

export interface SettingsContextValue extends UserSettings {
  setDefaultCurrency: (currency: string) => void;
}

export const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);
