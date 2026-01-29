---
name: approve
description: Human approves the current task after code review. Marks task complete, resets cycle count, moves to next task.
user-invocable: true
---

# Loom Approve

<loom-approve-system>

<purpose>
Human command to approve the current task after it has been reviewed by the code-reviewer.
This is the final checkpoint before marking a task complete and moving to the next one.
</purpose>

<when-to-use>
- After code-reviewer gives APPROVED verdict on a task
- When human is satisfied with the implementation quality
- To accept a task that reached max cycles as "good enough"
</when-to-use>

<workflow>
<step order="1">Use TaskList to find the current in_progress task</step>
<step order="2">Verify the task has been reviewed (review file exists)</step>
<step order="3">Use TaskUpdate to mark task as completed and reset cycle_count</step>
<step order="4">Find next pending task (if any)</step>
<step order="5">Report completion and next steps to user</step>
</workflow>

<execution-steps>

<step name="find-current-task">
Use TaskList to find the task that's currently in_progress:
```
TaskList()
```

Look for a task with status: in_progress
</step>

<step name="validate-state">
Verify approval is appropriate:
- A task is in_progress
- A review file exists for this task

If no task is in progress, inform the user.
</step>

<step name="update-task">
Use TaskUpdate to mark the task as completed:
```
TaskUpdate(
  taskId="{task_id}",
  status="completed",
  metadata={"cycle_count": 0}
)
```
</step>

<step name="find-next-task">
Use TaskList again to find the next pending task:
- Look for tasks with status: pending
- Check blockedBy is empty (no unfinished dependencies)
- If found, report the next task
- If no more tasks, announce completion
</step>

<step name="report">
Output to user:
- Confirmation that task was approved and marked complete
- Updated progress count
- Next task info OR completion announcement
</step>

</execution-steps>

<output-format>
```
Task "{task subject}" approved and marked complete.

Progress: {complete}/{total} tasks complete

{IF more tasks:}
Next task: {next task subject}
Delivers: {delivers_ac}

Ready to delegate to loom:implementer when you're ready.

{IF no more tasks:}
All tasks complete! Ready for final review.
Delegate to loom:code-reviewer for final verification against context.md.
```
</output-format>

<error-handling>
<error condition="no-task-in-progress">
No task is currently in progress. Use /loom:status to check current state.
</error>
<error condition="task-not-reviewed">
This task hasn't been reviewed yet. Delegate to loom:code-reviewer first.
</error>
</error-handling>

</loom-approve-system>
