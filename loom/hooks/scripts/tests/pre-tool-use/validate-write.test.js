import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { validateWrite } from '../../pre-tool-use/validate-write.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = join(__dirname, '../../pre-tool-use/validate-write.js');

/**
 * Helper to run the hook script as a child process
 */
async function runHook(input) {
  return new Promise((resolve) => {
    const proc = spawn('node', [SCRIPT_PATH]);
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => stdout += d);
    proc.stderr.on('data', d => stderr += d);
    proc.on('close', code => resolve({ code, stdout, stderr }));
    proc.stdin.write(JSON.stringify(input));
    proc.stdin.end();
  });
}

describe('validate-write.js', () => {
  let testDir;
  let sessionDir;

  beforeEach(() => {
    testDir = join(tmpdir(), `loom-test-${process.pid}-${Math.random().toString(36).slice(2)}`);
    sessionDir = join(testDir, '.claude', 'loom', 'threads', 'TEST-123');
    mkdirSync(sessionDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('validateWrite function', () => {
    test('allows non-loom files', () => {
      const result = validateWrite('/some/other/file.txt');
      assert.strictEqual(result.allowed, true);
    });

    test('allows context.md as first artifact', () => {
      const result = validateWrite(join(sessionDir, 'context.md'));
      assert.strictEqual(result.allowed, true);
    });

    test('blocks research.md without context.md', () => {
      const result = validateWrite(join(sessionDir, 'research.md'));
      assert.strictEqual(result.allowed, false);
      assert.ok(result.reason.includes('context.md must exist'));
    });

    test('allows research.md with context.md', () => {
      writeFileSync(join(sessionDir, 'context.md'), '# Context');
      const result = validateWrite(join(sessionDir, 'research.md'));
      assert.strictEqual(result.allowed, true);
    });

    test('blocks implementation-plan.md without context.md', () => {
      const result = validateWrite(join(sessionDir, 'implementation-plan.md'));
      assert.strictEqual(result.allowed, false);
      assert.ok(result.reason.includes('context.md must exist'));
    });

    test('blocks implementation-plan.md without approved review', () => {
      writeFileSync(join(sessionDir, 'context.md'), '# Context');
      const result = validateWrite(join(sessionDir, 'implementation-plan.md'));
      assert.strictEqual(result.allowed, false);
      assert.ok(result.reason.includes('must be reviewed and APPROVED'));
    });

    test('allows implementation-plan.md with approved context review', () => {
      writeFileSync(join(sessionDir, 'context.md'), '# Context');
      writeFileSync(join(sessionDir, 'review-context.md'), '**Verdict:** APPROVED');
      const result = validateWrite(join(sessionDir, 'implementation-plan.md'));
      assert.strictEqual(result.allowed, true);
    });

    test('blocks review-context.md without context.md', () => {
      const result = validateWrite(join(sessionDir, 'review-context.md'));
      assert.strictEqual(result.allowed, false);
    });

    test('allows review-context.md with context.md', () => {
      writeFileSync(join(sessionDir, 'context.md'), '# Context');
      const result = validateWrite(join(sessionDir, 'review-context.md'));
      assert.strictEqual(result.allowed, true);
    });

    test('allows review-task files when implementation-plan.md reviewed', () => {
      writeFileSync(join(sessionDir, 'context.md'), '# Context');
      writeFileSync(join(sessionDir, 'review-context.md'), '**Verdict:** APPROVED');
      writeFileSync(join(sessionDir, 'implementation-plan.md'), '# Plan');
      writeFileSync(join(sessionDir, 'review-implementation.md'), '**Verdict:** APPROVED');
      const result = validateWrite(join(sessionDir, 'review-task-001.md'));
      assert.strictEqual(result.allowed, true);
    });
  });

  describe('hook script integration', () => {
    test('allows non-loom files via stdin', async () => {
      const result = await runHook({ tool_input: { file_path: '/some/other/file.txt' } });
      assert.strictEqual(result.code, 0);
    });

    test('allows context.md via stdin', async () => {
      const result = await runHook({ tool_input: { file_path: join(sessionDir, 'context.md') } });
      assert.strictEqual(result.code, 0);
    });

    test('blocks with exit code 2 and error message', async () => {
      const result = await runHook({ tool_input: { file_path: join(sessionDir, 'research.md') } });
      assert.strictEqual(result.code, 2);
      assert.ok(result.stderr.includes('BLOCKED'));
    });

    test('handles invalid JSON gracefully', async () => {
      const result = await new Promise((resolve) => {
        const proc = spawn('node', [SCRIPT_PATH]);
        let stderr = '';
        proc.stderr.on('data', d => stderr += d);
        proc.on('close', code => resolve({ code, stderr }));
        proc.stdin.write('not valid json');
        proc.stdin.end();
      });
      assert.strictEqual(result.code, 1);
      assert.ok(result.stderr.includes('Error'));
    });
  });
});
