---
name: tasks-template
description: Template for creating tasks.md with status tracking. MUST invoke before writing tasks.
user-invocable: true
---

# Tasks Template

<tasks-template-system>

<purpose>
tasks.md breaks down the implementation plan into atomic, executable tasks.
Each task should be completable in 1-15 minutes by a single agent.
</purpose>

<preconditions>
<file must-exist="true">context.md</file>
<file must-exist="true">implementation-plan.md</file>
<action>Read both files to ensure tasks align with plan and cover all ACs</action>
</preconditions>

<validation-rules>
<rule>Every AC from context.md must map to at least one task</rule>
<rule>Tasks must be atomic - single responsibility</rule>
<rule>Tasks must specify which agent executes them</rule>
<rule>Dependencies between tasks must be explicit</rule>
<rule>Task IDs must be sequential: TASK-001, TASK-002, etc.</rule>
</validation-rules>

<checkbox-syntax>
<status symbol="[ ]" meaning="pending">Task not started</status>
<status symbol="[~]" meaning="in-progress">Currently being worked on</status>
<status symbol="[x]" meaning="complete">Task finished successfully</status>
<status symbol="[!]" meaning="blocked">Cannot proceed - needs resolution</status>
</checkbox-syntax>

<task-format>
```
- [ ] `TASK-001` [agent] Short description of the task
```
Where:
- Checkbox indicates status
- TASK-NNN is the unique identifier
- [agent] is implementer, explorer, etc.
- Description is concise but clear
</task-format>

<file-location>
.moirai/sessions/{ticket-id}/tasks.md
</file-location>

<template>
```markdown
# Tasks: {TICKET-ID}

**Ticket:** {TICKET-ID}
**Created:** {YYYY-MM-DDTHH:MM:SSZ}
**Phase:** Planning | Review | Execution | Complete
**Progress:** 0/{N} tasks complete
**Last Updated:** {YYYY-MM-DDTHH:MM:SSZ}

---

## AC Coverage

| AC | Tasks |
|----|-------|
| AC1: {criterion} | TASK-001, TASK-002 |
| AC2: {criterion} | TASK-003 |
| AC3: {criterion} | TASK-004, TASK-005 |

---

## Task Groups

### Group 1: {Phase/Feature Name}

**Objective:** {What this group achieves}
**Depends on:** None | Group N

- [ ] `TASK-001` [implementer] {Task description}
  - **Depends on:** None
  - **Delivers:** AC1
  - **Files:** `path/to/file.ts`
  - **Acceptance:** {Task-specific success criterion}

- [ ] `TASK-002` [implementer] {Task description}
  - **Depends on:** TASK-001
  - **Delivers:** AC1
  - **Files:** `path/to/file.ts`
  - **Acceptance:** {Task-specific success criterion}

### Group 2: {Phase/Feature Name}

**Objective:** {What this group achieves}
**Depends on:** Group 1

- [ ] `TASK-003` [implementer] {Task description}
  - **Delivers:** AC2
  - **Files:** `path/to/file.ts`
  - **Acceptance:** {Task-specific success criterion}

### Group 3: {Verification/Testing}

**Objective:** Verify implementation meets acceptance criteria
**Depends on:** Group 1, Group 2

- [ ] `TASK-004` [implementer] {Verification task}
  - **Delivers:** AC3
  - **Acceptance:** {Test passes, verification complete}

- [ ] `TASK-005` [implementer] {Final verification task}
  - **Depends on:** TASK-004
  - **Delivers:** AC3
  - **Acceptance:** {All acceptance criteria verified}

---

## Blocked Tasks

{None currently | List any blocked tasks with reasons}

---

## Notes

- {Task planning notes}
- {Execution order considerations}

---

## Session Log

| Timestamp | Event | Details |
|-----------|-------|---------|
| {YYYY-MM-DDTHH:MM:SSZ} | Session created | Initial planning |

{Orchestrator adds entries here as work progresses: task completions, blockers, decisions, etc.}
```
</template>

<updating-tasks>

<operation name="start-task">
1. Find the task line in tasks.md
2. Change `[ ]` to `[~]`
3. Update "Last Updated" timestamp
</operation>

<operation name="complete-task">
1. Find the task line in tasks.md
2. Change `[~]` to `[x]`
3. Increment the complete count in Progress line
4. Update "Last Updated" timestamp
</operation>

<operation name="block-task">
1. Find the task line in tasks.md
2. Change checkbox to `[!]`
3. Add task to "Blocked Tasks" section with reason
4. Update "Last Updated" timestamp
</operation>

<operation name="update-phase">
Update the Phase line when transitioning:
- "Planning" → After plan and tasks created
- "Review" → After delegating to code-reviewer
- "Execution" → After review APPROVED
- "Complete" → After all tasks done and final review passed
</operation>

<operation name="add-session-log-entry">
1. Add new row to Session Log table
2. Include timestamp, event type, and details
3. Event types: task-started, task-completed, task-blocked, review-result, decision, note
</operation>

<example name="updating-progress">
Before: **Progress:** 2/5 tasks complete
After:  **Progress:** 3/5 tasks complete
</example>

</updating-tasks>

<writing-guidelines>

<guideline name="Atomic Tasks">
Each task should do ONE thing. If you find yourself writing "and" in a task description, split it into two tasks.

Bad: "Create user model and add validation and write tests"
Good: Three separate tasks for model, validation, and tests
</guideline>

<guideline name="AC Coverage">
CRITICAL: Check the AC Coverage table. Every AC must have at least one task.
If an AC has no tasks, the implementation will be incomplete.
</guideline>

<guideline name="Dependencies">
Be explicit about what must complete before a task can start.
This helps the lachesis sequence work correctly.
</guideline>

<guideline name="Agent Assignment">
- [implementer] - For tasks that write/modify code
- [explorer] - For tasks that only gather information
- Most tasks will be [implementer]
</guideline>

<guideline name="Task Size">
Target 1-15 minutes per task. If a task seems larger:
- Split it into subtasks
- Consider if it's really multiple tasks disguised as one
</guideline>

</writing-guidelines>

<next-step>
After creating tasks.md, the lachesis should delegate to the code-reviewer agent to review the plan.
</next-step>

</tasks-template-system>
