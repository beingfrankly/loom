#!/bin/bash
# Validates artifact preconditions for moirai session files
# Exit 0 = allow, Exit 2 = block (stderr shown to Claude)

# Read JSON from stdin
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

# Only validate moirai artifacts
if [[ "$FILE_PATH" != *".moirai/sessions/"* ]]; then
  exit 0
fi

SESSION_DIR=$(dirname "$FILE_PATH")
FILENAME=$(basename "$FILE_PATH")

case "$FILENAME" in
  "context.md")
    # No preconditions - first artifact
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
    ;;
  review-*.md)
    if [[ ! -f "$SESSION_DIR/implementation-plan.md" ]]; then
      echo "BLOCKED: implementation-plan.md must exist before creating reviews" >&2
      echo "The planning phase must complete before reviews can begin." >&2
      exit 2
    fi
    ;;
esac

exit 0
