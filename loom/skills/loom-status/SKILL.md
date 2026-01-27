---
name: loom-status
description: Display current loom workflow state. Shows phase, current task, cycle count, and progress.
user-invocable: true
---

# Loom Status

<loom-status-system>

<purpose>
Human command to display the current state of the loom workflow.
Provides a quick overview of where we are in the process without needing to read multiple files.
</purpose>

<usage>
```
/loom-status
```
No arguments needed. Displays status of the most recent active session.
</usage>

<when-to-use>
- To check current workflow progress
- After resuming a session to understand where you left off
- When unsure what the next step should be
- To verify state after approve/reject/skip commands
</when-to-use>

<workflow>
<step order="1">Find active loom sessions</step>
<step order="2">Read state.json from most recent session</step>
<step order="3">Read tasks.md to get progress counts</step>
<step order="4">Format and display comprehensive status</step>
<step order="5">Suggest next action based on current state</step>
</workflow>

<execution-steps>

<step name="find-sessions">
Look for loom sessions:
1. Check .claude/loom/threads/ directory
2. List all session directories
3. Find the most recently modified (by state.json last_updated)
4. If no sessions found, report that and suggest starting one
</step>

<step name="read-state">
From state.json, extract:
- ticket: The ticket ID
- phase: context | planning | execution | complete
- context_reviewed: boolean
- plan_reviewed: boolean
- tasks_reviewed: boolean
- current_task_id: current task being worked (or null)
- task_status: null | implementing | awaiting_review | addressing_feedback | awaiting_approval | blocked
- cycle_count: number of revision cycles for current task
- started_at: session start timestamp
- last_updated: last activity timestamp
</step>

<step name="read-tasks">
From tasks.md, count:
- Total tasks (lines matching checkbox pattern)
- Pending tasks [ ]
- In-progress tasks [~]
- Complete tasks [x]
- Blocked tasks [!]
</step>

<step name="check-artifacts">
Check which artifacts exist:
- context.md
- review-context.md (and its verdict)
- implementation-plan.md
- review-plan.md (and its verdict)
- tasks.md
- review-tasks.md (and its verdict)
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

Phase: {PHASE}
Started: {started_at}
Last Activity: {last_updated}

--------------------------------------------------------------------------------
ARTIFACTS
--------------------------------------------------------------------------------
[{x or space}] context.md
[{x or space}] review-context.md          {verdict if exists}
[{x or space}] implementation-plan.md
[{x or space}] review-plan.md             {verdict if exists}
[{x or space}] tasks.md
[{x or space}] review-tasks.md            {verdict if exists}

--------------------------------------------------------------------------------
PROGRESS
--------------------------------------------------------------------------------
Tasks: {complete}/{total} complete ({pending} pending, {blocked} blocked)

{IF in execution phase with current task:}
Current Task: {current_task_id}
Task Status: {task_status}
Revision Cycle: {cycle_count}/3

--------------------------------------------------------------------------------
NEXT STEP
--------------------------------------------------------------------------------
{Suggested next action based on state}

================================================================================
```
</output-format>

<next-step-suggestions>

<suggestion phase="context" condition="no context.md">
Create context.md by collaborating with the user on requirements.
Invoke the context-template skill first.
</suggestion>

<suggestion phase="context" condition="context.md exists, no review">
Delegate to loom:code-reviewer to review context.md
</suggestion>

<suggestion phase="context" condition="review exists, not approved">
Address feedback in review-context.md, then request re-review.
</suggestion>

<suggestion phase="planning" condition="no plan">
Delegate to loom:planner to create implementation-plan.md and tasks.md
</suggestion>

<suggestion phase="planning" condition="plan exists, no review">
Delegate to loom:code-reviewer to review the implementation plan
</suggestion>

<suggestion phase="planning" condition="plan reviewed, tasks not reviewed">
Delegate to loom:code-reviewer to review tasks.md
</suggestion>

<suggestion phase="execution" task_status="null">
Read tasks.md, find next pending task, delegate to loom:implementer
</suggestion>

<suggestion phase="execution" task_status="implementing">
Wait for implementer to complete, or check on progress
</suggestion>

<suggestion phase="execution" task_status="awaiting_review">
Delegate to loom:code-reviewer to review the task implementation
</suggestion>

<suggestion phase="execution" task_status="addressing_feedback">
Delegate to loom:implementer with reviewer feedback
</suggestion>

<suggestion phase="execution" task_status="awaiting_approval">
Human decision needed:
- /loom-approve : Accept and move to next task
- /loom-reject "feedback" : Request another revision
</suggestion>

<suggestion phase="execution" task_status="blocked">
Human intervention needed:
- /loom-approve : Accept current state
- /loom-reject "guidance" : Provide specific guidance
- /loom-skip "reason" : Skip and move to next task
</suggestion>

<suggestion phase="execution" condition="all tasks complete">
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

<multiple-sessions-output>
If multiple sessions exist, list them with last activity:

```
================================================================================
LOOM SESSIONS
================================================================================

Found {N} sessions:

| Ticket | Phase | Progress | Last Activity |
|--------|-------|----------|---------------|
| {ID-1} | execution | 3/5 tasks | 2 hours ago |
| {ID-2} | planning | - | 1 day ago |

Showing status for most recent: {ID-1}

{... full status for most recent ...}
================================================================================
```
</multiple-sessions-output>

</loom-status-system>
