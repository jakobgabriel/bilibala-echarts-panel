import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, summarize } from './bump.mjs';

const cases = [
  // [name, commitBody, expectedLevel, expectedType]
  ['empty', '', 'none', 'unknown'],
  ['feat', 'feat: add a thing', 'minor', 'feat'],
  ['feat with scope', 'feat(panel): add a thing', 'minor', 'feat'],
  ['fix', 'fix: a bug', 'patch', 'fix'],
  ['fix with scope', 'fix(deps): bump x', 'patch', 'fix'],
  ['perf', 'perf(panel): faster', 'patch', 'perf'],
  ['revert subject', 'Revert "feat: add a thing"', 'patch', 'revert'],
  ['revert keyword', 'revert: undo Y', 'patch', 'revert'],
  ['chore', 'chore: tidy', 'none', 'chore'],
  ['docs', 'docs: typo', 'none', 'docs'],
  ['ci', 'ci(release): tweak', 'none', 'ci'],
  ['refactor', 'refactor: rename', 'none', 'refactor'],
  ['breaking !', 'feat!: drop X', 'major', 'feat'],
  ['breaking trailer', 'feat: add Y\n\nBREAKING CHANGE: drops Z', 'major', 'feat'],
  ['breaking trailer with hyphen', 'fix: tweak\n\nBREAKING-CHANGE: legacy gone', 'major', 'fix'],
  ['merge PR', 'Merge pull request #14 from foo/bar', 'none', 'merge'],
  ['merge branch', 'Merge branch master into dev', 'none', 'merge'],
  ['unknown prefix', 'hotfix: urgent', 'none', 'hotfix'],
  ['no prefix', 'just a sentence', 'none', 'unknown'],
];

test('classify', () => {
  for (const [name, body, level, type] of cases) {
    const got = classify(body);
    assert.equal(got.level, level, `${name}: level`);
    assert.equal(got.type, type, `${name}: type`);
  }
});

test('summarize: empty list → none', () => {
  assert.deepEqual(summarize([]), { level: 'none', commits: [] });
});

test('summarize: highest wins (mixed feat + chore → minor)', () => {
  const out = summarize(['feat: a', 'chore: b']);
  assert.equal(out.level, 'minor');
  assert.equal(out.commits.length, 2);
});

test('summarize: one fix → patch', () => {
  assert.equal(summarize(['fix: tweak']).level, 'patch');
});

test('summarize: breaking trailer beats minor', () => {
  const out = summarize(['feat: a', 'feat: b\n\nBREAKING CHANGE: gone']);
  assert.equal(out.level, 'major');
});

test('summarize: only chore/docs → none', () => {
  assert.equal(summarize(['chore: x', 'docs: y', 'ci: z']).level, 'none');
});

test('summarize: unknown prefix is ignored, not an error', () => {
  assert.equal(summarize(['hotfix: urgent', 'banana']).level, 'none');
});

test('summarize: classified commits carry subject lines', () => {
  const out = summarize(['feat(x): add\n\nbody']);
  assert.equal(out.commits[0].subject, 'feat(x): add');
});
