#!/usr/bin/env node
/**
 * Validates delegation rules for Task tool calls
 * Exit 0 = allow, Exit 2 = block (stderr shown to Claude)
 *
 * Enforces execution phase workflow:
 *   implementing → awaiting_review → addressing_feedback → awaiting_approval
 *   Max 3 cycles before human escalation
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { extractSessionDir, checkReviewApproved } from '../utils/file-utils.js';
import { readStateField } from '../utils/state.js';
import {
  Agent,
  Phase,
  TaskStatus,
  MAX_REVISION_CYCLES
} from '../utils/constants.js';

// Claude Code built-in subagent types - always allow
const BUILTIN_AGENTS = new Set([
  'Explore',
  'Plan',
  'Bash',
  'general-purpose',
  'statusline-setup',
  'claude-code-guide'
]);

/**
 * Validate a Task tool call for delegation rules
 * @param {string} subagentType - The subagent_type being delegated to
 * @param {string} prompt - The delegation prompt
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function validateTask(subagentType, prompt) {
  // Block delegation to lachesis - it's the coordinator, not a worker
  if (subagentType === Agent.LACHESIS) {
    return {
      allowed: false,
      reason: `BLOCKED: Cannot delegate to ${Agent.LACHESIS} - lachesis is the coordinator, not a worker agent`
    };
  }

  // Claude Code built-in subagent types - always allow
  if (BUILTIN_AGENTS.has(subagentType)) {
    return { allowed: true };
  }

  // For non-loom plugin agents (e.g., superpowers:code-reviewer) - allow through
  if (subagentType && subagentType.includes(':') && !subagentType.startsWith('loom:')) {
    return { allowed: true };
  }

  // No subagent_type specified - let Task tool handle the error
  if (!subagentType) {
    return { allowed: true };
  }

  // ============================================================
  // Loom-specific validation for execution phase enforcement
  // ============================================================

  // Try to find session directory from prompt
  const sessionDir = extractSessionDir(prompt);

  // If we can't find the session directory, allow the call but can't enforce state
  if (!sessionDir || !existsSync(join(sessionDir, 'state.json'))) {
    // Still need review-tasks.md before delegating to implementer
    if (subagentType === Agent.IMPLEMENTER && sessionDir) {
      if (!checkReviewApproved(join(sessionDir, 'review-tasks.md'))) {
        return {
          allowed: false,
          reason: `BLOCKED: Cannot delegate to implementer before tasks.md is reviewed and APPROVED\nDelegate to ${Agent.CODE_REVIEWER} to review tasks.md first.`
        };
      }
    }
    return { allowed: true };
  }

  // Read current state
  const phase = readStateField(sessionDir, 'phase');
  const taskStatus = readStateField(sessionDir, 'task_status');
  const cycleCount = readStateField(sessionDir, 'cycle_count');

  // If no state or not in execution phase, use basic validation
  if (!phase || phase !== Phase.EXECUTION) {
    // Still need review-tasks.md before entering execution (delegating to implementer)
    if (subagentType === Agent.IMPLEMENTER) {
      if (!checkReviewApproved(join(sessionDir, 'review-tasks.md'))) {
        return {
          allowed: false,
          reason: `BLOCKED: Cannot delegate to implementer before tasks.md is reviewed and APPROVED\nDelegate to ${Agent.CODE_REVIEWER} to review tasks.md first.`
        };
      }
    }
    return { allowed: true };
  }

  // ============================================================
  // Execution phase state machine enforcement
  // ============================================================

  switch (subagentType) {
    case Agent.IMPLEMENTER:
      // Can delegate to implementer when:
      // - task_status is null (starting new task)
      // - task_status is "addressing_feedback" (revision cycle)
      if (taskStatus === TaskStatus.AWAITING_REVIEW) {
        return {
          allowed: false,
          reason: `BLOCKED: Cannot delegate to implementer - task is awaiting code review\nDelegate to ${Agent.CODE_REVIEWER} to review the implementation first.`
        };
      }
      if (taskStatus === TaskStatus.AWAITING_APPROVAL) {
        return {
          allowed: false,
          reason: 'BLOCKED: Cannot delegate to implementer - task is awaiting human approval\nUse /loom-approve to approve the task, or /loom-reject to reject with feedback.'
        };
      }
      break;

    case Agent.CODE_REVIEWER:
      // Can delegate to code-reviewer when:
      // - task_status is "implementing" (first review)
      // - task_status is "addressing_feedback" after implementer finishes
      // - Reviewing plans (not in execution task cycle)
      if (taskStatus === TaskStatus.AWAITING_APPROVAL) {
        return {
          allowed: false,
          reason: 'BLOCKED: Cannot delegate to code-reviewer - task already reviewed, awaiting human approval\nUse /loom-approve to approve the task, or /loom-reject to reject with feedback.'
        };
      }
      break;

    case Agent.PLANNER:
      // Planner should not be called during execution phase (tasks are already defined)
      return {
        allowed: false,
        reason: `BLOCKED: Cannot delegate to planner during ${Phase.EXECUTION} phase\nTasks are already defined in tasks.md. Use ${Agent.IMPLEMENTER} to execute tasks.`
      };

    case Agent.EXPLORER:
      // Explorer is always allowed - it's a read-only reconnaissance agent
      return { allowed: true };
  }

  // Check cycle limit
  if (cycleCount !== null && cycleCount >= MAX_REVISION_CYCLES) {
    return {
      allowed: false,
      reason: `BLOCKED: Maximum revision cycles (${MAX_REVISION_CYCLES}) reached for current task\nHuman intervention required. Use /loom-approve to accept as-is, /loom-reject with guidance, or /loom-skip to skip this task.`
    };
  }

  return { allowed: true };
}

// Main execution when run as script
async function main() {
  let input = '';

  for await (const chunk of process.stdin) {
    input += chunk;
  }

  try {
    const payload = JSON.parse(input);
    const subagentType = payload?.tool_input?.subagent_type || '';
    const prompt = payload?.tool_input?.prompt || '';

    const result = validateTask(subagentType, prompt);

    if (result.allowed) {
      process.exit(0);
    } else {
      process.stderr.write(result.reason + '\n');
      process.exit(2);
    }
  } catch (err) {
    process.stderr.write(`Error parsing input: ${err.message}\n`);
    process.exit(1);
  }
}

// Only run main if this is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
