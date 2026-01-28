#!/usr/bin/env node
/**
 * PostToolUse hook for Task tool - updates state after subagent completion
 * Exit 0 = success (output shown as guidance)
 *
 * Updates state.json based on which agent completed:
 *   - implementer → task_status=awaiting_review
 *   - code-reviewer → check verdict, update task_status accordingly
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { extractSessionDir, extractVerdict, checkReviewApproved } from '../utils/file-utils.js';
import { readStateField, updateState } from '../utils/state.js';
import {
  Agent,
  TRACKED_AGENTS,
  Verdict,
  Phase,
  TaskStatus,
  MAX_REVISION_CYCLES
} from '../utils/constants.js';

/**
 * Handle completion of a loom subagent
 * @param {string} subagentType - The subagent_type that completed
 * @param {string} prompt - The delegation prompt
 * @param {string} toolResult - The result from the subagent
 * @returns {{ guidance: string, stateUpdates?: object }}
 */
export function handleSubagentComplete(subagentType, prompt, toolResult) {
  // Only handle loom agents
  if (!TRACKED_AGENTS.has(subagentType)) {
    return { guidance: '' };
  }

  // Try to find session directory from prompt
  const sessionDir = extractSessionDir(prompt);

  // If we can't find session, just provide guidance without state update
  if (!sessionDir || !existsSync(join(sessionDir, 'state.json'))) {
    return getGuidanceWithoutState(subagentType);
  }

  // Read current state
  const phase = readStateField(sessionDir, 'phase');
  const currentTask = readStateField(sessionDir, 'current_task_id');
  const cycleCount = readStateField(sessionDir, 'cycle_count') || 0;

  switch (subagentType) {
    case Agent.IMPLEMENTER:
      return handleImplementerComplete(sessionDir, currentTask);

    case Agent.CODE_REVIEWER:
      return handleCodeReviewerComplete(sessionDir, phase, currentTask, cycleCount, toolResult);

    case Agent.PLANNER:
      return handlePlannerComplete();

    default:
      return { guidance: '' };
  }
}

function getGuidanceWithoutState(subagentType) {
  switch (subagentType) {
    case Agent.IMPLEMENTER:
      return {
        guidance: `<post-task-guidance>
Implementer completed. Next: Delegate to ${Agent.CODE_REVIEWER} for task review.
</post-task-guidance>`
      };

    case Agent.CODE_REVIEWER:
      return {
        guidance: `<post-task-guidance>
Code reviewer completed. Check the review verdict and proceed accordingly.
</post-task-guidance>`
      };

    case Agent.PLANNER:
      return {
        guidance: `<post-task-guidance>
Planner completed. Plan and tasks now exist.

AUTO-PROCEEDING: Delegate to ${Agent.CODE_REVIEWER} in BACKGROUND mode.
Use: run_in_background=true
Inform user: 'Plan review running in background. You can continue working.'
</post-task-guidance>`
      };

    default:
      return { guidance: '' };
  }
}

function handleImplementerComplete(sessionDir, currentTask) {
  // Implementer finished - update state to awaiting_review
  updateState(sessionDir, { task_status: TaskStatus.AWAITING_REVIEW });

  return {
    guidance: `<post-task-guidance>
Implementer completed task ${currentTask || '(unknown)'}.
State updated: task_status=${TaskStatus.AWAITING_REVIEW}

REQUIRED NEXT STEP: Delegate to ${Agent.CODE_REVIEWER} to review this task implementation.
The code-reviewer will create review-task-{NNN}.md with their verdict.
</post-task-guidance>`,
    stateUpdates: { task_status: TaskStatus.AWAITING_REVIEW }
  };
}

function handleCodeReviewerComplete(sessionDir, phase, currentTask, cycleCount, toolResult) {
  const verdict = extractVerdict(toolResult);

  if (phase === Phase.EXECUTION) {
    return handleExecutionPhaseReview(sessionDir, currentTask, cycleCount, verdict);
  } else {
    return handlePlanningPhaseReview(sessionDir, phase, verdict);
  }
}

