import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useSettings } from '../../src/hooks';

import type { ReactNode } from 'react';
import type { User } from '../../src/types';

// Mock the api-client
vi.mock('../../src/lib/api-client', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn().mockResolvedValue({}),
  },
}));

function createWrapper(user?: User | null) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });

  // Pre-populate the auth cache if user provided
  if (user !== undefined) {
    queryClient.setQueryData(['auth', 'user'], user);
  }

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const mockUser: User = {
  id: 'test-user-id',
  name: 'Test User',
  email: 'test@example.com',
  defaultCurrency: 'EUR',
};

describe('useSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns CHF as default currency when no user loaded', () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: createWrapper(null),
    });
    expect(result.current.defaultCurrency).toBe('CHF');
  });

  it('returns user defaultCurrency from auth query', () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: createWrapper(mockUser),
    });
    expect(result.current.defaultCurrency).toBe('EUR');
  });

  it('falls back to CHF when user has no defaultCurrency', () => {
    const userWithoutCurrency: User = { ...mockUser, defaultCurrency: undefined };
    const { result } = renderHook(() => useSettings(), {
      wrapper: createWrapper(userWithoutCurrency),
    });
    expect(result.current.defaultCurrency).toBe('CHF');
  });

  it('setDefaultCurrency optimistically updates the query cache', async () => {
    const { api } = await import('../../src/lib/api-client');
    const { result } = renderHook(() => useSettings(), {
      wrapper: createWrapper(mockUser),
    });

    result.current.setDefaultCurrency('GBP');

    await waitFor(() => {
      expect(result.current.defaultCurrency).toBe('GBP');
    });
    expect(api.put).toHaveBeenCalledWith('/api/auth/me', { defaultCurrency: 'GBP' });
  });
});
