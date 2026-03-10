import { useContext } from 'react';

import { OnboardingContext } from '../context';

import type { OnboardingContextValue } from '../context';

export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }

  return context;
}
