import { createContext } from 'react';

import type { User } from '../types';

export interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
}

/**
 * Narrowed view of auth context used inside protected routes.
 * AuthGuard guarantees `user` is non-null.
 */
export interface UserContextValue {
  user: User;
  logout: () => void;
}

export const UserContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Derive display initials from a full name.
 *
 * - "John Doe"       → "JD"
 * - "Alice"          → "A"
 * - "Mary Jane Watson" → "MW" (first + last)
 * - ""               → "?"
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || parts[0] === '') return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
