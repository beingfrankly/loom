import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { initState, readState, updateState, readStateField } from '../../utils/state.js';

describe('state.js', () => {
  let testDir;

  beforeEach(() => {
    testDir = join(tmpdir(), `loom-test-${process.pid}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('initState', () => {
    test('creates state.json with correct initial values', () => {
      const result = initState(testDir, 'TEST-123');

      assert.strictEqual(result.success, true);
      assert.ok(existsSync(join(testDir, 'state.json')));

      const content = JSON.parse(readFileSync(join(testDir, 'state.json'), 'utf-8'));
      assert.strictEqual(content.ticket, 'TEST-123');
      assert.strictEqual(content.phase, 'context');
      assert.strictEqual(content.context_reviewed, false);
      assert.strictEqual(content.plan_reviewed, false);
      assert.strictEqual(content.tasks_reviewed, false);
      assert.strictEqual(content.current_task_id, null);
      assert.strictEqual(content.task_status, null);
      assert.strictEqual(content.cycle_count, 0);
    });

    test('does not overwrite existing state', () => {
      initState(testDir, 'TEST-123');
      updateState(testDir, { phase: 'execution' });

      const result = initState(testDir, 'TEST-456');

      assert.strictEqual(result.success, true);
      assert.ok(result.message.includes('already exists'));

      const content = JSON.parse(readFileSync(join(testDir, 'state.json'), 'utf-8'));
      assert.strictEqual(content.ticket, 'TEST-123');
      assert.strictEqual(content.phase, 'execution');
    });

    test('creates directory if it does not exist', () => {
      const nestedDir = join(testDir, 'nested', 'path');
      const result = initState(nestedDir, 'TEST-789');

      assert.strictEqual(result.success, true);
      assert.ok(existsSync(join(nestedDir, 'state.json')));
    });

    test('returns error for missing arguments', () => {
      const result1 = initState('', 'TEST-123');
      assert.strictEqual(result1.success, false);

      const result2 = initState(testDir, '');
      assert.strictEqual(result2.success, false);
    });
  });

  describe('readState', () => {
    beforeEach(() => {
      initState(testDir, 'TEST-123');
    });

    test('reads entire state when no field specified', () => {
      const result = readState(testDir);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.value.ticket, 'TEST-123');
      assert.strictEqual(result.value.phase, 'context');
    });

    test('reads specific field', () => {
      const result = readState(testDir, 'phase');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.value, 'context');
    });

    test('returns null for non-existent field', () => {
      const result = readState(testDir, 'nonexistent');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.value, null);
    });

    test('returns error for missing state file', () => {
      const emptyDir = join(testDir, 'empty');
      mkdirSync(emptyDir);

      const result = readState(emptyDir);

      assert.strictEqual(result.success, false);
      assert.ok(result.message.includes('No state.json found'));
    });

    test('returns error for missing session dir', () => {
      const result = readState('');

      assert.strictEqual(result.success, false);
    });
  });

  describe('updateState', () => {
    beforeEach(() => {
      initState(testDir, 'TEST-123');
    });

    test('updates single field', () => {
      const result = updateState(testDir, { phase: 'execution' });

      assert.strictEqual(result.success, true);
      assert.strictEqual(readStateField(testDir, 'phase'), 'execution');
    });

    test('updates multiple fields', () => {
      const result = updateState(testDir, {
        phase: 'execution',
        current_task_id: '1',
        cycle_count: 2
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(readStateField(testDir, 'phase'), 'execution');
      assert.strictEqual(readStateField(testDir, 'current_task_id'), '1');
      assert.strictEqual(readStateField(testDir, 'cycle_count'), 2);
    });

    test('preserves existing fields', () => {
      updateState(testDir, { phase: 'execution' });

      assert.strictEqual(readStateField(testDir, 'ticket'), 'TEST-123');
      assert.strictEqual(readStateField(testDir, 'context_reviewed'), false);
    });

    test('updates last_updated timestamp', async () => {
      const before = readStateField(testDir, 'last_updated');

      await new Promise(r => setTimeout(r, 50));

      updateState(testDir, { phase: 'execution' });

      const after = readStateField(testDir, 'last_updated');
      assert.notStrictEqual(before, after);
    });

    test('handles boolean values', () => {
      updateState(testDir, { context_reviewed: true });

      assert.strictEqual(readStateField(testDir, 'context_reviewed'), true);
    });

    test('handles null values', () => {
      updateState(testDir, { current_task_id: '1' });
      updateState(testDir, { current_task_id: null });

      assert.strictEqual(readStateField(testDir, 'current_task_id'), null);
    });

    test('returns error for missing state file', () => {
      const emptyDir = join(testDir, 'empty');
      mkdirSync(emptyDir);

      const result = updateState(emptyDir, { phase: 'execution' });

      assert.strictEqual(result.success, false);
    });
  });

  describe('readStateField', () => {
    beforeEach(() => {
      initState(testDir, 'TEST-123');
    });

    test('returns field value', () => {
      assert.strictEqual(readStateField(testDir, 'ticket'), 'TEST-123');
      assert.strictEqual(readStateField(testDir, 'phase'), 'context');
      assert.strictEqual(readStateField(testDir, 'cycle_count'), 0);
    });

    test('returns null for missing field', () => {
      assert.strictEqual(readStateField(testDir, 'nonexistent'), null);
    });

    test('returns null for missing state file', () => {
      const emptyDir = join(testDir, 'empty');
      mkdirSync(emptyDir);

      assert.strictEqual(readStateField(emptyDir, 'phase'), null);
    });
  });
});
