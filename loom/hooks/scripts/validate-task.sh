#!/bin/bash
# Validates delegation rules for Task tool calls
# Exit 0 = allow, Exit 2 = block (stderr shown to Claude)

# Read JSON from stdin
INPUT=$(cat)
SUBAGENT=$(echo "$INPUT" | jq -r '.tool_input.subagent_type // ""')

# Validate known subagent types
case "$SUBAGENT" in
  # Loom plugin agents (namespaced with loom: prefix)
  "loom:planner"|"loom:code-reviewer"|"loom:implementer"|"loom:explorer")
    exit 0
    ;;
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
    exit 0
    ;;
  "")
    # No subagent_type specified - let Task tool handle the error
    exit 0
    ;;
  *)
    # Allow unknown types - let Claude Code's Task tool validate them
    # This prevents blocking new built-in types we don't know about
    exit 0
    ;;
esac
