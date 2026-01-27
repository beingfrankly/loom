---
name: loom-approve
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
- When task_status is "awaiting_approval" in state.json
- When human is satisfied with the implementation quality
</when-to-use>

<workflow>
<step order="1">Detect the active loom session</step>
<step order="2">Read state.json to get current task info</step>
<step order="3">Verify task_status is "awaiting_approval" or task was recently reviewed</step>
<step order="4">Update tasks.md: change task checkbox from [~] to [x]</step>
<step order="5">Update state.json: reset cycle_count to 0, clear task_status</step>
<step order="6">Update Progress line in tasks.md</step>
<step order="7">Find next pending task (if any)</step>
<step order="8">Report completion and next steps to user</step>
</workflow>

<execution-steps>

<step name="detect-session">
Look for the active loom session:
1. Check .claude/loom/threads/ for session directories
2. Find the most recently modified session (by state.json timestamp)
3. Read state.json to confirm we're in execution phase
</step>

<step name="validate-state">
Verify approval is appropriate:
- phase should be "execution"
- task_status should be "awaiting_approval" (or recently reviewed task exists)
- current_task_id should be set

If not in the right state, inform the user what state we're actually in.
</step>

<step name="update-tasks-md">
In tasks.md:
1. Find the current task by its ID (from state.json current_task_id)
2. Change its checkbox from [~] (in-progress) to [x] (complete)
3. Update the Progress line: **Progress:** N/M tasks complete
4. Update the Last Updated timestamp
</step>

<step name="update-state">
Update state.json using the update-state.sh script:
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
- If no more tasks, announce completion of all tasks
</step>

<step name="report">
Output to user:
- Confirmation that task {ID} was approved and marked complete
- Updated progress (N/M tasks complete)
- Next task info OR completion announcement
</step>

</execution-steps>

<output-format>
```
Task {TASK-ID} approved and marked complete.

Progress: {N}/{M} tasks complete

{IF more tasks:}
Next task: {NEXT-TASK-ID}
Description: {task description}

Ready to delegate to loom:implementer when you're ready.

{IF no more tasks:}
All tasks complete! Ready for final review.
Delegate to loom:code-reviewer for final verification against context.md.
```
</output-format>

<error-handling>
<error condition="no-active-session">
No active loom session found. Start a session by mentioning a ticket ID.
</error>
<error condition="not-in-execution">
Cannot approve - not in execution phase. Current phase: {phase}
</error>
<error condition="no-task-awaiting-approval">
No task is currently awaiting approval. Current task_status: {status}
</error>
</error-handling>

</loom-approve-system>
