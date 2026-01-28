import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { validateTask } from '../../pre-tool-use/validate-task.js';
import { initState, updateState } from '../../utils/state.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = join(__dirname, '../../pre-tool-use/validate-task.js');

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

describe('validate-task.js', () => {
  let testDir;
  let sessionDir;

  beforeEach(() => {
    testDir = join(tmpdir(), `loom-test-${process.pid}-${Math.random().toString(36).slice(2)}`);
    sessionDir = join(testDir, '.claude', 'loom', 'threads', 'TEST-123');
    mkdirSync(sessionDir, { recursive: true });
    process.chdir(testDir);
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('validateTask function', () => {
    test('blocks delegation to loom:lachesis', () => {
      const result = validateTask('loom:lachesis', 'some prompt');
      assert.strictEqual(result.allowed, false);
      assert.ok(result.reason.includes('lachesis is the coordinator'));
    });

    test('allows Claude Code built-in agents', () => {
      const builtins = ['Explore', 'Plan', 'Bash', 'general-purpose', 'statusline-setup', 'claude-code-guide'];
      for (const agent of builtins) {
        const result = validateTask(agent, 'some prompt');
        assert.strictEqual(result.allowed, true, `Expected ${agent} to be allowed`);
      }
    });

    test('allows non-loom plugin agents', () => {
      const result = validateTask('superpowers:code-reviewer', 'some prompt');
      assert.strictEqual(result.allowed, true);
    });

    test('allows empty subagent type', () => {
      const result = validateTask('', 'some prompt');
      assert.strictEqual(result.allowed, true);
    });

    test('allows loom:explorer always', () => {
      initState(sessionDir, 'TEST-123');
      updateState(sessionDir, { phase: 'execution', task_status: 'awaiting_review' });

      const result = validateTask('loom:explorer', 'Check .claude/loom/threads/TEST-123');
      assert.strictEqual(result.allowed, true);
    });

    test('blocks loom:implementer without tasks review', () => {
      initState(sessionDir, 'TEST-123');
      writeFileSync(join(sessionDir, 'tasks.md'), '# Tasks');
      // No review-tasks.md

      const result = validateTask('loom:implementer', 'Work on .claude/loom/threads/TEST-123');
      assert.strictEqual(result.allowed, false);
      assert.ok(result.reason.includes('tasks.md is reviewed and APPROVED'));
    });

    test('allows loom:implementer with tasks review', () => {
      initState(sessionDir, 'TEST-123');
      writeFileSync(join(sessionDir, 'tasks.md'), '# Tasks');
      writeFileSync(join(sessionDir, 'review-tasks.md'), '**Verdict:** APPROVED');

      const result = validateTask('loom:implementer', 'Work on .claude/loom/threads/TEST-123');
      assert.strictEqual(result.allowed, true);
    });

    test('blocks loom:implementer when task awaiting review', () => {
      initState(sessionDir, 'TEST-123');
      writeFileSync(join(sessionDir, 'tasks.md'), '# Tasks');
      writeFileSync(join(sessionDir, 'review-tasks.md'), '**Verdict:** APPROVED');
      updateState(sessionDir, { phase: 'execution', task_status: 'awaiting_review' });

      const result = validateTask('loom:implementer', 'Work on .claude/loom/threads/TEST-123');
      assert.strictEqual(result.allowed, false);
      assert.ok(result.reason.includes('awaiting code review'));
    });

    test('blocks loom:implementer when task awaiting approval', () => {
      initState(sessionDir, 'TEST-123');
      writeFileSync(join(sessionDir, 'tasks.md'), '# Tasks');
      writeFileSync(join(sessionDir, 'review-tasks.md'), '**Verdict:** APPROVED');
      updateState(sessionDir, { phase: 'execution', task_status: 'awaiting_approval' });

      const result = validateTask('loom:implementer', 'Work on .claude/loom/threads/TEST-123');
      assert.strictEqual(result.allowed, false);
      assert.ok(result.reason.includes('awaiting human approval'));
    });

    test('blocks loom:code-reviewer when awaiting approval', () => {
      initState(sessionDir, 'TEST-123');
      writeFileSync(join(sessionDir, 'tasks.md'), '# Tasks');
      writeFileSync(join(sessionDir, 'review-tasks.md'), '**Verdict:** APPROVED');
      updateState(sessionDir, { phase: 'execution', task_status: 'awaiting_approval' });

      const result = validateTask('loom:code-reviewer', 'Review .claude/loom/threads/TEST-123');
      assert.strictEqual(result.allowed, false);
      assert.ok(result.reason.includes('awaiting human approval'));
    });

    test('blocks loom:planner during execution phase', () => {
      initState(sessionDir, 'TEST-123');
      updateState(sessionDir, { phase: 'execution' });

      const result = validateTask('loom:planner', 'Plan .claude/loom/threads/TEST-123');
      assert.strictEqual(result.allowed, false);
      assert.ok(result.reason.includes('Cannot delegate to planner during execution phase'));
    });

    test('blocks when max cycles reached', () => {
      initState(sessionDir, 'TEST-123');
      writeFileSync(join(sessionDir, 'tasks.md'), '# Tasks');
      writeFileSync(join(sessionDir, 'review-tasks.md'), '**Verdict:** APPROVED');
      updateState(sessionDir, { phase: 'execution', cycle_count: 3 });

      const result = validateTask('loom:implementer', 'Work on .claude/loom/threads/TEST-123');
      assert.strictEqual(result.allowed, false);
      assert.ok(result.reason.includes('Maximum revision cycles'));
    });
  });

  describe('hook script integration', () => {
    test('allows built-in agents via stdin', async () => {
      const result = await runHook({ tool_input: { subagent_type: 'Explore', prompt: 'test' } });
      assert.strictEqual(result.code, 0);
    });

    test('blocks loom:lachesis via stdin', async () => {
      const result = await runHook({ tool_input: { subagent_type: 'loom:lachesis', prompt: 'test' } });
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
    });
  });
});
