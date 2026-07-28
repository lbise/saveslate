import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReleaseNotesProvider } from '../../src/context/ReleaseNotesContext';
import { useReleaseNotes } from '../../src/hooks/useReleaseNotes';

const RELEASE = {
  schemaVersion: 1,
  id: 'abcdef1234567890',
  version: '2026.07.22.abcdef1',
  releasedAt: '2026-07-22T08:00:00.000Z',
  repositoryUrl: 'https://github.com/lbise/saveslate',
  compareUrl: 'https://github.com/lbise/saveslate/compare/123...abc',
  commits: [
    {
      sha: 'abcdef1234567890',
      title: 'Improve release notes',
      url: 'https://github.com/lbise/saveslate/commit/abcdef1234567890',
      author: 'SaveSlate',
    },
  ],
};

vi.mock('../../src/hooks/useOnboarding', () => ({
  useOnboarding: () => ({ isOnboardingComplete: true }),
}));

vi.mock('../../src/hooks/useUser', () => ({
  useUser: () => ({ user: { id: 'user-1' }, logout: vi.fn() }),
}));

function ReleaseNotesConsumer() {
  const { release, openReleaseNotes } = useReleaseNotes();
  return (
    <div>
      <span>{release?.version ?? 'No release'}</span>
      <button type="button" onClick={openReleaseNotes}>Open what&apos;s new</button>
    </div>
  );
}

describe('ReleaseNotesProvider', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response(JSON.stringify(RELEASE), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  it('opens once for a new deployment and can be reopened manually', async () => {
    const user = userEvent.setup();
    const firstRender = render(
      <ReleaseNotesProvider>
        <ReleaseNotesConsumer />
      </ReleaseNotesProvider>,
    );

    expect(await screen.findByRole('dialog', { name: /what's new in saveslate/i }))
      .toBeVisible();
    expect(screen.getByText('Improve release notes')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Got it' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(localStorage.getItem('saveslate:release:last-seen:user-1'))
      .toBe(RELEASE.id);

    firstRender.unmount();
    render(
      <ReleaseNotesProvider>
        <ReleaseNotesConsumer />
      </ReleaseNotesProvider>,
    );

    await screen.findByText(RELEASE.version);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: "Open what's new" }));
    expect(screen.getByRole('dialog', { name: /what's new in saveslate/i }))
      .toBeVisible();
  });
});
