import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, rmSync, writeFileSync, existsSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  checkReviewApproved,
  extractVerdict,
  extractSessionDir,
  isLoomArtifactPath,
  parseArtifactPath,
  getTicketId
} from '../../utils/file-utils.js';
import { Verdict } from '../../utils/constants.js';

describe('file-utils.js', () => {
  let testDir;

  beforeEach(() => {
    testDir = join(tmpdir(), `loom-test-${process.pid}-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('checkReviewApproved', () => {
    test('returns false for non-existent file', () => {
      assert.strictEqual(checkReviewApproved('/nonexistent/file.md'), false);
    });

    test('returns true for file with APPROVED verdict', () => {
      const reviewPath = join(testDir, 'review.md');
      writeFileSync(reviewPath, '**Verdict:** APPROVED\n');
      assert.strictEqual(checkReviewApproved(reviewPath), true);
    });

    test('returns false for file with REJECTED verdict', () => {
      const reviewPath = join(testDir, 'review.md');
      writeFileSync(reviewPath, '**Verdict:** REJECTED\n');
      assert.strictEqual(checkReviewApproved(reviewPath), false);
    });

    test('handles verdict without markdown formatting', () => {
      const reviewPath = join(testDir, 'review.md');
      writeFileSync(reviewPath, 'Verdict: APPROVED\n');
      assert.strictEqual(checkReviewApproved(reviewPath), true);
    });
  });

  describe('extractVerdict', () => {
    test('returns null for empty text', () => {
      assert.strictEqual(extractVerdict(''), null);
      assert.strictEqual(extractVerdict(null), null);
    });

    test('extracts APPROVED verdict', () => {
      assert.strictEqual(extractVerdict('The review is APPROVED'), Verdict.APPROVED);
    });

    test('extracts NEEDS_REVISION verdict', () => {
      assert.strictEqual(extractVerdict('NEEDS_REVISION: fix tests'), Verdict.NEEDS_REVISION);
    });

    test('extracts REJECTED verdict', () => {
      assert.strictEqual(extractVerdict('REJECTED due to security issues'), Verdict.REJECTED);
    });

    test('is case-insensitive', () => {
      assert.strictEqual(extractVerdict('approved'), Verdict.APPROVED);
      assert.strictEqual(extractVerdict('Needs_Revision'), Verdict.NEEDS_REVISION);
      assert.strictEqual(extractVerdict('rejected'), Verdict.REJECTED);
    });
  });

  describe('extractSessionDir - ticket ID patterns', () => {
    test('extracts Jira-style ticket ID (PROJ-123)', () => {
      const sessionDir = join(testDir, '.claude', 'loom', 'threads', 'PROJ-123');
      mkdirSync(sessionDir, { recursive: true });
      // Use realpathSync to normalize paths (macOS has /var -> /private/var symlink)
      const normalizedSessionDir = realpathSync(sessionDir);

      const prompt = `Working on .claude/loom/threads/PROJ-123/context.md`;
      const result = extractSessionDir(prompt);
      assert.strictEqual(result, normalizedSessionDir);
    });

    test('extracts multi-segment ticket ID (PROJ-123-456)', () => {
      const sessionDir = join(testDir, '.claude', 'loom', 'threads', 'PROJ-123-456');
      mkdirSync(sessionDir, { recursive: true });
      const normalizedSessionDir = realpathSync(sessionDir);

      const prompt = `Working on .claude/loom/threads/PROJ-123-456/context.md`;
      const result = extractSessionDir(prompt);
      assert.strictEqual(result, normalizedSessionDir);
    });

    test('extracts underscore-style ticket ID (abc_123)', () => {
      const sessionDir = join(testDir, '.claude', 'loom', 'threads', 'abc_123');
      mkdirSync(sessionDir, { recursive: true });
      const normalizedSessionDir = realpathSync(sessionDir);

      const prompt = `Working on .claude/loom/threads/abc_123/context.md`;
      const result = extractSessionDir(prompt);
      assert.strictEqual(result, normalizedSessionDir);
    });

    test('returns null for non-matching paths', () => {
      assert.strictEqual(extractSessionDir('no path here'), null);
      assert.strictEqual(extractSessionDir(null), null);
    });
  });

  describe('isLoomArtifactPath', () => {
    test('returns true for loom thread paths', () => {
      assert.strictEqual(isLoomArtifactPath('/home/user/.claude/loom/threads/PROJ-123/context.md'), true);
    });

    test('returns false for non-loom paths', () => {
      assert.strictEqual(isLoomArtifactPath('/home/user/project/src/index.js'), false);
    });

    test('returns falsy for null or empty', () => {
      assert.ok(!isLoomArtifactPath(null));
      assert.ok(!isLoomArtifactPath(''));
    });
  });

  describe('parseArtifactPath', () => {
    test('parses loom artifact path correctly', () => {
      const result = parseArtifactPath('/home/user/.claude/loom/threads/PROJ-123/context.md');
      assert.deepStrictEqual(result, {
        sessionDir: '/home/user/.claude/loom/threads/PROJ-123',
        filename: 'context.md'
      });
    });

    test('returns null for non-loom paths', () => {
      assert.strictEqual(parseArtifactPath('/home/user/project/src/index.js'), null);
    });
  });

  describe('getTicketId', () => {
    test('extracts ticket ID from session directory', () => {
      assert.strictEqual(getTicketId('/home/user/.claude/loom/threads/PROJ-123'), 'PROJ-123');
      assert.strictEqual(getTicketId('/home/user/.claude/loom/threads/abc-456'), 'abc-456');
    });
  });
});
