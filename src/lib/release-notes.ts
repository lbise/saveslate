const RELEASE_MANIFEST_URL = '/release.json';
const RELEASE_STORAGE_PREFIX = 'saveslate:release:last-seen';

export interface ReleaseCommit {
  sha: string;
  title: string;
  url: string | null;
  author: string | null;
}

export interface ReleaseManifest {
  schemaVersion: 1;
  id: string;
  version: string;
  releasedAt: string | null;
  repositoryUrl: string | null;
  compareUrl: string | null;
  commits: ReleaseCommit[];
}

export async function fetchReleaseManifest(
  signal?: AbortSignal,
): Promise<ReleaseManifest | null> {
  const response = await fetch(RELEASE_MANIFEST_URL, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    return null;
  }

  return parseReleaseManifest(await response.json());
}

export function parseReleaseManifest(value: unknown): ReleaseManifest | null {
  if (!isRecord(value)
    || value.schemaVersion !== 1
    || typeof value.id !== 'string'
    || value.id.length === 0
    || typeof value.version !== 'string'
    || !isNullableString(value.releasedAt)
    || !isNullableHttpUrl(value.repositoryUrl)
    || !isNullableHttpUrl(value.compareUrl)
    || !Array.isArray(value.commits)) {
    return null;
  }

  const commits: ReleaseCommit[] = [];
  for (const commit of value.commits) {
    if (!isRecord(commit)
      || typeof commit.sha !== 'string'
      || commit.sha.length === 0
      || typeof commit.title !== 'string'
      || commit.title.length === 0
      || !isNullableHttpUrl(commit.url)
      || !isNullableString(commit.author)) {
      return null;
    }

    commits.push({
      sha: commit.sha,
      title: commit.title,
      url: commit.url,
      author: commit.author,
    });
  }

  return {
    schemaVersion: 1,
    id: value.id,
    version: value.version,
    releasedAt: value.releasedAt,
    repositoryUrl: value.repositoryUrl,
    compareUrl: value.compareUrl,
    commits,
  };
}

export function isPublishedRelease(
  release: ReleaseManifest | null,
): release is ReleaseManifest {
  return release !== null && release.id !== 'development';
}

export function getLastSeenRelease(userId: string): string | null {
  try {
    return localStorage.getItem(getReleaseStorageKey(userId));
  } catch {
    return null;
  }
}

export function markReleaseSeen(userId: string, releaseId: string): void {
  try {
    localStorage.setItem(getReleaseStorageKey(userId), releaseId);
  } catch {
    // Storage can be unavailable in private browsing or restricted contexts.
  }
}

export function formatReleaseDate(value: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(date);
}

function getReleaseStorageKey(userId: string): string {
  return `${RELEASE_STORAGE_PREFIX}:${userId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isNullableHttpUrl(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== 'string') return false;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}