function handleExecutionPhaseReview(sessionDir, currentTask, cycleCount, verdict) {
  switch (verdict) {
    case Verdict.APPROVED:
      updateState(sessionDir, { task_status: TaskStatus.AWAITING_APPROVAL });
      return {
        guidance: `<post-task-guidance>
Code reviewer ${Verdict.APPROVED} task ${currentTask || '(unknown)'}.
State updated: task_status=${TaskStatus.AWAITING_APPROVAL}

AUTO-PROCEED: Mark task complete and proceed to next task.
- Edit tasks.md: change [~] to [x] for this task
- Update Progress line
- Find next pending task [ ] and continue
</post-task-guidance>`,
        stateUpdates: { task_status: TaskStatus.AWAITING_APPROVAL }
      };

    case Verdict.NEEDS_REVISION: {
      const newCycle = cycleCount + 1;

      if (newCycle >= MAX_REVISION_CYCLES) {
        updateState(sessionDir, { task_status: TaskStatus.BLOCKED, cycle_count: newCycle });
        return {
          guidance: `<post-task-guidance>
Code reviewer requested REVISION (cycle ${newCycle} of ${MAX_REVISION_CYCLES}).
MAXIMUM CYCLES REACHED - Human intervention required.

State updated: task_status=${TaskStatus.BLOCKED}, cycle_count=${newCycle}

STOP AND INFORM USER:
- /loom-approve : Accept current implementation as-is
- /loom-reject "specific guidance" : Provide detailed guidance for final attempt
- /loom-skip : Mark task as blocked and move to next task
</post-task-guidance>`,
          stateUpdates: { task_status: TaskStatus.BLOCKED, cycle_count: newCycle }
        };
      } else {
        updateState(sessionDir, { task_status: TaskStatus.ADDRESSING_FEEDBACK, cycle_count: newCycle });
        return {
          guidance: `<post-task-guidance>
Code reviewer requested REVISION (cycle ${newCycle} of ${MAX_REVISION_CYCLES}).
State updated: task_status=${TaskStatus.ADDRESSING_FEEDBACK}, cycle_count=${newCycle}

NEXT STEP: Delegate back to ${Agent.IMPLEMENTER} with the reviewer's feedback.
Include the specific issues from the review in your delegation prompt.
</post-task-guidance>`,
          stateUpdates: { task_status: TaskStatus.ADDRESSING_FEEDBACK, cycle_count: newCycle }
        };
      }
    }

    case Verdict.REJECTED:
      updateState(sessionDir, { task_status: TaskStatus.BLOCKED });
      return {
        guidance: `<post-task-guidance>
Code reviewer ${Verdict.REJECTED} the implementation.
State updated: task_status=${TaskStatus.BLOCKED}

This typically means the approach is fundamentally flawed.
STOP AND INFORM USER - Human intervention required to decide next steps.

OPTIONS:
- /loom-skip : Mark task as blocked and move to next task
- Revisit the task definition in tasks.md
</post-task-guidance>`,
        stateUpdates: { task_status: TaskStatus.BLOCKED }
      };

    default:
      return {
        guidance: `<post-task-guidance>
Code reviewer completed but verdict unclear.
Check the review file for the verdict (${Verdict.APPROVED}/${Verdict.NEEDS_REVISION}/${Verdict.REJECTED}).
</post-task-guidance>`
      };
  }
}

/**
 * Determine if this is a tasks review based on artifact state
 * More robust than checking prompt content - uses file existence
 * @param {string} sessionDir - Session directory path
 * @returns {boolean} True if this is a tasks review, false if plan review
 */
function isTasksReview(sessionDir) {
  // If tasks.md exists and review-plan.md is already approved, this is tasks review
  const tasksExists = existsSync(join(sessionDir, 'tasks.md'));
  const planReviewApproved = checkReviewApproved(join(sessionDir, 'review-plan.md'));

  return tasksExists && planReviewApproved;
}

