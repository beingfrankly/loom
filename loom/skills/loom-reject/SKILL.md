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
</when-to-use>

<cycle-limit-awareness>
This command increments cycle_count in task metadata. After 3 cycles, the task becomes blocked.
If already at cycle 3, this command will:
1. Still record the feedback
2. Mark the task as blocked (via metadata)
3. Suggest using /loom-skip or providing more specific guidance
</cycle-limit-awareness>

<workflow>
<step order="1">Use TaskList to find the current in_progress task</step>
<step order="2">Use TaskGet to get full task details including cycle_count</step>
<step order="3">Verify task is in a reviewable state</step>
<step order="4">Increment cycle_count in metadata via TaskUpdate</step>
<step order="5">Check if cycle limit reached</step>
<step order="6">Report status and next steps</step>
</workflow>

<execution-steps>

<step name="find-current-task">
Use TaskList to find the task that's currently in_progress:
```
TaskList()
```
</step>

<step name="get-task-details">
Use TaskGet to get the full task including metadata:
```
TaskGet(taskId="{task_id}")
```

Extract current cycle_count from metadata.
</step>

<step name="parse-feedback">
Extract feedback from the user's command:
- If provided as argument: use that text
- If not provided: prompt user for feedback or note "No specific feedback provided"
</step>

<step name="validate-state">
Verify rejection is appropriate:
- A task is in_progress
- Task has been through at least one implementation attempt

If not in the right state, inform the user.
</step>

<step name="update-task">
Calculate new cycle count and update task metadata:
```
new_cycle = current_cycle_count + 1

TaskUpdate(
  taskId="{task_id}",
  metadata={
    "cycle_count": new_cycle,
    "last_feedback": "{feedback text}"
  }
)
```
</step>

<step name="check-cycle-limit">
If cycle_count >= 3:
- Add blocked: true to metadata
- Inform user that max cycles reached
```
TaskUpdate(
  taskId="{task_id}",
  metadata={"blocked": true, "blocked_reason": "Max revision cycles reached"}
)
```
</step>

<step name="report">
Output to user based on cycle status.
</step>

</execution-steps>

<output-format-normal>
```
Task "{task subject}" rejected. Cycle {N}/3

Feedback recorded: "{feedback}"

Next step: Delegate to loom:implementer with the following context:
- Review the human feedback above
- Address the specific concerns raised
- Previous review feedback from review-task-{NNN}.md

After implementer completes, delegate to loom:code-reviewer for re-review.
```
</output-format-normal>

<output-format-max-cycles>
```
Task "{task subject}" rejected. Maximum cycles (3) reached.

Feedback recorded: "{feedback}"

Status: BLOCKED - Human intervention required

Options:
1. /loom-approve - Accept the current implementation as "good enough"
2. /loom-skip - Skip this task and mark it blocked, move to next task
3. Provide very specific guidance and manually reset cycle count
4. Simplify or split the task

The task has gone through 3 revision cycles without resolution.
This typically indicates the requirements need clarification or the task is too complex.
```
</output-format-max-cycles>

<error-handling>
<error condition="no-task-in-progress">
No task is currently in progress. Use /loom-status to check current state.
</error>
</error-handling>

</loom-reject-system>
