import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchReleaseManifest,
  getLastSeenRelease,
  isPublishedRelease,
  markReleaseSeen,
  parseReleaseManifest,
} from '../../src/lib/release-notes';

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

describe('release notes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('parses a valid same-version manifest', () => {
    const parsed = parseReleaseManifest(RELEASE);

    expect(parsed).toEqual(RELEASE);
    expect(isPublishedRelease(parsed)).toBe(true);
  });

  it('rejects malformed or unsafe manifest links', () => {
    expect(parseReleaseManifest({ ...RELEASE, schemaVersion: 2 })).toBeNull();
    expect(parseReleaseManifest({
      ...RELEASE,
      commits: [{ ...RELEASE.commits[0], url: 'javascript:alert(1)' }],
    })).toBeNull();
  });

  it('fetches the manifest without using the browser cache', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(RELEASE), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(fetchReleaseManifest()).resolves.toEqual(RELEASE);
    expect(fetchMock).toHaveBeenCalledWith('/release.json', expect.objectContaining({
      cache: 'no-store',
    }));
  });

  it('stores acknowledgements independently for each user', () => {
    markReleaseSeen('user-1', RELEASE.id);

    expect(getLastSeenRelease('user-1')).toBe(RELEASE.id);
    expect(getLastSeenRelease('user-2')).toBeNull();
  });
});
