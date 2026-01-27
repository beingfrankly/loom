#!/bin/bash
# PostToolUse hook for Task tool - updates state after subagent completion
# Exit 0 = success (output shown as guidance)
#
# Updates state.json based on which agent completed:
#   - implementer → task_status=awaiting_review
#   - code-reviewer → check verdict, update task_status accordingly

# Read JSON from stdin
INPUT=$(cat)
SUBAGENT=$(echo "$INPUT" | jq -r '.tool_input.subagent_type // ""')
PROMPT=$(echo "$INPUT" | jq -r '.tool_input.prompt // ""')
TOOL_RESULT=$(echo "$INPUT" | jq -r '.tool_result // ""')

# Only handle loom agents
case "$SUBAGENT" in
  "loom:implementer"|"loom:code-reviewer"|"loom:planner")
    ;;
  *)
    # Not a loom agent we track
    exit 0
    ;;
esac

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

# If we can't find session, just provide guidance without state update
if [[ -z "$SESSION_DIR" || ! -f "$SESSION_DIR/state.json" ]]; then
  case "$SUBAGENT" in
    "loom:implementer")
      echo "<post-task-guidance>"
      echo "Implementer completed. Next: Delegate to loom:code-reviewer for task review."
      echo "</post-task-guidance>"
      ;;
    "loom:code-reviewer")
      echo "<post-task-guidance>"
      echo "Code reviewer completed. Check the review verdict and proceed accordingly."
      echo "</post-task-guidance>"
      ;;
    "loom:planner")
      echo "<post-task-guidance>"
      echo "Planner completed. Next: Delegate to loom:code-reviewer to review the plan."
      echo "</post-task-guidance>"
      ;;
  esac
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Helper: Read state field
read_state_field() {
  local FIELD="$1"
  jq -r ".$FIELD // empty" "$SESSION_DIR/state.json"
}

# Helper: Check if text contains a verdict
extract_verdict() {
  local TEXT="$1"
  if echo "$TEXT" | grep -qiE 'APPROVED'; then
    echo "APPROVED"
  elif echo "$TEXT" | grep -qiE 'NEEDS_REVISION'; then
    echo "NEEDS_REVISION"
  elif echo "$TEXT" | grep -qiE 'REJECTED'; then
    echo "REJECTED"
  else
    echo ""
  fi
}

PHASE=$(read_state_field "phase")
CURRENT_TASK=$(read_state_field "current_task_id")
CYCLE_COUNT=$(read_state_field "cycle_count")

