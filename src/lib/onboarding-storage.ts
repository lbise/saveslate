import { seedCategoriesForPreset } from './category-storage';
import { seedCategoryGroupsForPreset } from './category-group-storage';
import type { CategoryPreset, OnboardingState } from '../types';

export const ONBOARDING_STORAGE_KEY = 'saveslate:onboarding';
export const ONBOARDING_VERSION = 1;

const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  version: ONBOARDING_VERSION,
  isComplete: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCategoryPreset(value: unknown): value is CategoryPreset {
  return value === 'custom' || value === 'minimal' || value === 'full';
}

function normalizeCurrency(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.toUpperCase() : undefined;
}

function parseOnboardingState(value: unknown): OnboardingState | null {
  if (!isRecord(value)) {
    return null;
  }

  const version = typeof value.version === 'number' && Number.isFinite(value.version)
    ? value.version
    : ONBOARDING_VERSION;
  const isComplete = value.isComplete === true;
  const categoryPreset = isCategoryPreset(value.categoryPreset) ? value.categoryPreset : undefined;
  const completedAt = typeof value.completedAt === 'string' && value.completedAt.trim()
    ? value.completedAt
    : undefined;

  return {
    version,
    isComplete,
    defaultCurrency: normalizeCurrency(typeof value.defaultCurrency === 'string' ? value.defaultCurrency : undefined),
    categoryPreset,
    completedAt,
  };
}

export function saveOnboardingState(state: OnboardingState): OnboardingState {
  const nextState = parseOnboardingState(state) ?? DEFAULT_ONBOARDING_STATE;
  localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(nextState));
  return nextState;
}

export function loadOnboardingState(): OnboardingState {
  try {
    const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_ONBOARDING_STATE;
    }

    const parsed = parseOnboardingState(JSON.parse(raw));
    if (!parsed) {
      return DEFAULT_ONBOARDING_STATE;
    }

    if (parsed.version !== ONBOARDING_VERSION) {
      return DEFAULT_ONBOARDING_STATE;
    }

    return parsed;
  } catch {
    return DEFAULT_ONBOARDING_STATE;
  }
}

export function completeOnboarding(options: {
  defaultCurrency: string;
  categoryPreset: CategoryPreset;
}): OnboardingState {
  seedCategoryGroupsForPreset(options.categoryPreset);
  seedCategoriesForPreset(options.categoryPreset);

  return saveOnboardingState({
    version: ONBOARDING_VERSION,
    isComplete: true,
    defaultCurrency: normalizeCurrency(options.defaultCurrency) ?? 'CHF',
    categoryPreset: options.categoryPreset,
    completedAt: new Date().toISOString(),
  });
}

export function resetOnboardingState(): void {
  localStorage.removeItem(ONBOARDING_STORAGE_KEY);
}

export function shouldShowOnboarding(): boolean {
  return !loadOnboardingState().isComplete;
}
