#!/bin/bash
# Validates delegation rules for Task tool calls
# Exit 0 = allow, Exit 2 = block (stderr shown to Claude)
#
# Enforces execution phase workflow:
#   implementing → awaiting_review → addressing_feedback → awaiting_approval
#   Max 3 cycles before human escalation

# Read JSON from stdin
INPUT=$(cat)
SUBAGENT=$(echo "$INPUT" | jq -r '.tool_input.subagent_type // ""')
PROMPT=$(echo "$INPUT" | jq -r '.tool_input.prompt // ""')

# Try to detect session directory from the prompt (looks for ticket ID pattern)
SESSION_DIR=""
if [[ "$PROMPT" =~ \.claude/loom/threads/([A-Za-z0-9]+-[A-Za-z0-9]+) ]]; then
  TICKET_ID="${BASH_REMATCH[1]}"
  # Search for the session directory
  for BASE in "." "$HOME"; do
    if [[ -d "$BASE/.claude/loom/threads/$TICKET_ID" ]]; then
      SESSION_DIR="$BASE/.claude/loom/threads/$TICKET_ID"
      break
    fi
  done
fi

# Helper: Read state field
read_state_field() {
  local FIELD="$1"
  if [[ -n "$SESSION_DIR" && -f "$SESSION_DIR/state.json" ]]; then
    jq -r ".$FIELD // empty" "$SESSION_DIR/state.json"
  fi
}

# Helper: Check if review file has APPROVED verdict
check_review_approved() {
  local REVIEW_FILE="$1"
  if [[ ! -f "$REVIEW_FILE" ]]; then
    return 1
  fi
  grep -qiE '^\*\*Verdict:\*\*.*APPROVED|^Verdict:.*APPROVED' "$REVIEW_FILE"
  return $?
}

# Validate known subagent types first
case "$SUBAGENT" in
  # Block delegation to lachesis - it's the coordinator, not a worker
  "loom:lachesis")
    echo "BLOCKED: Cannot delegate to loom:lachesis - lachesis is the coordinator, not a worker agent" >&2
    exit 2
    ;;

  # Claude Code built-in subagent types - always allow
  "Explore"|"Plan"|"Bash"|"general-purpose"|"statusline-setup"|"claude-code-guide")
    exit 0
    ;;

  # Other plugin agents (e.g., superpowers:code-reviewer) - allow through
  *:*)
    # For non-loom agents, skip loom-specific validation
    if [[ "$SUBAGENT" != loom:* ]]; then
      exit 0
    fi
    ;;

  "")
    # No subagent_type specified - let Task tool handle the error
    exit 0
    ;;
esac

# ============================================================
# Loom-specific validation for execution phase enforcement
# ============================================================

# If we can't find the session directory, allow the call but can't enforce state
if [[ -z "$SESSION_DIR" ]]; then
  exit 0
fi

# Read current state
PHASE=$(read_state_field "phase")
TASK_STATUS=$(read_state_field "task_status")
CYCLE_COUNT=$(read_state_field "cycle_count")

# If no state or not in execution phase, use basic validation
if [[ -z "$PHASE" || "$PHASE" != "execution" ]]; then
  # Still need review-tasks.md before entering execution (delegating to implementer)
  if [[ "$SUBAGENT" == "loom:implementer" ]]; then
    if [[ -n "$SESSION_DIR" ]] && ! check_review_approved "$SESSION_DIR/review-tasks.md"; then
      echo "BLOCKED: Cannot delegate to implementer before tasks.md is reviewed and APPROVED" >&2
      echo "Delegate to loom:code-reviewer to review tasks.md first." >&2
      exit 2
    fi
  fi
  exit 0
fi

# ============================================================
# Execution phase state machine enforcement
# ============================================================

case "$SUBAGENT" in
  "loom:implementer")
    # Can delegate to implementer when:
    # - task_status is null (starting new task)
    # - task_status is "addressing_feedback" (revision cycle)
    if [[ "$TASK_STATUS" == "awaiting_review" ]]; then
      echo "BLOCKED: Cannot delegate to implementer - task is awaiting code review" >&2
      echo "Delegate to loom:code-reviewer to review the implementation first." >&2
      exit 2
    fi
    if [[ "$TASK_STATUS" == "awaiting_approval" ]]; then
      echo "BLOCKED: Cannot delegate to implementer - task is awaiting human approval" >&2
      echo "Use /loom-approve to approve the task, or /loom-reject to reject with feedback." >&2
      exit 2
    fi
    ;;

  "loom:code-reviewer")
    # Can delegate to code-reviewer when:
    # - task_status is "implementing" (first review)
    # - task_status is "addressing_feedback" after implementer finishes
    # - Reviewing plans (not in execution task cycle)
    if [[ "$TASK_STATUS" == "awaiting_approval" ]]; then
      echo "BLOCKED: Cannot delegate to code-reviewer - task already reviewed, awaiting human approval" >&2
      echo "Use /loom-approve to approve the task, or /loom-reject to reject with feedback." >&2
      exit 2
    fi
    ;;

  "loom:planner")
    # Planner should not be called during execution phase (tasks are already defined)
    echo "BLOCKED: Cannot delegate to planner during execution phase" >&2
    echo "Tasks are already defined in tasks.md. Use loom:implementer to execute tasks." >&2
    exit 2
    ;;

  "loom:explorer")
    # Explorer is always allowed - it's a read-only reconnaissance agent
    exit 0
    ;;
esac

# Check cycle limit
if [[ -n "$CYCLE_COUNT" && "$CYCLE_COUNT" -ge 3 ]]; then
  echo "BLOCKED: Maximum revision cycles (3) reached for current task" >&2
  echo "Human intervention required. Use /loom-approve to accept as-is, /loom-reject with guidance, or /loom-skip to skip this task." >&2
  exit 2
fi

exit 0
