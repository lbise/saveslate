import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSettings } from '../../src/hooks';
import { SettingsProvider } from '../../src/context';

import type { ReactNode } from 'react';

function Wrapper({ children }: { children: ReactNode }) {
  return <SettingsProvider>{children}</SettingsProvider>;
}

describe('useSettings', () => {
  it('throws when used outside SettingsProvider', () => {
    expect(() => renderHook(() => useSettings())).toThrow(
      'useSettings must be used within a SettingsProvider',
    );
  });

  it('returns CHF as default currency', () => {
    const { result } = renderHook(() => useSettings(), { wrapper: Wrapper });
    expect(result.current.defaultCurrency).toBe('CHF');
  });

  it('updates currency and persists to localStorage', () => {
    const { result } = renderHook(() => useSettings(), { wrapper: Wrapper });

    act(() => {
      result.current.setDefaultCurrency('EUR');
    });

    expect(result.current.defaultCurrency).toBe('EUR');
    expect(localStorage.getItem('saveslate:settings:default-currency')).toBe('EUR');
  });

  it('reads persisted currency from localStorage on mount', () => {
    localStorage.setItem('saveslate:settings:default-currency', 'USD');

    const { result } = renderHook(() => useSettings(), { wrapper: Wrapper });
    expect(result.current.defaultCurrency).toBe('USD');
  });
});
