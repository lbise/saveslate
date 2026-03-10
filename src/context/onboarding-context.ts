import { createContext } from 'react';

import type { CategoryPreset, OnboardingState } from '../types';

export interface OnboardingContextValue {
  onboardingState: OnboardingState;
  isOnboardingComplete: boolean;
  completeOnboarding: (options: {
    defaultCurrency: string;
    categoryPreset: CategoryPreset;
  }) => void;
  resetOnboarding: () => void;
}

export const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);
