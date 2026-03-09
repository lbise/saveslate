const CLEARABLE_USER_DATA_KEYS = [
  'saveslate:transactions',
  'saveslate:import-batches',
  'saveslate:goals',
  'saveslate:accounts',
  'saveslate:tags',
  'saveslate:automation-rules',
  'saveslate:csv-parsers',
] as const;

export function clearAllStoredUserData(): void {
  CLEARABLE_USER_DATA_KEYS.forEach((storageKey) => {
    localStorage.removeItem(storageKey);
  });
}
