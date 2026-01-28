#!/usr/bin/env node
/**
 * Validates artifact preconditions for loom session files
 * Exit 0 = allow, Exit 2 = block (stderr shown to Claude)
 *
 * Enforces review-gated phase progression:
 *   context.md → review-context.md → implementation-plan.md → review-plan.md → tasks.md → review-tasks.md → execution
 */

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { isLoomArtifactPath, parseArtifactPath, checkReviewApproved, getTicketId } from '../utils/file-utils.js';
import { initState } from '../utils/state.js';

/**
 * Validate preconditions for writing a loom artifact
 * @param {string} filePath - Path to the file being written
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function validateWrite(filePath) {
  // Only validate loom artifacts
  if (!isLoomArtifactPath(filePath)) {
    return { allowed: true };
  }

  const parsed = parseArtifactPath(filePath);
  if (!parsed) {
    return { allowed: true };
  }

  const { sessionDir, filename } = parsed;

  // Handle each artifact type
  switch (filename) {
    case 'context.md':
      // No preconditions - first artifact
      // Initialize state.json if it doesn't exist
      const ticketId = getTicketId(sessionDir);
      if (!existsSync(join(sessionDir, 'state.json'))) {
        initState(sessionDir, ticketId);
      }
      return { allowed: true };

    case 'research.md':
      if (!existsSync(join(sessionDir, 'context.md'))) {
        return {
          allowed: false,
          reason: 'BLOCKED: context.md must exist before creating research.md\nCreate context.md first by invoking the context-template skill.'
        };
      }
      return { allowed: true };

    case 'implementation-plan.md':
      if (!existsSync(join(sessionDir, 'context.md'))) {
        return {
          allowed: false,
          reason: 'BLOCKED: context.md must exist before creating implementation-plan.md\nCreate context.md first by invoking the context-template skill and collaborating with the user.'
        };
      }
      // REVIEW GATE: context.md must be reviewed and APPROVED
      if (!checkReviewApproved(join(sessionDir, 'review-context.md'))) {
        return {
          allowed: false,
          reason: 'BLOCKED: context.md must be reviewed and APPROVED before creating implementation-plan.md\nDelegate to loom:code-reviewer to review context.md first.'
        };
      }
      return { allowed: true };

    case 'tasks.md':
      if (!existsSync(join(sessionDir, 'context.md'))) {
        return {
          allowed: false,
          reason: 'BLOCKED: context.md must exist before creating tasks.md'
        };
      }
      if (!existsSync(join(sessionDir, 'implementation-plan.md'))) {
        return {
          allowed: false,
          reason: 'BLOCKED: implementation-plan.md must exist before creating tasks.md\nCreate implementation-plan.md first by invoking the plan-template skill.'
        };
      }
      // REVIEW GATE: implementation-plan.md must be reviewed and approved
      if (!checkReviewApproved(join(sessionDir, 'review-plan.md'))) {
        return {
          allowed: false,
          reason: 'BLOCKED: implementation-plan.md must be reviewed and APPROVED before creating tasks.md\nDelegate to loom:code-reviewer to review implementation-plan.md first.'
        };
      }
      return { allowed: true };

    case 'review-context.md':
      if (!existsSync(join(sessionDir, 'context.md'))) {
        return {
          allowed: false,
          reason: 'BLOCKED: context.md must exist before reviewing it'
        };
      }
      return { allowed: true };

    case 'review-plan.md':
      if (!existsSync(join(sessionDir, 'implementation-plan.md'))) {
        return {
          allowed: false,
          reason: 'BLOCKED: implementation-plan.md must exist before reviewing it'
        };
      }
      return { allowed: true };

    case 'review-tasks.md':
      if (!existsSync(join(sessionDir, 'tasks.md'))) {
        return {
          allowed: false,
          reason: 'BLOCKED: tasks.md must exist before reviewing it'
        };
      }
      return { allowed: true };

    default:
      // Handle review-task-*.md pattern
      if (/^review-task-.*\.md$/.test(filename)) {
        if (!checkReviewApproved(join(sessionDir, 'review-tasks.md'))) {
          return {
            allowed: false,
            reason: 'BLOCKED: tasks.md must be reviewed and APPROVED before entering execution phase\nDelegate to loom:code-reviewer to review tasks.md first.'
          };
        }
        return { allowed: true };
      }

      // Handle generic review-*.md files
      if (/^review-.*\.md$/.test(filename)) {
        if (!existsSync(join(sessionDir, 'implementation-plan.md'))) {
          return {
            allowed: false,
            reason: 'BLOCKED: implementation-plan.md must exist before creating reviews\nThe planning phase must complete before reviews can begin.'
          };
        }
        return { allowed: true };
      }

      // Allow other files
      return { allowed: true };
  }
}

// Main execution when run as script
async function main() {
  let input = '';

  for await (const chunk of process.stdin) {
    input += chunk;
  }

  try {
    const payload = JSON.parse(input);
    const filePath = payload?.tool_input?.file_path || '';

    const result = validateWrite(filePath);

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
