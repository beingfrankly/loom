---
name: loom-reject
description: Human rejects current task with feedback. Increments cycle count, sets status to addressing_feedback for another revision.
user-invocable: true
---

# Loom Reject

<loom-reject-system>

<purpose>
Human command to reject the current task and request another revision cycle.
Use when the implementation doesn't meet requirements, even after code-reviewer approval.
Provides a way for humans to inject specific feedback into the revision cycle.
</purpose>

<usage>
```
/loom-reject "Your specific feedback here"
/loom-reject The error handling needs to cover edge case X
```
The feedback argument is optional but highly recommended - it guides the next revision.
</usage>

<when-to-use>
- After code-reviewer gives APPROVED but human disagrees
- When human spots issues the code-reviewer missed
- To provide specific guidance for the next revision cycle
- When task_status is "awaiting_approval" in state.json
</when-to-use>

<cycle-limit-awareness>
This command increments cycle_count. After 3 cycles, the task becomes blocked.
If already at cycle 3, this command will:
1. Still record the feedback
2. Mark the task as blocked
3. Suggest using /loom-skip or providing more specific guidance
</cycle-limit-awareness>

<workflow>
<step order="1">Detect the active loom session</step>
<step order="2">Read state.json to get current task and cycle info</step>
<step order="3">Verify task_status allows rejection</step>
<step order="4">Increment cycle_count</step>
<step order="5">Update state.json: task_status=addressing_feedback</step>
<step order="6">Record feedback in Session Log of tasks.md</step>
<step order="7">Check if cycle limit reached</step>
<step order="8">Report status and next steps</step>
</workflow>

<execution-steps>

<step name="detect-session">
Look for the active loom session:
1. Check .claude/loom/threads/ for session directories
2. Find the most recently modified session (by state.json timestamp)
3. Read state.json to confirm we're in execution phase
</step>

<step name="parse-feedback">
Extract feedback from the user's command:
- If provided as argument: use that text
- If not provided: prompt user for feedback or note "No specific feedback provided"
</step>

<step name="validate-state">
Verify rejection is appropriate:
- phase should be "execution"
- task_status should be "awaiting_approval" or "awaiting_review"
- current_task_id should be set

If not in the right state, inform the user what state we're actually in.
</step>

<step name="update-state">
Calculate new cycle count and update state.json:
```bash
NEW_CYCLE=$((current_cycle + 1))
./hooks/scripts/update-state.sh "$SESSION_DIR" \
  "cycle_count=$NEW_CYCLE" \
  "task_status=addressing_feedback"
```
</step>

<step name="record-feedback">
Add entry to Session Log in tasks.md:
```markdown
### Session Log

| Timestamp | Event | Details |
|-----------|-------|---------|
| {ISO timestamp} | Human Rejection (Cycle {N}) | {feedback text} |
```
</step>

<step name="check-cycle-limit">
If cycle_count >= 3:
- Update task_status to "blocked"
- Mark task as [!] in tasks.md
- Inform user that max cycles reached
</step>

<step name="report">
Output to user based on cycle status.
</step>

</execution-steps>

<output-format-normal>
```
Task {TASK-ID} rejected. Cycle {N}/3

Feedback recorded: "{feedback}"

Status: addressing_feedback
Next step: Delegate to loom:implementer with the following context:
- Review the human feedback above
- Address the specific concerns raised
- Previous review feedback from review-task-{NNN}.md

After implementer completes, delegate to loom:code-reviewer for re-review.
```
</output-format-normal>

<output-format-max-cycles>
```
Task {TASK-ID} rejected. Maximum cycles (3) reached.

Feedback recorded: "{feedback}"

Status: BLOCKED - Human intervention required

Options:
1. /loom-approve - Accept the current implementation as "good enough"
2. /loom-skip - Skip this task and mark it blocked, move to next task
3. Provide very specific guidance and manually reset cycle count
4. Simplify or split the task in tasks.md

The task has gone through 3 revision cycles without resolution.
This typically indicates the requirements need clarification or the task is too complex.
```
</output-format-max-cycles>

<error-handling>
<error condition="no-active-session">
No active loom session found. Start a session by mentioning a ticket ID.
</error>
<error condition="not-in-execution">
Cannot reject - not in execution phase. Current phase: {phase}
</error>
<error condition="no-task-in-progress">
No task is currently in progress to reject. Current task_status: {status}
</error>
</error-handling>

</loom-reject-system>
