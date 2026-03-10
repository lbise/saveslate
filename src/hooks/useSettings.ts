import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../lib/api-client';
import { authKeys } from './api/use-auth';

import type { User } from '../types';

const FALLBACK_CURRENCY = 'CHF';

export interface SettingsValue {
  defaultCurrency: string;
  setDefaultCurrency: (currency: string) => void;
}

/**
 * Read/write user settings backed by the API.
 * Subscribes to the same auth/user query as UserProvider.
 */
export function useSettings(): SettingsValue {
  const queryClient = useQueryClient();

  // Share the auth user query — same key as UserProvider
  const { data: user } = useQuery({
    queryKey: authKeys.user,
    queryFn: () => api.get<User>('/api/auth/me'),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const defaultCurrency = user?.defaultCurrency || FALLBACK_CURRENCY;

  const setDefaultCurrency = useCallback((currency: string) => {
    // Optimistically update the auth cache
    queryClient.setQueryData<User | null>(authKeys.user, (old) =>
      old ? { ...old, defaultCurrency: currency } : old,
    );
    // Persist to backend (fire-and-forget with rollback on error)
    api.put('/api/auth/me', { defaultCurrency: currency }).catch(() => {
      queryClient.invalidateQueries({ queryKey: authKeys.user });
    });
  }, [queryClient]);

  return { defaultCurrency, setDefaultCurrency };
}
