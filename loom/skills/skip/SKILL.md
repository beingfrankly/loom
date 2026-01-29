---
name: skip
description: Skip a blocked task and move to the next one. Marks task as blocked and records reason.
user-invocable: true
---

# Loom Skip

<loom-skip-system>

<purpose>
Human command to skip the current task when it cannot be completed.
Use as an escape hatch when a task is blocked, too complex, or no longer needed.
Marks the task as blocked and moves to the next pending task.
</purpose>

<usage>
```
/loom:skip "Reason for skipping"
/loom:skip Blocked by external dependency, will revisit later
/loom:skip
```
The reason argument is optional but recommended for audit trail.
</usage>

<when-to-use>
- Task is blocked by external dependency
- Task requirements are unclear and need more context
- Task is no longer needed (requirements changed)
- Maximum revision cycles reached and no resolution possible
- Task is too complex and needs to be split
</when-to-use>

<workflow>
<step order="1">Use TaskList to find the current in_progress task</step>
<step order="2">Parse skip reason from user command</step>
<step order="3">Use TaskUpdate to mark task as blocked with reason in metadata</step>
<step order="4">Find next pending task</step>
<step order="5">Report skip and next steps</step>
</workflow>

<execution-steps>

<step name="find-current-task">
Use TaskList to find the task that's currently in_progress:
```
TaskList()
```
</step>

<step name="parse-reason">
Extract skip reason from the user's command:
- If provided as argument: use that text
- If not provided: use "Skipped by user (no reason provided)"
</step>

<step name="validate-state">
Verify skip is appropriate:
- A task is in_progress (there's a task to skip)

If no active task, inform the user.
</step>

<step name="update-task">
Use TaskUpdate to mark task as blocked:
```
TaskUpdate(
  taskId="{task_id}",
  metadata={
    "blocked": true,
    "blocked_reason": "{reason}",
    "blocked_at": "{ISO timestamp}",
    "cycle_count": 0
  }
)
```

Note: We don't change status to "completed" - we leave it as is but mark blocked in metadata.
The task can be revisited later if needed.
</step>

<step name="find-next-task">
Use TaskList to find the next pending task:
- Look for tasks with status: pending
- Check blockedBy is empty (no unfinished dependencies)
- If found, report the next task
- If no more pending tasks, check what remains
</step>

<step name="report">
Output to user with status and next steps.
</step>

</execution-steps>

<output-format-has-next>
```
Task "{task subject}" skipped and marked as blocked.

Reason: "{reason}"

Progress: {complete}/{total} tasks complete ({blocked} blocked)

Next task: {next task subject}
Delivers: {delivers_ac}

Ready to delegate to loom:implementer when you're ready.
```
</output-format-has-next>

<output-format-no-more-tasks>
```
Task "{task subject}" skipped and marked as blocked.

Reason: "{reason}"

Progress: {complete}/{total} tasks complete ({blocked} blocked)

No more pending tasks.

{IF all complete or blocked:}
All processable tasks complete. {blocked} task(s) remain blocked.

Options:
1. Proceed to final review (delegate to loom:code-reviewer)
2. Revisit blocked tasks if dependencies are resolved
3. Update context.md if requirements have changed
```
</output-format-no-more-tasks>

<error-handling>
<error condition="no-task-in-progress">
No task is currently in progress to skip. Use /loom:status to check current state.
</error>
</error-handling>

</loom:skip-system>
