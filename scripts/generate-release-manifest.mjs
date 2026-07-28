import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const event = readGitHubEvent(process.env.GITHUB_EVENT_PATH);
const repository = process.env.GITHUB_REPOSITORY ?? getGitHubRepository();
const serverUrl = process.env.GITHUB_SERVER_URL ?? 'https://github.com';
const repositoryUrl = repository ? `${serverUrl}/${repository}` : null;
const headSha = process.env.GITHUB_SHA ?? git(['rev-parse', 'HEAD']);
const shortSha = headSha.slice(0, 7);
const pushedCommits = Array.isArray(event.commits) ? event.commits : [];
const commits = pushedCommits.length > 0
  ? pushedCommits.map((commit) => ({
      sha: String(commit.id ?? '').trim(),
      title: firstLine(commit.message),
      url: commit.url ?? (repositoryUrl ? `${repositoryUrl}/commit/${commit.id}` : null),
      author: commit.author?.name ?? null,
    }))
  : [getCurrentCommit(headSha, repositoryUrl)];
const beforeSha = typeof event.before === 'string' ? event.before : null;
const hasComparableBefore = beforeSha && !/^0+$/.test(beforeSha);
const releasedAt = event.head_commit?.timestamp
  ?? process.env.RELEASED_AT
  ?? new Date().toISOString();
const releaseDate = new Date(releasedAt);
const dateVersion = Number.isNaN(releaseDate.getTime())
  ? shortSha
  : `${releaseDate.toISOString().slice(0, 10).replaceAll('-', '.')}.${shortSha}`;

const manifest = {
  schemaVersion: 1,
  id: headSha,
  version: dateVersion,
  releasedAt,
  repositoryUrl,
  compareUrl: hasComparableBefore && repositoryUrl
    ? `${repositoryUrl}/compare/${beforeSha}...${headSha}`
    : repositoryUrl
      ? `${repositoryUrl}/commit/${headSha}`
      : null,
  commits: commits
    .filter((commit) => commit.sha && commit.title)
    .reverse()
    .slice(0, 20),
};

const outputPath = path.join(root, 'public/release.json');
mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Generated ${path.relative(root, outputPath)} for ${shortSha}`);

function readGitHubEvent(eventPath) {
  if (!eventPath) return {};

  try {
    return JSON.parse(readFileSync(eventPath, 'utf8'));
  } catch {
    return {};
  }
}

function git(args) {
  try {
    return execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function getGitHubRepository() {
  const remote = git(['config', '--get', 'remote.origin.url']);
  const match = remote.match(/github\.com[/:]([^/]+\/[^/.]+)(?:\.git)?$/);
  return match?.[1] ?? null;
}

function getCurrentCommit(sha, repositoryUrl) {
  return {
    sha,
    title: firstLine(git(['show', '-s', '--format=%s', sha])) || `Build ${sha.slice(0, 7)}`,
    url: repositoryUrl ? `${repositoryUrl}/commit/${sha}` : null,
    author: git(['show', '-s', '--format=%an', sha]) || null,
  };
}

function firstLine(value) {
  return String(value ?? '').split(/\r?\n/, 1)[0].trim();
}
