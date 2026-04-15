import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../lib/api-client';
import { authKeys } from './api/use-auth';

import type { AppLanguage, User } from '../types';

const FALLBACK_CURRENCY = 'CHF';
const FALLBACK_LANGUAGE: AppLanguage = 'en';

export interface SettingsValue {
  defaultCurrency: string;
  preferredLanguage: AppLanguage;
  aiTranslateDescriptions: boolean;
  setDefaultCurrency: (currency: string) => void;
  setPreferredLanguage: (language: AppLanguage) => void;
  setAiTranslateDescriptions: (enabled: boolean) => void;
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
  const preferredLanguage = user?.preferredLanguage || FALLBACK_LANGUAGE;
  const aiTranslateDescriptions = user?.aiTranslateDescriptions ?? false;

  const updateUserSettings = useCallback((updates: Partial<User>) => {
    queryClient.setQueryData<User | null>(authKeys.user, (old) =>
      old ? { ...old, ...updates } : old,
    );
    api.put('/api/auth/me', updates).catch(() => {
      queryClient.invalidateQueries({ queryKey: authKeys.user });
    });
  }, [queryClient]);

  const setDefaultCurrency = useCallback((currency: string) => {
    updateUserSettings({ defaultCurrency: currency });
  }, [updateUserSettings]);

  const setPreferredLanguage = useCallback((language: AppLanguage) => {
    updateUserSettings({ preferredLanguage: language });
  }, [updateUserSettings]);

  const setAiTranslateDescriptions = useCallback((enabled: boolean) => {
    updateUserSettings({ aiTranslateDescriptions: enabled });
  }, [updateUserSettings]);

  return {
    defaultCurrency,
    preferredLanguage,
    aiTranslateDescriptions,
    setDefaultCurrency,
    setPreferredLanguage,
    setAiTranslateDescriptions,
  };
}