case "$SUBAGENT" in
  "loom:implementer")
    # Implementer finished - update state to awaiting_review
    "$SCRIPT_DIR/update-state.sh" "$SESSION_DIR" "task_status=awaiting_review" >/dev/null 2>&1

    echo "<post-task-guidance>"
    echo "Implementer completed task ${CURRENT_TASK:-'(unknown)'}."
    echo "State updated: task_status=awaiting_review"
    echo ""
    echo "REQUIRED NEXT STEP: Delegate to loom:code-reviewer to review this task implementation."
    echo "The code-reviewer will create review-task-{NNN}.md with their verdict."
    echo "</post-task-guidance>"
    ;;

  "loom:code-reviewer")
    # Check what the code-reviewer was reviewing based on context
    VERDICT=$(extract_verdict "$TOOL_RESULT")

    if [[ "$PHASE" == "execution" ]]; then
      # Task review during execution
      case "$VERDICT" in
        "APPROVED")
          "$SCRIPT_DIR/update-state.sh" "$SESSION_DIR" "task_status=awaiting_approval" >/dev/null 2>&1

          echo "<post-task-guidance>"
          echo "Code reviewer APPROVED task ${CURRENT_TASK:-'(unknown)'}."
          echo "State updated: task_status=awaiting_approval"
          echo ""
          echo "AWAITING HUMAN APPROVAL:"
          echo "- /loom-approve : Accept the implementation and move to next task"
          echo "- /loom-reject \"feedback\" : Reject with feedback for another revision cycle"
          echo "</post-task-guidance>"
          ;;

        "NEEDS_REVISION")
          NEW_CYCLE=$((${CYCLE_COUNT:-0} + 1))

          if [[ "$NEW_CYCLE" -ge 3 ]]; then
            "$SCRIPT_DIR/update-state.sh" "$SESSION_DIR" "task_status=blocked" "cycle_count=$NEW_CYCLE" >/dev/null 2>&1

            echo "<post-task-guidance>"
            echo "Code reviewer requested REVISION (cycle $NEW_CYCLE of 3)."
            echo "MAXIMUM CYCLES REACHED - Human intervention required."
            echo ""
            echo "State updated: task_status=blocked, cycle_count=$NEW_CYCLE"
            echo ""
            echo "OPTIONS:"
            echo "- /loom-approve : Accept current implementation as-is"
            echo "- /loom-reject \"specific guidance\" : Provide detailed guidance for final attempt"
            echo "- /loom-skip : Mark task as blocked and move to next task"
            echo "</post-task-guidance>"
          else
            "$SCRIPT_DIR/update-state.sh" "$SESSION_DIR" "task_status=addressing_feedback" "cycle_count=$NEW_CYCLE" >/dev/null 2>&1

            echo "<post-task-guidance>"
            echo "Code reviewer requested REVISION (cycle $NEW_CYCLE of 3)."
            echo "State updated: task_status=addressing_feedback, cycle_count=$NEW_CYCLE"
            echo ""
            echo "NEXT STEP: Delegate back to loom:implementer with the reviewer's feedback."
            echo "Include the specific issues from the review in your delegation prompt."
            echo "</post-task-guidance>"
          fi
          ;;

        "REJECTED")
          "$SCRIPT_DIR/update-state.sh" "$SESSION_DIR" "task_status=blocked" >/dev/null 2>&1

          echo "<post-task-guidance>"
          echo "Code reviewer REJECTED the implementation."
          echo "State updated: task_status=blocked"
          echo ""
          echo "This typically means the approach is fundamentally flawed."
          echo "Human intervention required to decide next steps."
          echo ""
          echo "OPTIONS:"
          echo "- /loom-skip : Mark task as blocked and move to next task"
          echo "- Revisit the task definition in tasks.md"
          echo "</post-task-guidance>"
          ;;

        *)
          echo "<post-task-guidance>"
          echo "Code reviewer completed but verdict unclear."
          echo "Check the review file for the verdict (APPROVED/NEEDS_REVISION/REJECTED)."
          echo "</post-task-guidance>"
          ;;
      esac
    else
      # Plan/context review (not in execution phase)
      case "$VERDICT" in
        "APPROVED")
          if [[ "$PHASE" == "context" ]]; then
            "$SCRIPT_DIR/update-state.sh" "$SESSION_DIR" "context_reviewed=true" "phase=planning" >/dev/null 2>&1
            echo "<post-task-guidance>"
            echo "Context review APPROVED. Moving to planning phase."
            echo "State updated: context_reviewed=true, phase=planning"
            echo ""
            echo "NEXT STEP: Delegate to loom:planner to create implementation-plan.md and tasks.md"
            echo "</post-task-guidance>"
          elif [[ "$PHASE" == "planning" ]]; then
            # Check if this is plan review or tasks review
            if echo "$PROMPT" | grep -qiE 'tasks\.md|task breakdown'; then
              "$SCRIPT_DIR/update-state.sh" "$SESSION_DIR" "tasks_reviewed=true" "phase=execution" "task_status=null" "cycle_count=0" >/dev/null 2>&1
              echo "<post-task-guidance>"
              echo "Tasks review APPROVED. Moving to execution phase."
              echo "State updated: tasks_reviewed=true, phase=execution"
              echo ""
              echo "NEXT STEP: Read tasks.md to find the first pending task, then delegate to loom:implementer"
              echo "</post-task-guidance>"
            else
              "$SCRIPT_DIR/update-state.sh" "$SESSION_DIR" "plan_reviewed=true" >/dev/null 2>&1
              echo "<post-task-guidance>"
              echo "Plan review APPROVED."
              echo "State updated: plan_reviewed=true"
              echo ""
              echo "NEXT STEP: Delegate to loom:code-reviewer to review tasks.md"
              echo "</post-task-guidance>"
            fi
          fi
          ;;

        "NEEDS_REVISION"|"REJECTED")
          echo "<post-task-guidance>"
          echo "Review verdict: $VERDICT"
          echo "Address the feedback from the review before proceeding."
          echo "</post-task-guidance>"
          ;;

        *)
          echo "<post-task-guidance>"
          echo "Code reviewer completed. Check the review file for the verdict."
          echo "</post-task-guidance>"
          ;;
      esac
    fi
    ;;

  "loom:planner")
    # Planner finished creating plan and tasks
    echo "<post-task-guidance>"
    echo "Planner completed. Plan and tasks should now exist."
    echo ""
    echo "NEXT STEP: Delegate to loom:code-reviewer to review the implementation plan."
    echo "The reviewer will validate:"
    echo "- Plan aligns with context.md acceptance criteria"
    echo "- Every AC has at least one task"
    echo "- Tasks are properly scoped and ordered"
    echo "</post-task-guidance>"
    ;;
esac

exit 0
