/**
 * Shared constants for Loom hooks
 */

/**
 * Review verdicts
 * @enum {string}
 */
export const Verdict = {
  APPROVED: 'APPROVED',
  NEEDS_REVISION: 'NEEDS_REVISION',
  REJECTED: 'REJECTED'
};

/**
 * Loom agent identifiers
 * @enum {string}
 */
export const Agent = {
  LACHESIS: 'loom:lachesis',
  PLANNER: 'loom:planner',
  IMPLEMENTER: 'loom:implementer',
  CODE_REVIEWER: 'loom:code-reviewer',
  EXPLORER: 'loom:explorer'
};

/**
 * Set of agents that are tracked for state management
 * @type {Set<string>}
 */
export const TRACKED_AGENTS = new Set([
  Agent.IMPLEMENTER,
  Agent.CODE_REVIEWER,
  Agent.PLANNER
]);

/**
 * Workflow phases
 * @enum {string}
 */
export const Phase = {
  CONTEXT: 'context',
  PLANNING: 'planning',
  EXECUTION: 'execution'
};

/**
 * Task status values
 * @enum {string}
 */
export const TaskStatus = {
  AWAITING_REVIEW: 'awaiting_review',
  AWAITING_APPROVAL: 'awaiting_approval',
  ADDRESSING_FEEDBACK: 'addressing_feedback',
  BLOCKED: 'blocked'
};

/**
 * Maximum implementation/review cycles before human escalation
 * @type {number}
 */
export const MAX_REVISION_CYCLES = 3;
