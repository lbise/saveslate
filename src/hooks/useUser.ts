import { useContext } from 'react';

import { UserContext } from '../context';

import type { UserContextValue } from '../context';

export function useUser(): UserContextValue {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
