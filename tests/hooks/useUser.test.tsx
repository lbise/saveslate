import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { useAuth, useUser } from '../../src/hooks';
import { UserProvider } from '../../src/context';

import type { ReactNode } from 'react';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <UserProvider>{children}</UserProvider>
      </QueryClientProvider>
    );
  }

  return { Wrapper, queryClient };
}

describe('useAuth', () => {
  it('throws when used outside UserProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within a UserProvider',
    );
  });

  it('returns loading state initially', () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('provides a logout function', () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
    expect(typeof result.current.logout).toBe('function');
  });
});

describe('useUser', () => {
  it('throws when used outside UserProvider', () => {
    expect(() => renderHook(() => useUser())).toThrow(
      'useUser must be used within a UserProvider',
    );
  });

  it('throws when user is not authenticated', () => {
    const { Wrapper, queryClient } = createWrapper();
    // Simulate no auth — set user to null
    queryClient.setQueryData(['auth', 'user'], null);

    expect(() => renderHook(() => useUser(), { wrapper: Wrapper })).toThrow(
      'useUser must be used within an authenticated route',
    );
  });

  it('returns user when authenticated', () => {
    const { Wrapper, queryClient } = createWrapper();
    const mockUser = { id: '42', name: 'Alice', email: 'alice@test.com' };
    queryClient.setQueryData(['auth', 'user'], mockUser);

    const { result } = renderHook(() => useUser(), { wrapper: Wrapper });
    expect(result.current.user).toEqual(mockUser);
  });
});
