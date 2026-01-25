#!/bin/bash
# Validates delegation rules for Task tool calls
# Exit 0 = allow, Exit 2 = block (stderr shown to Claude)

# Read JSON from stdin
INPUT=$(cat)
SUBAGENT=$(echo "$INPUT" | jq -r '.tool_input.subagent_type // ""')

# Validate known subagent types
case "$SUBAGENT" in
  "planner"|"code-reviewer"|"implementer"|"explorer")
    exit 0
    ;;
  "lachesis")
    echo "BLOCKED: Cannot delegate to lachesis - lachesis is the coordinator, not a worker agent" >&2
    exit 2
    ;;
  "")
    # No subagent_type specified - let Task tool handle the error
    exit 0
    ;;
  *)
    echo "BLOCKED: Unknown subagent type: $SUBAGENT" >&2
    echo "Valid moirai agents are: planner, code-reviewer, implementer, explorer" >&2
    exit 2
    ;;
esac
