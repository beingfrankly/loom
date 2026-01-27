#!/bin/bash
# Reads state.json and outputs specific fields or entire state
# Usage: read-state.sh <session-dir> [field]
# If field is omitted, outputs entire JSON
# Exit 0 = success, Exit 1 = error

SESSION_DIR="$1"
FIELD="$2"

if [[ -z "$SESSION_DIR" ]]; then
  echo "Usage: read-state.sh <session-dir> [field]" >&2
  exit 1
fi

STATE_FILE="$SESSION_DIR/state.json"

if [[ ! -f "$STATE_FILE" ]]; then
  echo "No state.json found at $STATE_FILE" >&2
  exit 1
fi

if [[ -z "$FIELD" ]]; then
  # Output entire state
  cat "$STATE_FILE"
else
  # Output specific field
  jq -r ".$FIELD // empty" "$STATE_FILE"
fi

exit 0
