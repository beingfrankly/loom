import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { handleSubagentComplete } from '../../post-tool-use/handle-subagent-complete.js';
import { initState, readStateField, updateState } from '../../utils/state.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = join(__dirname, '../../post-tool-use/handle-subagent-complete.js');

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

describe('handle-subagent-complete.js', () => {
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

  describe('handleSubagentComplete function', () => {
    test('returns empty guidance for non-tracked agents', () => {
      const result = handleSubagentComplete('Explore', 'prompt', 'result');
      assert.strictEqual(result.guidance, '');
    });

    test('provides guidance for implementer without session', () => {
      const result = handleSubagentComplete('loom:implementer', 'no session path', 'result');
      assert.ok(result.guidance.includes('post-task-guidance'));
      assert.ok(result.guidance.includes('code-reviewer'));
    });

    test('updates state after implementer completes', () => {
      initState(sessionDir, 'TEST-123');
      updateState(sessionDir, { phase: 'execution', current_task_id: '1' });

      const result = handleSubagentComplete('loom:implementer', '.claude/loom/threads/TEST-123', 'done');

      assert.strictEqual(readStateField(sessionDir, 'task_status'), 'awaiting_review');
      assert.ok(result.guidance.includes('task_status=awaiting_review'));
    });

    test('handles code-reviewer APPROVED in execution phase', () => {
      initState(sessionDir, 'TEST-123');
      updateState(sessionDir, { phase: 'execution', current_task_id: '1' });

      const result = handleSubagentComplete('loom:code-reviewer', '.claude/loom/threads/TEST-123', 'Verdict: APPROVED');

      assert.strictEqual(readStateField(sessionDir, 'task_status'), 'awaiting_approval');
      assert.ok(result.guidance.includes('APPROVED'));
      assert.ok(result.guidance.includes('AUTO-PROCEED'));
    });

    test('handles code-reviewer NEEDS_REVISION in execution phase', () => {
      initState(sessionDir, 'TEST-123');
      updateState(sessionDir, { phase: 'execution', current_task_id: '1', cycle_count: 0 });

      const result = handleSubagentComplete('loom:code-reviewer', '.claude/loom/threads/TEST-123', 'Verdict: NEEDS_REVISION');

      assert.strictEqual(readStateField(sessionDir, 'task_status'), 'addressing_feedback');
      assert.strictEqual(readStateField(sessionDir, 'cycle_count'), 1);
      assert.ok(result.guidance.includes('cycle 1 of 3'));
    });

    test('handles code-reviewer NEEDS_REVISION at max cycles', () => {
      initState(sessionDir, 'TEST-123');
      updateState(sessionDir, { phase: 'execution', current_task_id: '1', cycle_count: 2 });

      const result = handleSubagentComplete('loom:code-reviewer', '.claude/loom/threads/TEST-123', 'Verdict: NEEDS_REVISION');

      assert.strictEqual(readStateField(sessionDir, 'task_status'), 'blocked');
      assert.strictEqual(readStateField(sessionDir, 'cycle_count'), 3);
      assert.ok(result.guidance.includes('MAXIMUM CYCLES REACHED'));
    });

    test('handles code-reviewer REJECTED in execution phase', () => {
      initState(sessionDir, 'TEST-123');
      updateState(sessionDir, { phase: 'execution', current_task_id: '1' });

      const result = handleSubagentComplete('loom:code-reviewer', '.claude/loom/threads/TEST-123', 'Verdict: REJECTED');

      assert.strictEqual(readStateField(sessionDir, 'task_status'), 'blocked');
      assert.ok(result.guidance.includes('REJECTED'));
      assert.ok(result.guidance.includes('Human intervention'));
    });

    test('handles code-reviewer APPROVED for context review', () => {
      initState(sessionDir, 'TEST-123');
      updateState(sessionDir, { phase: 'context' });

      const result = handleSubagentComplete('loom:code-reviewer', '.claude/loom/threads/TEST-123', 'APPROVED');

      assert.strictEqual(readStateField(sessionDir, 'context_reviewed'), true);
      assert.strictEqual(readStateField(sessionDir, 'phase'), 'planning');
      assert.ok(result.guidance.includes('Moving to planning phase'));
    });

    test('handles code-reviewer APPROVED for plan review', () => {
      initState(sessionDir, 'TEST-123');
      updateState(sessionDir, { phase: 'planning' });

      const result = handleSubagentComplete('loom:code-reviewer', '.claude/loom/threads/TEST-123 implementation plan', 'APPROVED');

      assert.strictEqual(readStateField(sessionDir, 'plan_reviewed'), true);
      assert.ok(result.guidance.includes('Plan review APPROVED'));
    });

    test('handles code-reviewer APPROVED for tasks review', () => {
      initState(sessionDir, 'TEST-123');
      updateState(sessionDir, { phase: 'planning' });
      // Create required files for isTasksReview() to return true:
      // - tasks.md must exist
      // - review-plan.md must exist and contain APPROVED verdict
      writeFileSync(join(sessionDir, 'tasks.md'), '# Tasks\n');
      writeFileSync(join(sessionDir, 'review-plan.md'), '**Verdict:** APPROVED\n');

      const result = handleSubagentComplete('loom:code-reviewer', '.claude/loom/threads/TEST-123 tasks.md', 'APPROVED');

      assert.strictEqual(readStateField(sessionDir, 'tasks_reviewed'), true);
      assert.strictEqual(readStateField(sessionDir, 'phase'), 'execution');
      assert.ok(result.guidance.includes('Moving to execution phase'));
    });

    test('provides planner completion guidance', () => {
      const result = handleSubagentComplete('loom:planner', '.claude/loom/threads/TEST-123', 'done');

      assert.ok(result.guidance.includes('Planner completed'));
      assert.ok(result.guidance.includes('code-reviewer'));
      assert.ok(result.guidance.includes('BACKGROUND mode'));
    });
  });

  describe('hook script integration', () => {
    test('returns exit 0 for non-tracked agents', async () => {
      const result = await runHook({
        tool_input: { subagent_type: 'Explore', prompt: 'test' },
        tool_result: 'done'
      });
      assert.strictEqual(result.code, 0);
      assert.strictEqual(result.stdout.trim(), '');
    });

    test('outputs guidance for tracked agents', async () => {
      const result = await runHook({
        tool_input: { subagent_type: 'loom:implementer', prompt: 'test' },
        tool_result: 'done'
      });
      assert.strictEqual(result.code, 0);
      assert.ok(result.stdout.includes('post-task-guidance'));
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

  describe('Claude Code hooks compliance (JSON output format)', () => {
    test('outputs valid JSON for tracked agents with guidance', async () => {
      const result = await runHook({
        tool_input: { subagent_type: 'loom:implementer', prompt: 'test' },
        tool_result: 'done'
      });

      assert.strictEqual(result.code, 0);

      // Must be valid JSON
      let parsed;
      assert.doesNotThrow(() => {
        parsed = JSON.parse(result.stdout.trim());
      }, 'stdout must be valid JSON for PostToolUse hooks per Claude Code docs');

      assert.ok(parsed, 'Output must parse to a truthy value');
    });

    test('JSON output has correct hookSpecificOutput structure', async () => {
      const result = await runHook({
        tool_input: { subagent_type: 'loom:implementer', prompt: 'test' },
        tool_result: 'done'
      });

      const parsed = JSON.parse(result.stdout.trim());

      // Per docs: hookSpecificOutput.hookEventName and hookSpecificOutput.additionalContext
      assert.ok(parsed.hookSpecificOutput, 'Must have hookSpecificOutput field');
      assert.strictEqual(
        parsed.hookSpecificOutput.hookEventName,
        'PostToolUse',
        'hookEventName must be "PostToolUse"'
      );
      assert.ok(
        typeof parsed.hookSpecificOutput.additionalContext === 'string',
        'additionalContext must be a string'
      );
    });

    test('additionalContext contains the guidance text', async () => {
      const result = await runHook({
        tool_input: { subagent_type: 'loom:implementer', prompt: 'test' },
        tool_result: 'done'
      });

      const parsed = JSON.parse(result.stdout.trim());
      const context = parsed.hookSpecificOutput.additionalContext;

      // The guidance should be in additionalContext, not raw stdout
      assert.ok(context.includes('post-task-guidance'), 'additionalContext must contain guidance');
      assert.ok(context.includes('code-reviewer'), 'additionalContext must contain next step');
    });

    test('outputs empty JSON object for non-tracked agents (no guidance)', async () => {
      const result = await runHook({
        tool_input: { subagent_type: 'Explore', prompt: 'test' },
        tool_result: 'done'
      });

      assert.strictEqual(result.code, 0);
      // No guidance = no output (empty string is acceptable)
      assert.strictEqual(result.stdout.trim(), '', 'Non-tracked agents should produce no output');
    });

    test('planner completion outputs correct JSON structure', async () => {
      const result = await runHook({
        tool_input: { subagent_type: 'loom:planner', prompt: '.claude/loom/threads/TEST-123' },
        tool_result: 'done'
      });

      assert.strictEqual(result.code, 0);

      const parsed = JSON.parse(result.stdout.trim());
      assert.strictEqual(parsed.hookSpecificOutput.hookEventName, 'PostToolUse');
      assert.ok(parsed.hookSpecificOutput.additionalContext.includes('Planner completed'));
      assert.ok(parsed.hookSpecificOutput.additionalContext.includes('BACKGROUND'));
    });

    test('code-reviewer verdict outputs correct JSON structure', async () => {
      const result = await runHook({
        tool_input: { subagent_type: 'loom:code-reviewer', prompt: 'test' },
        tool_result: 'Verdict: APPROVED'
      });

      assert.strictEqual(result.code, 0);

      const parsed = JSON.parse(result.stdout.trim());
      assert.strictEqual(parsed.hookSpecificOutput.hookEventName, 'PostToolUse');
      assert.ok(typeof parsed.hookSpecificOutput.additionalContext === 'string');
    });
  });
});
