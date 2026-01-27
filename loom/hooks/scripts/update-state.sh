#!/bin/bash
# Updates state.json fields atomically
# Usage: update-state.sh <session-dir> <field>=<value> [<field>=<value> ...]
# Example: update-state.sh ./session phase=execution current_task_id=1 cycle_count=0
# Exit 0 = success, Exit 1 = error

SESSION_DIR="$1"
shift

if [[ -z "$SESSION_DIR" ]]; then
  echo "Usage: update-state.sh <session-dir> <field>=<value> [...]" >&2
  exit 1
fi

STATE_FILE="$SESSION_DIR/state.json"

if [[ ! -f "$STATE_FILE" ]]; then
  echo "No state.json found at $STATE_FILE" >&2
  exit 1
fi

# Build jq filter from arguments
JQ_FILTER="."
for arg in "$@"; do
  FIELD="${arg%%=*}"
  VALUE="${arg#*=}"

  # Handle different value types
  if [[ "$VALUE" == "true" || "$VALUE" == "false" ]]; then
    JQ_FILTER="$JQ_FILTER | .$FIELD = $VALUE"
  elif [[ "$VALUE" == "null" ]]; then
    JQ_FILTER="$JQ_FILTER | .$FIELD = null"
  elif [[ "$VALUE" =~ ^[0-9]+$ ]]; then
    JQ_FILTER="$JQ_FILTER | .$FIELD = $VALUE"
  else
    JQ_FILTER="$JQ_FILTER | .$FIELD = \"$VALUE\""
  fi
done

# Always update last_updated timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
JQ_FILTER="$JQ_FILTER | .last_updated = \"$TIMESTAMP\""

# Apply updates atomically using temp file
TEMP_FILE=$(mktemp)
if jq "$JQ_FILTER" "$STATE_FILE" > "$TEMP_FILE"; then
  mv "$TEMP_FILE" "$STATE_FILE"
  echo "State updated successfully"
  exit 0
else
  rm -f "$TEMP_FILE"
  echo "Failed to update state" >&2
  exit 1
fi
