---
name: loom-skip
description: Skip a blocked task and move to the next one. Marks task as blocked [!] and records reason.
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
/loom-skip "Reason for skipping"
/loom-skip Blocked by external dependency, will revisit later
/loom-skip
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
<step order="1">Detect the active loom session</step>
<step order="2">Read state.json to get current task info</step>
<step order="3">Verify we're in execution phase with an active task</step>
<step order="4">Update tasks.md: change task checkbox to [!] (blocked)</step>
<step order="5">Add skip reason to Blocked Tasks section in tasks.md</step>
<step order="6">Update state.json: clear current task, reset cycle_count</step>
<step order="7">Find next pending task</step>
<step order="8">Report skip and next steps</step>
</workflow>

<execution-steps>

<step name="detect-session">
Look for the active loom session:
1. Check .claude/loom/threads/ for session directories
2. Find the most recently modified session (by state.json timestamp)
3. Read state.json to confirm we're in execution phase
</step>

<step name="parse-reason">
Extract skip reason from the user's command:
- If provided as argument: use that text
- If not provided: use "Skipped by user (no reason provided)"
</step>

<step name="validate-state">
Verify skip is appropriate:
- phase should be "execution"
- current_task_id should be set (there's a task to skip)

If no active task, inform the user.
</step>

<step name="update-tasks-md">
In tasks.md:
1. Find the current task by its ID
2. Change its checkbox from [~] or [ ] to [!] (blocked)
3. Add entry to the Blocked Tasks section:

```markdown
## Blocked Tasks

| Task | Blocked Date | Reason |
|------|--------------|--------|
| {TASK-ID} | {YYYY-MM-DD} | {reason} |
```

4. Update Last Updated timestamp
5. Note: Do NOT update Progress count (blocked tasks don't count as complete)
</step>

<step name="update-state">
Update state.json:
```bash
./hooks/scripts/update-state.sh "$SESSION_DIR" \
  "cycle_count=0" \
  "task_status=null" \
  "current_task_id=null"
```
</step>

<step name="find-next-task">
Read tasks.md to find the next pending task:
- Look for checkboxes with [ ] (pending status)
- Skip any [!] (blocked) tasks
- If found, report the next task ID and description
- If no more pending tasks, check if all tasks are either [x] or [!]
</step>

<step name="record-session-log">
Add entry to Session Log:
```markdown
| {ISO timestamp} | Task Skipped | {TASK-ID}: {reason} |
```
</step>

<step name="report">
Output to user with status and next steps.
</step>

</execution-steps>

<output-format-has-next>
```
Task {TASK-ID} skipped and marked as blocked.

Reason: "{reason}"

Progress: {N}/{M} tasks complete ({B} blocked)

Next task: {NEXT-TASK-ID}
Description: {task description}

Ready to delegate to loom:implementer when you're ready.
```
</output-format-has-next>

<output-format-no-more-tasks>
```
Task {TASK-ID} skipped and marked as blocked.

Reason: "{reason}"

Progress: {N}/{M} tasks complete ({B} blocked)

No more pending tasks.

{IF all complete or blocked:}
All processable tasks complete. {B} task(s) remain blocked.

Blocked tasks:
- {TASK-ID}: {reason}

Options:
1. Proceed to final review (delegate to loom:code-reviewer)
2. Revisit blocked tasks if dependencies are resolved
3. Update context.md if requirements have changed
```
</output-format-no-more-tasks>

<blocked-tasks-section>
If the Blocked Tasks section doesn't exist in tasks.md, create it:

```markdown
---

## Blocked Tasks

| Task | Blocked Date | Reason |
|------|--------------|--------|
| {TASK-ID} | {YYYY-MM-DD} | {reason} |
```

Place this section after the main task list and before the Session Log.
</blocked-tasks-section>

<error-handling>
<error condition="no-active-session">
No active loom session found. Start a session by mentioning a ticket ID.
</error>
<error condition="not-in-execution">
Cannot skip - not in execution phase. Current phase: {phase}
</error>
<error condition="no-active-task">
No task is currently active to skip. Use this command during task execution.
</error>
</error-handling>

</loom-skip-system>
