import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '../lib/api-client';
import { UserContext } from './user-context';
import { authKeys } from '../hooks/api/use-auth';

import type { ReactNode } from 'react';
import type { User } from '../types';
import type { AuthContextValue } from './user-context';

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const queryClient = useQueryClient();

  const { data: user, isLoading, isError } = useQuery({
    queryKey: authKeys.user,
    queryFn: () => api.get<User>('/api/auth/me'),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const logoutMutation = useMutation({
    mutationFn: () => api.post<void>('/api/auth/logout'),
    onSuccess: () => {
      queryClient.setQueryData(authKeys.user, null);
      // Remove all non-auth queries to prevent stale data on re-login
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== 'auth',
      });
    },
  });

  const value: AuthContextValue = useMemo(() => ({
    user: (!isLoading && !isError && user) ? user : null,
    isLoading,
    isAuthenticated: !isLoading && !isError && !!user,
    logout: () => logoutMutation.mutate(),
  }), [user, isLoading, isError, logoutMutation]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
