import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  Verdict,
  Agent,
  TRACKED_AGENTS,
  Phase,
  TaskStatus,
  MAX_REVISION_CYCLES
} from '../../utils/constants.js';

describe('constants.js', () => {
  describe('Verdict enum', () => {
    test('has APPROVED value', () => {
      assert.strictEqual(Verdict.APPROVED, 'APPROVED');
    });

    test('has NEEDS_REVISION value', () => {
      assert.strictEqual(Verdict.NEEDS_REVISION, 'NEEDS_REVISION');
    });

    test('has REJECTED value', () => {
      assert.strictEqual(Verdict.REJECTED, 'REJECTED');
    });
  });

  describe('Agent enum', () => {
    test('has all agent identifiers', () => {
      assert.strictEqual(Agent.LACHESIS, 'loom:lachesis');
      assert.strictEqual(Agent.PLANNER, 'loom:planner');
      assert.strictEqual(Agent.IMPLEMENTER, 'loom:implementer');
      assert.strictEqual(Agent.CODE_REVIEWER, 'loom:code-reviewer');
      assert.strictEqual(Agent.EXPLORER, 'loom:explorer');
    });
  });

  describe('TRACKED_AGENTS set', () => {
    test('includes implementer', () => {
      assert.ok(TRACKED_AGENTS.has(Agent.IMPLEMENTER));
    });

    test('includes code-reviewer', () => {
      assert.ok(TRACKED_AGENTS.has(Agent.CODE_REVIEWER));
    });

    test('includes planner', () => {
      assert.ok(TRACKED_AGENTS.has(Agent.PLANNER));
    });

    test('does not include lachesis', () => {
      assert.ok(!TRACKED_AGENTS.has(Agent.LACHESIS));
    });

    test('does not include explorer', () => {
      assert.ok(!TRACKED_AGENTS.has(Agent.EXPLORER));
    });
  });

  describe('Phase enum', () => {
    test('has context phase', () => {
      assert.strictEqual(Phase.CONTEXT, 'context');
    });

    test('has planning phase', () => {
      assert.strictEqual(Phase.PLANNING, 'planning');
    });

    test('has execution phase', () => {
      assert.strictEqual(Phase.EXECUTION, 'execution');
    });
  });

  describe('TaskStatus enum', () => {
    test('has awaiting_review status', () => {
      assert.strictEqual(TaskStatus.AWAITING_REVIEW, 'awaiting_review');
    });

    test('has awaiting_approval status', () => {
      assert.strictEqual(TaskStatus.AWAITING_APPROVAL, 'awaiting_approval');
    });

    test('has addressing_feedback status', () => {
      assert.strictEqual(TaskStatus.ADDRESSING_FEEDBACK, 'addressing_feedback');
    });

    test('has blocked status', () => {
      assert.strictEqual(TaskStatus.BLOCKED, 'blocked');
    });
  });

  describe('MAX_REVISION_CYCLES', () => {
    test('is set to 3', () => {
      assert.strictEqual(MAX_REVISION_CYCLES, 3);
    });
  });
});
