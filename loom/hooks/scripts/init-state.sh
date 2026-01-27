#!/bin/bash
# Initializes state.json for a new loom session
# Usage: init-state.sh <session-dir> <ticket-id>
# Exit 0 = success, Exit 1 = error

SESSION_DIR="$1"
TICKET_ID="$2"

if [[ -z "$SESSION_DIR" || -z "$TICKET_ID" ]]; then
  echo "Usage: init-state.sh <session-dir> <ticket-id>" >&2
  exit 1
fi

STATE_FILE="$SESSION_DIR/state.json"

# Don't overwrite existing state
if [[ -f "$STATE_FILE" ]]; then
  echo "State file already exists at $STATE_FILE" >&2
  exit 0
fi

# Ensure directory exists
mkdir -p "$SESSION_DIR"

# Create initial state
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat > "$STATE_FILE" << EOF
{
  "ticket": "$TICKET_ID",
  "phase": "context",
  "context_reviewed": false,
  "plan_reviewed": false,
  "tasks_reviewed": false,
  "current_task_id": null,
  "task_status": null,
  "cycle_count": 0,
  "started_at": "$TIMESTAMP",
  "last_updated": "$TIMESTAMP"
}
EOF

echo "Initialized state.json for $TICKET_ID"
exit 0
