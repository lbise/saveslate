import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../lib/api-client';
import { authKeys } from '../hooks/api/use-auth';
import { useSeedCategories } from '../hooks/api/use-categories';
import { OnboardingContext } from './onboarding-context';

import type { ReactNode } from 'react';
import type { CategoryPreset, OnboardingState, User } from '../types';

interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const queryClient = useQueryClient();
  const seedCategories = useSeedCategories();

  // Subscribe to the auth user query (shared with UserProvider + useSettings)
  const { data: user } = useQuery({
    queryKey: authKeys.user,
    queryFn: () => api.get<User>('/api/auth/me'),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const onboardingState: OnboardingState = useMemo(() => ({
    version: 1,
    isComplete: !!user?.onboardingCompletedAt,
    defaultCurrency: user?.defaultCurrency,
    categoryPreset: (user?.categoryPreset as CategoryPreset) ?? undefined,
    completedAt: user?.onboardingCompletedAt ?? undefined,
  }), [user?.onboardingCompletedAt, user?.defaultCurrency, user?.categoryPreset]);

  const completeOnboarding = useCallback((options: {
    defaultCurrency: string;
    categoryPreset: CategoryPreset;
  }) => {
    // Update default currency optimistically
    queryClient.setQueryData<User | null>(authKeys.user, (old) =>
      old ? { ...old, defaultCurrency: options.defaultCurrency } : old,
    );
    api.put('/api/auth/me', { defaultCurrency: options.defaultCurrency }).catch(() => {
      queryClient.invalidateQueries({ queryKey: authKeys.user });
    });

    // Seed categories (also marks onboarding complete on the backend)
    seedCategories.mutate(options.categoryPreset);
  }, [queryClient, seedCategories]);

  const resetOnboarding = useCallback(() => {
    // No-op for now — resetting onboarding is a debug-only feature
    // Would need a backend endpoint to clear onboarding_completed_at
  }, []);

  const value = useMemo(() => ({
    onboardingState,
    isOnboardingComplete: onboardingState.isComplete,
    completeOnboarding,
    resetOnboarding,
  }), [completeOnboarding, onboardingState, resetOnboarding]);

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}
