import { useContext } from 'react';

import { UserContext } from '../context';

import type { AuthContextValue, UserContextValue } from '../context';

/**
 * Access the full auth context (user | null, loading, authenticated).
 * Use this in auth guards and pages that need to check auth state.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a UserProvider');
  }
  return context;
}

/**
 * Access the authenticated user. Throws if the user is not logged in.
 * Only use this inside routes protected by AuthGuard.
 */
export function useUser(): UserContextValue {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  if (!context.user) {
    throw new Error('useUser must be used within an authenticated route');
  }
  return { user: context.user, logout: context.logout };
}
