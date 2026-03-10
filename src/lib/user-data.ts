const CLEARABLE_USER_DATA_KEYS = [
  'saveslate:transactions',
  'saveslate:import-batches',
  'saveslate:goals',
  'saveslate:accounts',
  'saveslate:categories',
  'saveslate:category-groups',
  'saveslate:tags',
  'saveslate:automation-rules',
  'saveslate:csv-parsers',
  'saveslate:onboarding',
] as const;

export function clearAllStoredUserData(): void {
  CLEARABLE_USER_DATA_KEYS.forEach((storageKey) => {
    localStorage.removeItem(storageKey);
  });
}
