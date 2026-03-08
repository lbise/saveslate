export type DataProfile = 'local' | 'demo-balanced' | 'demo-tight';

export interface DataProfileOption {
  value: DataProfile;
  label: string;
  description: string;
}

const DATA_PROFILE_STORAGE_KEY = 'saveslate:settings:data-profile';

export const DATA_PROFILE_OPTIONS: DataProfileOption[] = [
  {
    value: 'local',
    label: 'Personal (Local)',
    description: 'Use your imported and manually entered transactions from local storage.',
  },
  {
    value: 'demo-balanced',
    label: 'Demo (Balanced)',
    description: 'Income comfortably covers expenses with visible savings.',
  },
  {
    value: 'demo-tight',
    label: 'Demo (Tight)',
    description: 'Expenses exceed income and show a shortfall scenario.',
  },
];

export function isDataProfile(value: string): value is DataProfile {
  return DATA_PROFILE_OPTIONS.some((option) => option.value === value);
}

export function loadActiveDataProfile(): DataProfile {
  try {
    const raw = localStorage.getItem(DATA_PROFILE_STORAGE_KEY);
    if (!raw) {
      return 'local';
    }

    const normalized = raw.trim();
    if (!normalized || !isDataProfile(normalized)) {
      return 'local';
    }

    return normalized;
  } catch {
    return 'local';
  }
}

export function saveActiveDataProfile(profile: DataProfile): void {
  localStorage.setItem(DATA_PROFILE_STORAGE_KEY, profile);
}

export function getDataProfileLabel(profile: DataProfile): string {
  return DATA_PROFILE_OPTIONS.find((option) => option.value === profile)?.label ?? profile;
}
