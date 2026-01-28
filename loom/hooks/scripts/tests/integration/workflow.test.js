import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { validateWrite } from '../../pre-tool-use/validate-write.js';
import { validateTask } from '../../pre-tool-use/validate-task.js';
import { handleSubagentComplete } from '../../post-tool-use/handle-subagent-complete.js';
import { readState, readStateField } from '../../utils/state.js';

/**
 * Integration tests for the complete Loom workflow
 *
 * Tests the full sequence: Context → Planning → Review → Execution
 * Verifies that hooks enforce the workflow and state transitions correctly.
 */
describe('Loom Workflow Integration', () => {
  let testDir;
  let sessionDir;
  const TICKET_ID = 'TEST-123';

  beforeEach(() => {
    testDir = join(tmpdir(), `loom-integration-${process.pid}-${Math.random().toString(36).slice(2)}`);
    sessionDir = join(testDir, '.claude', 'loom', 'threads', TICKET_ID);
    mkdirSync(sessionDir, { recursive: true });
    process.chdir(testDir);
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Happy Path: Complete Workflow', () => {
    test('Phase 1: Context Definition', () => {
      // Step 1: Create context.md (first artifact, always allowed)
      const contextResult = validateWrite(join(sessionDir, 'context.md'));
      assert.strictEqual(contextResult.allowed, true, 'context.md should be allowed as first artifact');

      // Simulate writing context.md
      writeFileSync(join(sessionDir, 'context.md'), `# Context: ${TICKET_ID}

## What
Add user preferences API endpoint

## Why
Users need to customize their experience

## Acceptance Criteria
- [ ] AC1: GET /api/preferences returns user preferences
- [ ] AC2: PUT /api/preferences updates preferences
- [ ] AC3: Preferences persist across sessions
`);

      // Verify state.json was initialized
      assert.ok(existsSync(join(sessionDir, 'state.json')), 'state.json should be created');
      const state = readState(sessionDir);
      assert.strictEqual(state.value.ticket, TICKET_ID);
      assert.strictEqual(state.value.phase, 'context');
      assert.strictEqual(state.value.context_reviewed, false);
    });

    test('Phase 1→2: Context Review Gate', () => {
      // Setup: context.md exists
      writeFileSync(join(sessionDir, 'context.md'), '# Context');
      validateWrite(join(sessionDir, 'context.md')); // Initialize state

      // Cannot create implementation-plan.md without approved context review
      const planBlockedResult = validateWrite(join(sessionDir, 'implementation-plan.md'));
      assert.strictEqual(planBlockedResult.allowed, false);
      assert.ok(planBlockedResult.reason.includes('reviewed and APPROVED'));

      // Create review-context.md with APPROVED verdict
      const reviewContextResult = validateWrite(join(sessionDir, 'review-context.md'));
      assert.strictEqual(reviewContextResult.allowed, true);
      writeFileSync(join(sessionDir, 'review-context.md'), `# Context Review

**Verdict:** APPROVED

The context is clear and complete.
`);

      // Simulate code-reviewer completing context review
      const reviewComplete = handleSubagentComplete(
        'loom:code-reviewer',
        `.claude/loom/threads/${TICKET_ID}`,
        'Verdict: APPROVED'
      );

      // Verify state transition
      assert.strictEqual(readStateField(sessionDir, 'context_reviewed'), true);
      assert.strictEqual(readStateField(sessionDir, 'phase'), 'planning');
      assert.ok(reviewComplete.guidance.includes('Moving to planning phase'));

      // Now implementation-plan.md should be allowed
      const planAllowedResult = validateWrite(join(sessionDir, 'implementation-plan.md'));
      assert.strictEqual(planAllowedResult.allowed, true);
    });

    test('Phase 2: Planning', () => {
      // Setup: context reviewed and approved
      writeFileSync(join(sessionDir, 'context.md'), '# Context');
      validateWrite(join(sessionDir, 'context.md'));
      writeFileSync(join(sessionDir, 'review-context.md'), '**Verdict:** APPROVED');
      handleSubagentComplete('loom:code-reviewer', `.claude/loom/threads/${TICKET_ID}`, 'APPROVED');

      // Create implementation-plan.md
      const planResult = validateWrite(join(sessionDir, 'implementation-plan.md'));
      assert.strictEqual(planResult.allowed, true);
      writeFileSync(join(sessionDir, 'implementation-plan.md'), `# Implementation Plan

## Technical Approach
REST API with Express.js

## AC → Task Mapping
- AC1 → TASK-001
- AC2 → TASK-002
- AC3 → TASK-003
`);

      // tasks.md requires approved plan review
      const tasksBlockedResult = validateWrite(join(sessionDir, 'tasks.md'));
      assert.strictEqual(tasksBlockedResult.allowed, false);
      assert.ok(tasksBlockedResult.reason.includes('reviewed and APPROVED'));

      // Create and approve plan review
      writeFileSync(join(sessionDir, 'review-plan.md'), '**Verdict:** APPROVED');
      handleSubagentComplete(
        'loom:code-reviewer',
        `.claude/loom/threads/${TICKET_ID} implementation plan`,
        'APPROVED'
      );
      assert.strictEqual(readStateField(sessionDir, 'plan_reviewed'), true);

      // Now tasks.md is allowed
      const tasksAllowedResult = validateWrite(join(sessionDir, 'tasks.md'));
      assert.strictEqual(tasksAllowedResult.allowed, true);
      writeFileSync(join(sessionDir, 'tasks.md'), `# Tasks

Progress: 0/3

## TASK-001
- [ ] Implement GET endpoint

## TASK-002
- [ ] Implement PUT endpoint

## TASK-003
- [ ] Add persistence layer
`);
    });

    test('Phase 2→4: Tasks Review Gate to Execution', () => {
      // Setup: through plan creation
      writeFileSync(join(sessionDir, 'context.md'), '# Context');
      validateWrite(join(sessionDir, 'context.md'));
      writeFileSync(join(sessionDir, 'review-context.md'), '**Verdict:** APPROVED');
      handleSubagentComplete('loom:code-reviewer', `.claude/loom/threads/${TICKET_ID}`, 'APPROVED');
      writeFileSync(join(sessionDir, 'implementation-plan.md'), '# Plan');
      writeFileSync(join(sessionDir, 'review-plan.md'), '**Verdict:** APPROVED');
      handleSubagentComplete('loom:code-reviewer', `.claude/loom/threads/${TICKET_ID} plan`, 'APPROVED');
      writeFileSync(join(sessionDir, 'tasks.md'), '# Tasks');

      // Cannot delegate to implementer without tasks review
      const implBlockedResult = validateTask('loom:implementer', `.claude/loom/threads/${TICKET_ID}`);
      assert.strictEqual(implBlockedResult.allowed, false);
      assert.ok(implBlockedResult.reason.includes('reviewed and APPROVED'));

      // Approve tasks review
      writeFileSync(join(sessionDir, 'review-tasks.md'), '**Verdict:** APPROVED');
      const tasksReviewComplete = handleSubagentComplete(
        'loom:code-reviewer',
        `.claude/loom/threads/${TICKET_ID} tasks.md`,
        'APPROVED'
      );

      // Verify transition to execution phase
      assert.strictEqual(readStateField(sessionDir, 'tasks_reviewed'), true);
      assert.strictEqual(readStateField(sessionDir, 'phase'), 'execution');
      assert.ok(tasksReviewComplete.guidance.includes('Moving to execution phase'));

      // Now implementer delegation is allowed
      const implAllowedResult = validateTask('loom:implementer', `.claude/loom/threads/${TICKET_ID}`);
      assert.strictEqual(implAllowedResult.allowed, true);
    });

    test('Phase 4: Task Execution Cycle', () => {
      // Setup: in execution phase
      writeFileSync(join(sessionDir, 'context.md'), '# Context');
      validateWrite(join(sessionDir, 'context.md'));
      writeFileSync(join(sessionDir, 'review-context.md'), '**Verdict:** APPROVED');
      handleSubagentComplete('loom:code-reviewer', `.claude/loom/threads/${TICKET_ID}`, 'APPROVED');
      writeFileSync(join(sessionDir, 'implementation-plan.md'), '# Plan');
      writeFileSync(join(sessionDir, 'review-plan.md'), '**Verdict:** APPROVED');
      handleSubagentComplete('loom:code-reviewer', `.claude/loom/threads/${TICKET_ID} plan`, 'APPROVED');
      writeFileSync(join(sessionDir, 'tasks.md'), '# Tasks');
      writeFileSync(join(sessionDir, 'review-tasks.md'), '**Verdict:** APPROVED');
      handleSubagentComplete('loom:code-reviewer', `.claude/loom/threads/${TICKET_ID} tasks.md`, 'APPROVED');

      // Verify we're in execution phase
      assert.strictEqual(readStateField(sessionDir, 'phase'), 'execution');

      // Implementer completes task
      const implComplete = handleSubagentComplete(
        'loom:implementer',
        `.claude/loom/threads/${TICKET_ID}`,
        'Task complete'
      );
      assert.strictEqual(readStateField(sessionDir, 'task_status'), 'awaiting_review');
      assert.ok(implComplete.guidance.includes('code-reviewer'));

      // Cannot delegate to implementer while awaiting review
      const implBlockedResult = validateTask('loom:implementer', `.claude/loom/threads/${TICKET_ID}`);
      assert.strictEqual(implBlockedResult.allowed, false);
      assert.ok(implBlockedResult.reason.includes('awaiting code review'));

      // Code reviewer approves task
      const taskReviewComplete = handleSubagentComplete(
        'loom:code-reviewer',
        `.claude/loom/threads/${TICKET_ID}`,
        'Verdict: APPROVED'
      );
      assert.strictEqual(readStateField(sessionDir, 'task_status'), 'awaiting_approval');
      assert.ok(taskReviewComplete.guidance.includes('AUTO-PROCEED'));
    });
  });

  describe('Revision Cycles', () => {
    test('NEEDS_REVISION increments cycle count', () => {
      // Setup: in execution phase with task awaiting review
      writeFileSync(join(sessionDir, 'context.md'), '# Context');
      validateWrite(join(sessionDir, 'context.md'));
      writeFileSync(join(sessionDir, 'review-context.md'), '**Verdict:** APPROVED');
      handleSubagentComplete('loom:code-reviewer', `.claude/loom/threads/${TICKET_ID}`, 'APPROVED');
      writeFileSync(join(sessionDir, 'implementation-plan.md'), '# Plan');
      writeFileSync(join(sessionDir, 'review-plan.md'), '**Verdict:** APPROVED');
      handleSubagentComplete('loom:code-reviewer', `.claude/loom/threads/${TICKET_ID} plan`, 'APPROVED');
      writeFileSync(join(sessionDir, 'tasks.md'), '# Tasks');
      writeFileSync(join(sessionDir, 'review-tasks.md'), '**Verdict:** APPROVED');
      handleSubagentComplete('loom:code-reviewer', `.claude/loom/threads/${TICKET_ID} tasks.md`, 'APPROVED');

      // Implementer completes, reviewer requests revision
      handleSubagentComplete('loom:implementer', `.claude/loom/threads/${TICKET_ID}`, 'done');

      // Cycle 1
      const revision1 = handleSubagentComplete(
        'loom:code-reviewer',
        `.claude/loom/threads/${TICKET_ID}`,
        'Verdict: NEEDS_REVISION - missing error handling'
      );
      assert.strictEqual(readStateField(sessionDir, 'cycle_count'), 1);
      assert.strictEqual(readStateField(sessionDir, 'task_status'), 'addressing_feedback');
      assert.ok(revision1.guidance.includes('cycle 1 of 3'));

      // Implementer addresses feedback
      handleSubagentComplete('loom:implementer', `.claude/loom/threads/${TICKET_ID}`, 'fixed');

      // Cycle 2
      const revision2 = handleSubagentComplete(
        'loom:code-reviewer',
        `.claude/loom/threads/${TICKET_ID}`,
        'Verdict: NEEDS_REVISION - still needs tests'
      );
      assert.strictEqual(readStateField(sessionDir, 'cycle_count'), 2);
      assert.ok(revision2.guidance.includes('cycle 2 of 3'));

      // Implementer addresses feedback again
      handleSubagentComplete('loom:implementer', `.claude/loom/threads/${TICKET_ID}`, 'added tests');

      // Cycle 3 - hits max
      const revision3 = handleSubagentComplete(
        'loom:code-reviewer',
        `.claude/loom/threads/${TICKET_ID}`,
        'Verdict: NEEDS_REVISION - edge case not handled'
      );
      assert.strictEqual(readStateField(sessionDir, 'cycle_count'), 3);
      assert.strictEqual(readStateField(sessionDir, 'task_status'), 'blocked');
      assert.ok(revision3.guidance.includes('MAXIMUM CYCLES REACHED'));
      assert.ok(revision3.guidance.includes('Human intervention'));
    });

    test('Max cycles blocks further delegation', () => {
      // Setup: at max cycles
      writeFileSync(join(sessionDir, 'context.md'), '# Context');
      validateWrite(join(sessionDir, 'context.md'));
      writeFileSync(join(sessionDir, 'review-context.md'), '**Verdict:** APPROVED');
      handleSubagentComplete('loom:code-reviewer', `.claude/loom/threads/${TICKET_ID}`, 'APPROVED');
      writeFileSync(join(sessionDir, 'implementation-plan.md'), '# Plan');
      writeFileSync(join(sessionDir, 'review-plan.md'), '**Verdict:** APPROVED');
      handleSubagentComplete('loom:code-reviewer', `.claude/loom/threads/${TICKET_ID} plan`, 'APPROVED');
      writeFileSync(join(sessionDir, 'tasks.md'), '# Tasks');
      writeFileSync(join(sessionDir, 'review-tasks.md'), '**Verdict:** APPROVED');
      handleSubagentComplete('loom:code-reviewer', `.claude/loom/threads/${TICKET_ID} tasks.md`, 'APPROVED');

      // Simulate 3 revision cycles
      for (let i = 0; i < 3; i++) {
        handleSubagentComplete('loom:implementer', `.claude/loom/threads/${TICKET_ID}`, 'done');
        handleSubagentComplete('loom:code-reviewer', `.claude/loom/threads/${TICKET_ID}`, 'NEEDS_REVISION');
      }

      // Verify blocked
      assert.strictEqual(readStateField(sessionDir, 'cycle_count'), 3);

      // Cannot delegate to implementer at max cycles
      const blockedResult = validateTask('loom:implementer', `.claude/loom/threads/${TICKET_ID}`);
      assert.strictEqual(blockedResult.allowed, false);
      assert.ok(blockedResult.reason.includes('Maximum revision cycles'));
    });
  });

  describe('REJECTED Verdict Handling', () => {
    test('REJECTED during execution blocks the task', () => {
      // Setup: in execution phase
      writeFileSync(join(sessionDir, 'context.md'), '# Context');
      validateWrite(join(sessionDir, 'context.md'));
      writeFileSync(join(sessionDir, 'review-context.md'), '**Verdict:** APPROVED');
      handleSubagentComplete('loom:code-reviewer', `.claude/loom/threads/${TICKET_ID}`, 'APPROVED');
      writeFileSync(join(sessionDir, 'implementation-plan.md'), '# Plan');
      writeFileSync(join(sessionDir, 'review-plan.md'), '**Verdict:** APPROVED');
      handleSubagentComplete('loom:code-reviewer', `.claude/loom/threads/${TICKET_ID} plan`, 'APPROVED');
      writeFileSync(join(sessionDir, 'tasks.md'), '# Tasks');
      writeFileSync(join(sessionDir, 'review-tasks.md'), '**Verdict:** APPROVED');
      handleSubagentComplete('loom:code-reviewer', `.claude/loom/threads/${TICKET_ID} tasks.md`, 'APPROVED');

      // Implementer completes
      handleSubagentComplete('loom:implementer', `.claude/loom/threads/${TICKET_ID}`, 'done');

      // Reviewer rejects
      const rejected = handleSubagentComplete(
        'loom:code-reviewer',
        `.claude/loom/threads/${TICKET_ID}`,
        'Verdict: REJECTED - approach is fundamentally flawed'
      );

      assert.strictEqual(readStateField(sessionDir, 'task_status'), 'blocked');
      assert.ok(rejected.guidance.includes('REJECTED'));
      assert.ok(rejected.guidance.includes('Human intervention'));
    });
  });

  describe('Workflow Violations', () => {
    test('Cannot skip directly to tasks without plan', () => {
      writeFileSync(join(sessionDir, 'context.md'), '# Context');
      validateWrite(join(sessionDir, 'context.md'));
      writeFileSync(join(sessionDir, 'review-context.md'), '**Verdict:** APPROVED');

      // Try to create tasks.md without implementation-plan.md
      const result = validateWrite(join(sessionDir, 'tasks.md'));
      assert.strictEqual(result.allowed, false);
      assert.ok(result.reason.includes('implementation-plan.md must exist'));
    });

    test('Cannot delegate to planner during execution', () => {
      // Setup: in execution phase
      writeFileSync(join(sessionDir, 'context.md'), '# Context');
      validateWrite(join(sessionDir, 'context.md'));
      writeFileSync(join(sessionDir, 'review-context.md'), '**Verdict:** APPROVED');
      handleSubagentComplete('loom:code-reviewer', `.claude/loom/threads/${TICKET_ID}`, 'APPROVED');
      writeFileSync(join(sessionDir, 'implementation-plan.md'), '# Plan');
      writeFileSync(join(sessionDir, 'review-plan.md'), '**Verdict:** APPROVED');
      handleSubagentComplete('loom:code-reviewer', `.claude/loom/threads/${TICKET_ID} plan`, 'APPROVED');
      writeFileSync(join(sessionDir, 'tasks.md'), '# Tasks');
      writeFileSync(join(sessionDir, 'review-tasks.md'), '**Verdict:** APPROVED');
      handleSubagentComplete('loom:code-reviewer', `.claude/loom/threads/${TICKET_ID} tasks.md`, 'APPROVED');

      // Try to delegate to planner
      const result = validateTask('loom:planner', `.claude/loom/threads/${TICKET_ID}`);
      assert.strictEqual(result.allowed, false);
      assert.ok(result.reason.includes('Cannot delegate to planner during execution'));
    });

    test('Cannot delegate to lachesis (coordinator only)', () => {
      const result = validateTask('loom:lachesis', 'any prompt');
      assert.strictEqual(result.allowed, false);
      assert.ok(result.reason.includes('coordinator'));
    });

    test('Explorer always allowed regardless of phase', () => {
      // Setup: in execution phase with awaiting_review status
      writeFileSync(join(sessionDir, 'context.md'), '# Context');
      validateWrite(join(sessionDir, 'context.md'));
      writeFileSync(join(sessionDir, 'review-context.md'), '**Verdict:** APPROVED');
      handleSubagentComplete('loom:code-reviewer', `.claude/loom/threads/${TICKET_ID}`, 'APPROVED');
      writeFileSync(join(sessionDir, 'implementation-plan.md'), '# Plan');
      writeFileSync(join(sessionDir, 'review-plan.md'), '**Verdict:** APPROVED');
      handleSubagentComplete('loom:code-reviewer', `.claude/loom/threads/${TICKET_ID} plan`, 'APPROVED');
      writeFileSync(join(sessionDir, 'tasks.md'), '# Tasks');
      writeFileSync(join(sessionDir, 'review-tasks.md'), '**Verdict:** APPROVED');
      handleSubagentComplete('loom:code-reviewer', `.claude/loom/threads/${TICKET_ID} tasks.md`, 'APPROVED');
      handleSubagentComplete('loom:implementer', `.claude/loom/threads/${TICKET_ID}`, 'done');

      // Explorer should still be allowed
      const result = validateTask('loom:explorer', `.claude/loom/threads/${TICKET_ID}`);
      assert.strictEqual(result.allowed, true);
    });
  });

  describe('Review File Patterns', () => {
    test('review-task-NNN.md requires approved tasks review', () => {
      writeFileSync(join(sessionDir, 'context.md'), '# Context');
      validateWrite(join(sessionDir, 'context.md'));
      writeFileSync(join(sessionDir, 'tasks.md'), '# Tasks');

      // Without approved tasks review
      const blocked = validateWrite(join(sessionDir, 'review-task-001.md'));
      assert.strictEqual(blocked.allowed, false);

      // With approved tasks review
      writeFileSync(join(sessionDir, 'review-tasks.md'), '**Verdict:** APPROVED');
      const allowed = validateWrite(join(sessionDir, 'review-task-001.md'));
      assert.strictEqual(allowed.allowed, true);
    });

    test('Verdict matching is case-insensitive', () => {
      writeFileSync(join(sessionDir, 'context.md'), '# Context');
      validateWrite(join(sessionDir, 'context.md'));

      // lowercase verdict
      writeFileSync(join(sessionDir, 'review-context.md'), '**Verdict:** approved');

      const result = validateWrite(join(sessionDir, 'implementation-plan.md'));
      assert.strictEqual(result.allowed, true);
    });
  });

  describe('State Persistence', () => {
    test('State survives across multiple operations', () => {
      // Initial state
      writeFileSync(join(sessionDir, 'context.md'), '# Context');
      validateWrite(join(sessionDir, 'context.md'));

      let state = readState(sessionDir).value;
      assert.strictEqual(state.phase, 'context');
      assert.strictEqual(state.context_reviewed, false);

      // After context review
      writeFileSync(join(sessionDir, 'review-context.md'), '**Verdict:** APPROVED');
      handleSubagentComplete('loom:code-reviewer', `.claude/loom/threads/${TICKET_ID}`, 'APPROVED');

      state = readState(sessionDir).value;
      assert.strictEqual(state.phase, 'planning');
      assert.strictEqual(state.context_reviewed, true);

      // After plan creation and review
      writeFileSync(join(sessionDir, 'implementation-plan.md'), '# Plan');
      writeFileSync(join(sessionDir, 'review-plan.md'), '**Verdict:** APPROVED');
      handleSubagentComplete('loom:code-reviewer', `.claude/loom/threads/${TICKET_ID} plan`, 'APPROVED');

      state = readState(sessionDir).value;
      assert.strictEqual(state.plan_reviewed, true);

      // After tasks review
      writeFileSync(join(sessionDir, 'tasks.md'), '# Tasks');
      writeFileSync(join(sessionDir, 'review-tasks.md'), '**Verdict:** APPROVED');
      handleSubagentComplete('loom:code-reviewer', `.claude/loom/threads/${TICKET_ID} tasks.md`, 'APPROVED');

      state = readState(sessionDir).value;
      assert.strictEqual(state.phase, 'execution');
      assert.strictEqual(state.tasks_reviewed, true);
      assert.strictEqual(state.cycle_count, 0);
    });
  });
});
