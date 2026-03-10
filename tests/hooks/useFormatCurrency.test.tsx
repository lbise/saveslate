import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { useFormatCurrency } from '../../src/hooks';

import type { ReactNode } from 'react';
import type { User } from '../../src/types';

// Mock the api-client
vi.mock('../../src/lib/api-client', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn().mockResolvedValue({}),
  },
}));

function createWrapper(currency = 'CHF') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });

  const user: User = {
    id: 'test-user',
    name: 'Test',
    email: 'test@test.com',
    defaultCurrency: currency,
  };
  queryClient.setQueryData(['auth', 'user'], user);

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('useFormatCurrency', () => {
  it('formats using the default currency from settings', () => {
    const { result } = renderHook(() => useFormatCurrency(), {
      wrapper: createWrapper('CHF'),
    });
    const formatted = result.current.formatCurrency(1234.56);

    expect(formatted).toContain('CHF');
    expect(formatted).toContain('1');
  });

  it('allows explicit currency override', () => {
    const { result } = renderHook(() => useFormatCurrency(), {
      wrapper: createWrapper('CHF'),
    });
    const formatted = result.current.formatCurrency(100, 'EUR');

    expect(formatted).toContain('EUR');
    expect(formatted).not.toContain('CHF');
  });

  it('formatSignedCurrency adds + for positive amounts', () => {
    const { result } = renderHook(() => useFormatCurrency(), {
      wrapper: createWrapper('CHF'),
    });
    const formatted = result.current.formatSignedCurrency(50);

    expect(formatted).toMatch(/^\+/);
    expect(formatted).toContain('CHF');
  });

  it('formatSignedCurrency adds - for negative amounts', () => {
    const { result } = renderHook(() => useFormatCurrency(), {
      wrapper: createWrapper('CHF'),
    });
    const formatted = result.current.formatSignedCurrency(-50);

    expect(formatted).toMatch(/^-/);
    expect(formatted).toContain('CHF');
  });

  it('uses non-default currency from settings', () => {
    const { result } = renderHook(() => useFormatCurrency(), {
      wrapper: createWrapper('EUR'),
    });
    const formatted = result.current.formatCurrency(100);

    expect(formatted).toContain('EUR');
    expect(formatted).not.toContain('CHF');
  });
});
