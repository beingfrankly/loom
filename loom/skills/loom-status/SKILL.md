---
name: loom-status
description: Display current loom workflow state. Shows phase, current task, cycle count, and progress.
user-invocable: true
---

# Loom Status

<loom-status-system>

<purpose>
Human command to display the current state of the loom workflow.
Provides a quick overview of where we are in the process using native task system.
</purpose>

<usage>
```
/loom-status
```
No arguments needed. Displays status of the active session and native tasks.
</usage>

<when-to-use>
- To check current workflow progress
- After resuming a session to understand where you left off
- When unsure what the next step should be
- To verify state after approve/reject/skip commands
</when-to-use>

<workflow>
<step order="1">Find active loom sessions in .claude/loom/threads/</step>
<step order="2">Use TaskList to get all native tasks and their status</step>
<step order="3">Check which artifacts exist in session directory</step>
<step order="4">Format and display comprehensive status</step>
<step order="5">Suggest next action based on current state</step>
</workflow>

<execution-steps>

<step name="find-sessions">
Look for loom sessions:
1. Check .claude/loom/threads/ directory
2. List all session directories
3. Find the most recently modified (by context.md modification time)
4. If no sessions found, report that and suggest starting one
</step>

<step name="get-tasks">
Use TaskList to get all tasks:
```
TaskList()
```

Count tasks by status:
- pending: Tasks not yet started
- in_progress: Tasks currently being worked on
- completed: Tasks finished successfully

Also check metadata for loom-specific info:
- cycle_count: Current revision cycles
- blocked: Whether task is blocked
</step>

<step name="check-artifacts">
Check which artifacts exist in session directory:
- context.md
- review-context.md (and its verdict)
- implementation-plan.md
- review-implementation.md (and its verdict)
- review-task-*.md files
</step>

<step name="format-output">
Display formatted status report.
</step>

<step name="suggest-next">
Based on current state, suggest the appropriate next action.
</step>

</execution-steps>

<output-format>
```
================================================================================
LOOM STATUS: {TICKET-ID}
================================================================================

Session: .claude/loom/threads/{ticket-id}/

--------------------------------------------------------------------------------
ARTIFACTS
--------------------------------------------------------------------------------
[{x or space}] context.md
[{x or space}] review-context.md          {verdict if exists}
[{x or space}] implementation-plan.md
[{x or space}] review-implementation.md             {verdict if exists}

--------------------------------------------------------------------------------
TASKS (Native)
--------------------------------------------------------------------------------
Total: {total} | Pending: {pending} | In Progress: {in_progress} | Complete: {complete}

{IF in execution with current task:}
Current Task: {task subject}
  - Delivers: {delivers_ac from metadata}
  - Cycle: {cycle_count}/{max_cycles}

--------------------------------------------------------------------------------
NEXT STEP
--------------------------------------------------------------------------------
{Suggested next action based on state}

================================================================================
```
</output-format>

<next-step-suggestions>

<suggestion condition="no context.md">
Create context.md by collaborating with the user on requirements.
Invoke the context-template skill first.
</suggestion>

<suggestion condition="context.md exists, no review">
Delegate to loom:code-reviewer to review context.md
</suggestion>

<suggestion condition="review exists, not approved">
Address feedback in review-context.md, then request re-review.
</suggestion>

<suggestion condition="no plan">
Delegate to loom:planner to create implementation-plan.md and native tasks
</suggestion>

<suggestion condition="plan exists, no review">
Delegate to loom:code-reviewer to review the implementation plan
</suggestion>

<suggestion condition="no tasks in_progress, pending tasks exist">
Use TaskList to find next pending task, delegate to loom:implementer
</suggestion>

<suggestion condition="task in_progress">
Wait for implementer to complete, or check on progress
</suggestion>

<suggestion condition="task needs review">
Delegate to loom:code-reviewer to review the task implementation
</suggestion>

<suggestion condition="task cycle >= 3">
Human intervention needed:
- /loom-approve : Accept current implementation
- /loom-reject "guidance" : Provide specific guidance
- /loom-skip "reason" : Skip and move to next task
</suggestion>

<suggestion condition="all tasks complete">
Delegate to loom:code-reviewer for final review against context.md
</suggestion>

</next-step-suggestions>

<no-session-output>
```
================================================================================
LOOM STATUS
================================================================================

No active loom sessions found.

To start a new session:
1. Mention a ticket ID (e.g., "Let's work on PROJ-123")
2. I'll create a session directory and we'll define context together

Session directory: .claude/loom/threads/{ticket-id}/
================================================================================
```
</no-session-output>

</loom-status-system>
