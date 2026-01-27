#!/bin/bash
# Validates artifact preconditions for loom session files
# Exit 0 = allow, Exit 2 = block (stderr shown to Claude)
#
# Enforces review-gated phase progression:
#   context.md → review-context.md → implementation-plan.md → review-plan.md → tasks.md → review-tasks.md → execution

# Read JSON from stdin
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

# Only validate loom artifacts
if [[ "$FILE_PATH" != *".claude/loom/threads/"* ]]; then
  exit 0
fi

SESSION_DIR=$(dirname "$FILE_PATH")
FILENAME=$(basename "$FILE_PATH")

# Helper: Check if a review file exists and contains APPROVED
check_review_approved() {
  local REVIEW_FILE="$1"
  if [[ ! -f "$REVIEW_FILE" ]]; then
    return 1
  fi
  # Check for APPROVED verdict (case-insensitive, allowing for markdown formatting)
  grep -qiE '^\*\*Verdict:\*\*.*APPROVED|^Verdict:.*APPROVED' "$REVIEW_FILE"
  return $?
}

case "$FILENAME" in
  "context.md")
    # No preconditions - first artifact
    # Initialize state.json if it doesn't exist
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    TICKET_ID=$(basename "$SESSION_DIR")
    if [[ ! -f "$SESSION_DIR/state.json" ]]; then
      "$SCRIPT_DIR/init-state.sh" "$SESSION_DIR" "$TICKET_ID" >/dev/null 2>&1
    fi
    exit 0
    ;;

  "research.md")
    if [[ ! -f "$SESSION_DIR/context.md" ]]; then
      echo "BLOCKED: context.md must exist before creating research.md" >&2
      echo "Create context.md first by invoking the context-template skill." >&2
      exit 2
    fi
    ;;

  "implementation-plan.md")
    if [[ ! -f "$SESSION_DIR/context.md" ]]; then
      echo "BLOCKED: context.md must exist before creating implementation-plan.md" >&2
      echo "Create context.md first by invoking the context-template skill and collaborating with the user." >&2
      exit 2
    fi
    # REVIEW GATE: context.md must be reviewed and APPROVED
    if ! check_review_approved "$SESSION_DIR/review-context.md"; then
      echo "BLOCKED: context.md must be reviewed and APPROVED before creating implementation-plan.md" >&2
      echo "Delegate to loom:code-reviewer to review context.md first." >&2
      exit 2
    fi
    ;;

  "tasks.md")
    if [[ ! -f "$SESSION_DIR/context.md" ]]; then
      echo "BLOCKED: context.md must exist before creating tasks.md" >&2
      exit 2
    fi
    if [[ ! -f "$SESSION_DIR/implementation-plan.md" ]]; then
      echo "BLOCKED: implementation-plan.md must exist before creating tasks.md" >&2
      echo "Create implementation-plan.md first by invoking the plan-template skill." >&2
      exit 2
    fi
    # REVIEW GATE: implementation-plan.md must be reviewed and approved
    if ! check_review_approved "$SESSION_DIR/review-plan.md"; then
      echo "BLOCKED: implementation-plan.md must be reviewed and APPROVED before creating tasks.md" >&2
      echo "Delegate to loom:code-reviewer to review implementation-plan.md first." >&2
      exit 2
    fi
    ;;

  "review-context.md")
    # Can only create if context.md exists
    if [[ ! -f "$SESSION_DIR/context.md" ]]; then
      echo "BLOCKED: context.md must exist before reviewing it" >&2
      exit 2
    fi
    ;;

  "review-plan.md")
    # Can only create if implementation-plan.md exists
    if [[ ! -f "$SESSION_DIR/implementation-plan.md" ]]; then
      echo "BLOCKED: implementation-plan.md must exist before reviewing it" >&2
      exit 2
    fi
    ;;

  "review-tasks.md")
    # Can only create if tasks.md exists
    if [[ ! -f "$SESSION_DIR/tasks.md" ]]; then
      echo "BLOCKED: tasks.md must exist before reviewing it" >&2
      exit 2
    fi
    ;;

  review-task-*.md)
    # Task reviews require tasks.md to be reviewed (execution phase gate)
    if ! check_review_approved "$SESSION_DIR/review-tasks.md"; then
      echo "BLOCKED: tasks.md must be reviewed and APPROVED before entering execution phase" >&2
      echo "Delegate to loom:code-reviewer to review tasks.md first." >&2
      exit 2
    fi
    ;;

  review-*.md)
    # Generic review files (like review-implementation.md for backward compatibility)
    if [[ ! -f "$SESSION_DIR/implementation-plan.md" ]]; then
      echo "BLOCKED: implementation-plan.md must exist before creating reviews" >&2
      echo "The planning phase must complete before reviews can begin." >&2
      exit 2
    fi
    ;;
esac

exit 0