function handlePlanningPhaseReview(sessionDir, phase, verdict) {
  switch (verdict) {
    case Verdict.APPROVED:
      if (phase === Phase.CONTEXT) {
        updateState(sessionDir, { context_reviewed: true, phase: Phase.PLANNING });
        return {
          guidance: `<post-task-guidance>
Context review ${Verdict.APPROVED}. Moving to ${Phase.PLANNING} phase.
State updated: context_reviewed=true, phase=${Phase.PLANNING}

AUTO-PROCEED: Delegate to ${Agent.PLANNER} to create implementation-plan.md and tasks.md
</post-task-guidance>`,
          stateUpdates: { context_reviewed: true, phase: Phase.PLANNING }
        };
      } else if (phase === Phase.PLANNING) {
        // Use artifact state to determine if this is plan or tasks review
        if (isTasksReview(sessionDir)) {
          updateState(sessionDir, {
            tasks_reviewed: true,
            phase: Phase.EXECUTION,
            task_status: null,
            cycle_count: 0
          });
          return {
            guidance: `<post-task-guidance>
Tasks review ${Verdict.APPROVED}. Moving to ${Phase.EXECUTION} phase.
State updated: tasks_reviewed=true, phase=${Phase.EXECUTION}

AUTO-PROCEED: Read tasks.md to find the first pending task, then delegate to ${Agent.IMPLEMENTER}
</post-task-guidance>`,
            stateUpdates: { tasks_reviewed: true, phase: Phase.EXECUTION, task_status: null, cycle_count: 0 }
          };
        } else {
          updateState(sessionDir, { plan_reviewed: true });
          return {
            guidance: `<post-task-guidance>
Plan review ${Verdict.APPROVED}.
State updated: plan_reviewed=true

AUTO-PROCEED: Delegate to ${Agent.CODE_REVIEWER} to review tasks.md
</post-task-guidance>`,
            stateUpdates: { plan_reviewed: true }
          };
        }
      }
      return { guidance: '' };

    case Verdict.NEEDS_REVISION:
      return {
        guidance: `<post-task-guidance>
Review verdict: ${Verdict.NEEDS_REVISION}

STOP AND INFORM USER: The review found issues that need to be addressed.

AVAILABLE COMMANDS:
- /loom-approve : Accept current state despite feedback
- /loom-reject "feedback" : Provide specific guidance for revision
- /loom-skip : Mark as blocked and move to next task

Wait for user guidance on how to proceed.
</post-task-guidance>`
      };

    case Verdict.REJECTED:
      return {
        guidance: `<post-task-guidance>
Review verdict: ${Verdict.REJECTED}

STOP AND INFORM USER: The plan has fundamental issues that cannot be addressed through revision.

AVAILABLE COMMANDS:
- /loom-skip : Skip this phase and move on
- Revisit context.md to clarify requirements

Wait for user guidance on how to proceed.
</post-task-guidance>`
      };

    default:
      return {
        guidance: `<post-task-guidance>
Code reviewer completed. Check the review file for the verdict.
</post-task-guidance>`
      };
  }
}

function handlePlannerComplete() {
  return {
    guidance: `<post-task-guidance>
Planner completed. Plan and tasks now exist.

AUTO-PROCEEDING: Delegate to ${Agent.CODE_REVIEWER} in BACKGROUND mode.
Use: run_in_background=true
Inform user: 'Plan review running in background. You can continue working.'

The reviewer will validate:
- Plan aligns with context.md acceptance criteria
- Every AC has at least one task
- Tasks are properly scoped and ordered
</post-task-guidance>`
  };
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
    const toolResult = payload?.tool_result || '';

    const result = handleSubagentComplete(subagentType, prompt, toolResult);

    // Per Claude Code hooks docs: PostToolUse hooks must output JSON with
    // hookSpecificOutput.additionalContext to provide context to Claude
    if (result.guidance) {
      const output = {
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: result.guidance
        }
      };
      process.stdout.write(JSON.stringify(output) + '\n');
    }
    process.exit(0);
  } catch (err) {
    process.stderr.write(`Error processing hook: ${err.message}\n`);
    process.exit(1);
  }
}

// Only run main if this is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
