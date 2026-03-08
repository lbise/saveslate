import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useUser } from '../../src/hooks';
import { UserProvider } from '../../src/context';

import type { ReactNode } from 'react';

describe('useUser', () => {
  it('throws when used outside UserProvider', () => {
    expect(() => renderHook(() => useUser())).toThrow(
      'useUser must be used within a UserProvider',
    );
  });

  it('returns default user when inside UserProvider', () => {
    function Wrapper({ children }: { children: ReactNode }) {
      return <UserProvider>{children}</UserProvider>;
    }

    const { result } = renderHook(() => useUser(), { wrapper: Wrapper });
    expect(result.current.user).toEqual({
      id: 'default',
      name: 'John Doe',
      email: 'john@example.com',
    });
  });

  it('returns custom user when provided', () => {
    const customUser = { id: '42', name: 'Alice', email: 'alice@test.com' };

    function Wrapper({ children }: { children: ReactNode }) {
      return <UserProvider user={customUser}>{children}</UserProvider>;
    }

    const { result } = renderHook(() => useUser(), { wrapper: Wrapper });
    expect(result.current.user).toEqual(customUser);
  });

  it('provides a logout function', () => {
    function Wrapper({ children }: { children: ReactNode }) {
      return <UserProvider>{children}</UserProvider>;
    }

    const { result } = renderHook(() => useUser(), { wrapper: Wrapper });
    expect(typeof result.current.logout).toBe('function');
    // No-op stub should not throw
    expect(() => result.current.logout()).not.toThrow();
  });
});
