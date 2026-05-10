#!/usr/bin/env node
// Compute the next semver bump from Conventional Commits since the last
// release boundary. Prints `KEY=value` lines on stdout for the
// auto-bump workflow to capture into $GITHUB_OUTPUT. With --write,
// also updates package.json#version and stamps CHANGELOG.md's
// Unreleased heading with today's date.
//
// Boundary resolution (first match wins):
//   1. Most recent annotated tag (`git describe --tags --abbrev=0`).
//   2. Most recent `chore(release): vX.Y.Z` commit on the current branch
//      (matches the manual-release convention used pre-tag-automation).
//   3. The repo's first commit (everything counts).
//
// Bump rules (Conventional Commits 1.0.0):
//   - `<type>!:` header OR `BREAKING CHANGE:` body trailer → major
//   - `feat:` → minor
//   - `fix:` / `perf:` / `revert:` → patch
//   - everything else → no bump
// `Merge pull request #N from …` subjects are ignored entirely; the
// commits inside the PR drive the bump.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import semver from 'semver';

// Resolve the repo root from cwd via `git rev-parse --show-toplevel`, so
// the script can be exercised inside a `git worktree` without mutating
// the source checkout. If git is unreachable (e.g. test sandbox without
// a repo), fall back to the script's own location.
function resolveRepoRoot() {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  }
}

const repoRoot = resolveRepoRoot();

function git(...args) {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

function gitOk(...args) {
  try {
    return git(...args);
  } catch {
    return null;
  }
}

export function findBoundary() {
  const tag = gitOk('describe', '--tags', '--abbrev=0');
  if (tag) {
    return { kind: 'tag', ref: tag };
  }
  const releaseCommit = gitOk('log', '--grep=^chore(release):', '-n', '1', '--format=%H');
  if (releaseCommit) {
    return { kind: 'release-commit', ref: releaseCommit };
  }
  const firstCommit = gitOk('rev-list', '--max-parents=0', 'HEAD');
  if (firstCommit) {
    return { kind: 'root', ref: firstCommit.split('\n')[0] };
  }
  return null;
}

export function readCommitsSince(ref) {
  // %B = full body. %x1e = ASCII record separator between commits;
  // safe for any commit content.
  const out = gitOk('log', `${ref}..HEAD`, '--format=%B%x1e');
  if (out == null) {
    return [];
  }
  return out
    .split('\x1e')
    .map((s) => s.trim())
    .filter(Boolean);
}

const TYPE_RE = /^([a-zA-Z]+)(\([^)]*\))?(!)?:\s*(.+)$/;

export function classify(commitBody) {
  const firstLine = commitBody.split('\n', 1)[0].trim();
  if (/^Merge pull request #\d+/.test(firstLine) || /^Merge branch /.test(firstLine)) {
    return { level: 'none', type: 'merge' };
  }
  if (/^Revert ".+"$/.test(firstLine)) {
    return { level: 'patch', type: 'revert' };
  }
  const m = firstLine.match(TYPE_RE);
  if (!m) {
    return { level: 'none', type: 'unknown' };
  }
  const [, type, , bang] = m;
  const breakingTrailer = /(^|\n)BREAKING[ -]CHANGE:/.test(commitBody);
  if (bang === '!' || breakingTrailer) {
    return { level: 'major', type };
  }
  switch (type.toLowerCase()) {
    case 'feat':
      return { level: 'minor', type };
    case 'fix':
    case 'perf':
    case 'revert':
      return { level: 'patch', type };
    default:
      return { level: 'none', type };
  }
}

const RANK = { none: 0, patch: 1, minor: 2, major: 3 };

export function summarize(commits) {
  const classified = commits.map((body) => ({
    body,
    subject: body.split('\n', 1)[0],
    ...classify(body),
  }));
  let highest = 'none';
  for (const c of classified) {
    if (RANK[c.level] > RANK[highest]) {
      highest = c.level;
    }
  }
  return { level: highest, commits: classified };
}

function readPackageVersion() {
  const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  return pkg.version;
}

function writePackageVersion(next) {
  const file = path.join(repoRoot, 'package.json');
  const raw = readFileSync(file, 'utf8');
  const pkg = JSON.parse(raw);
  pkg.version = next;
  writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function stampChangelog(next) {
  const file = path.join(repoRoot, 'CHANGELOG.md');
  const raw = readFileSync(file, 'utf8');
  const stamped = raw.replace(
    /^## Unreleased\s*$/m,
    `## Unreleased\n\n## v${next} (${todayUtc()})`
  );
  if (stamped === raw) {
    throw new Error('CHANGELOG.md has no `## Unreleased` heading; refusing to stamp.');
  }
  writeFileSync(file, stamped);
}

export function plan() {
  const boundary = findBoundary();
  if (!boundary) {
    return { level: 'none', current: null, next: null, boundary: null, commits: [] };
  }
  const commits = readCommitsSince(boundary.ref);
  const summary = summarize(commits);
  const current = readPackageVersion();
  const next =
    summary.level === 'none' ? current : semver.inc(current, summary.level);
  return {
    level: summary.level,
    current,
    next,
    boundary,
    commits: summary.commits,
  };
}

function formatGithubOutput({ level, current, next, boundary, commits }) {
  const feats = commits.filter((c) => c.level === 'minor').map((c) => c.subject);
  const fixes = commits.filter((c) => c.level === 'patch').map((c) => c.subject);
  const breaks = commits.filter((c) => c.level === 'major').map((c) => c.subject);
  return [
    `LEVEL=${level}`,
    `CURRENT=${current ?? ''}`,
    `NEXT=${next ?? ''}`,
    `BOUNDARY_KIND=${boundary?.kind ?? ''}`,
    `BOUNDARY_REF=${boundary?.ref ?? ''}`,
    `COMMIT_COUNT=${commits.length}`,
    `FEATS<<__END__\n${feats.join('\n')}\n__END__`,
    `FIXES<<__END__\n${fixes.join('\n')}\n__END__`,
    `BREAKS<<__END__\n${breaks.join('\n')}\n__END__`,
  ].join('\n');
}

export function main(argv = process.argv.slice(2)) {
  const write = argv.includes('--write');
  const result = plan();
  process.stdout.write(formatGithubOutput(result) + '\n');
  if (write && result.level !== 'none' && result.next) {
    writePackageVersion(result.next);
    stampChangelog(result.next);
    process.stderr.write(`Wrote package.json version → ${result.next}\n`);
    process.stderr.write(`Stamped CHANGELOG.md Unreleased → v${result.next} (${todayUtc()})\n`);
  }
  return result;
}

const isMain = fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? '');
if (isMain) {
  main();
}
