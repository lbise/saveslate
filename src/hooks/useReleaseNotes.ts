import { useContext } from 'react';

import { ReleaseNotesContext } from '../context/release-notes-context';

export function useReleaseNotes() {
  const context = useContext(ReleaseNotesContext);
  if (context === undefined) {
    throw new Error('useReleaseNotes must be used within a ReleaseNotesProvider');
  }
  return context;
}
