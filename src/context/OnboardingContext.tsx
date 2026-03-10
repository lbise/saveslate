import { useCallback, useEffect, useMemo, useState } from 'react';

import { useSettings } from '../hooks/useSettings';
import {
  completeOnboarding as completeStoredOnboarding,
  loadOnboardingState,
  resetOnboardingState,
} from '../lib/onboarding-storage';
import { OnboardingContext } from './onboarding-context';

import type { ReactNode } from 'react';
import type { CategoryPreset, OnboardingState } from '../types';

interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { defaultCurrency, setDefaultCurrency } = useSettings();
  const [onboardingState, setOnboardingState] = useState<OnboardingState>(loadOnboardingState);

  useEffect(() => {
    if (
      onboardingState.isComplete
      && onboardingState.defaultCurrency
      && onboardingState.defaultCurrency !== defaultCurrency
    ) {
      setDefaultCurrency(onboardingState.defaultCurrency);
    }
  }, [defaultCurrency, onboardingState, setDefaultCurrency]);

  const completeOnboarding = useCallback((options: {
    defaultCurrency: string;
    categoryPreset: CategoryPreset;
  }) => {
    setDefaultCurrency(options.defaultCurrency);
    const nextState = completeStoredOnboarding(options);
    setOnboardingState(nextState);
  }, [setDefaultCurrency]);

  const resetOnboarding = useCallback(() => {
    resetOnboardingState();
    setOnboardingState(loadOnboardingState());
  }, []);

  const value = useMemo(() => ({
    onboardingState,
    isOnboardingComplete: onboardingState.isComplete,
    completeOnboarding,
    resetOnboarding,
  }), [completeOnboarding, onboardingState, resetOnboarding]);

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}
