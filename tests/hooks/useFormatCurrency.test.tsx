import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useFormatCurrency } from '../../src/hooks';
import { SettingsProvider } from '../../src/context';

import type { ReactNode } from 'react';

function Wrapper({ children }: { children: ReactNode }) {
  return <SettingsProvider>{children}</SettingsProvider>;
}

describe('useFormatCurrency', () => {
  it('formats using the default currency from settings', () => {
    localStorage.setItem('saveslate:settings:default-currency', 'CHF');

    const { result } = renderHook(() => useFormatCurrency(), { wrapper: Wrapper });
    const formatted = result.current.formatCurrency(1234.56);

    expect(formatted).toContain('CHF');
    expect(formatted).toContain('1');
  });

  it('allows explicit currency override', () => {
    localStorage.setItem('saveslate:settings:default-currency', 'CHF');

    const { result } = renderHook(() => useFormatCurrency(), { wrapper: Wrapper });
    const formatted = result.current.formatCurrency(100, 'EUR');

    expect(formatted).toContain('EUR');
    expect(formatted).not.toContain('CHF');
  });

  it('formatSignedCurrency adds + for positive amounts', () => {
    localStorage.setItem('saveslate:settings:default-currency', 'CHF');

    const { result } = renderHook(() => useFormatCurrency(), { wrapper: Wrapper });
    const formatted = result.current.formatSignedCurrency(50);

    expect(formatted).toMatch(/^\+/);
    expect(formatted).toContain('CHF');
  });

  it('formatSignedCurrency adds - for negative amounts', () => {
    localStorage.setItem('saveslate:settings:default-currency', 'CHF');

    const { result } = renderHook(() => useFormatCurrency(), { wrapper: Wrapper });
    const formatted = result.current.formatSignedCurrency(-50);

    expect(formatted).toMatch(/^-/);
    expect(formatted).toContain('CHF');
  });

  it('uses non-default currency from settings', () => {
    localStorage.setItem('saveslate:settings:default-currency', 'EUR');

    const { result } = renderHook(() => useFormatCurrency(), { wrapper: Wrapper });
    const formatted = result.current.formatCurrency(100);

    expect(formatted).toContain('EUR');
    expect(formatted).not.toContain('CHF');
  });
});
