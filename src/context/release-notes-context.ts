import { createContext } from 'react';

import type { ReleaseManifest } from '../lib/release-notes';

export interface ReleaseNotesContextValue {
  release: ReleaseManifest | null;
  isLoading: boolean;
  openReleaseNotes: () => void;
}

export const ReleaseNotesContext = createContext<
  ReleaseNotesContextValue | undefined
>(undefined);
