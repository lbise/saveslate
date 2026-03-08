import { useMemo } from 'react';

import { UserContext } from './user-context';

import type { ReactNode } from 'react';
import type { User } from '../types';

const DEFAULT_USER: User = {
  id: 'default',
  name: 'John Doe',
  email: 'john@example.com',
};

interface UserProviderProps {
  children: ReactNode;
  user?: User;
}

export function UserProvider({ children, user = DEFAULT_USER }: UserProviderProps) {
  const value = useMemo(
    () => ({
      user,
      logout: () => {
        // No-op stub – will be replaced by real auth logic
      },
    }),
    [user],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
