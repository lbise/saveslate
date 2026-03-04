export function readStorageWithLegacy(currentKey: string, legacyKey: string): string | null {
  const currentValue = localStorage.getItem(currentKey);
  if (currentValue !== null) {
    return currentValue;
  }

  const legacyValue = localStorage.getItem(legacyKey);
  if (legacyValue === null) {
    return null;
  }

  localStorage.setItem(currentKey, legacyValue);
  localStorage.removeItem(legacyKey);
  return legacyValue;
}
