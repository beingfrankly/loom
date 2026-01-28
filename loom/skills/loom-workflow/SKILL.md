---
name: loom-workflow
description: Master workflow for multi-agent orchestration. Invoke at session start or when coordinating agents.
user-invocable: true
---

# Loom Workflow

<loom-system>

<overview>
Loom coordinates specialized AI agents through a structured workflow to deliver complex features.
Named after the Moirai (the three Fates of Greek mythology), the plugin orchestrates the thread of development through Lachesis's measured direction.
</overview>

<agents>
<agent name="lachesis" model="opus" color="purple">
<role>Coordinator - decides WHAT and WHO, never implements</role>
<delegates-to>planner, code-reviewer, implementer, explorer</delegates-to>
</agent>
<agent name="planner" model="sonnet" color="blue">
<role>Architect - creates implementation plans and native tasks</role>
<creates>implementation-plan.md, native tasks via TaskCreate</creates>
</agent>
<agent name="code-reviewer" model="sonnet" color="orange">
<role>Reviewer - validates plans and implementations against context</role>
<creates>review-implementation.md, review-task-*.md</creates>
</agent>
<agent name="implementer" model="sonnet" color="green">
<role>Developer - executes individual tasks, writes code</role>
<creates>Code changes</creates>
</agent>
<agent name="explorer" model="haiku" color="cyan">
<role>Scout - fast codebase reconnaissance</role>
<creates>Information for other agents</creates>
</agent>
</agents>

<golden-rules priority="critical">
<rule id="1">NEVER write an artifact without first invoking its template skill</rule>
<rule id="2">NEVER create implementation-plan.md unless context.md exists</rule>
<rule id="3">NEVER execute tasks unless review-implementation.md shows APPROVED</rule>
<rule id="4">Lachesis NEVER implements code directly - always delegate to implementer</rule>
<rule id="5">Every acceptance criterion must map to at least one task</rule>
<rule id="6">AUTO-PROCEED on APPROVED verdicts - no confirmation needed for happy path</rule>
<rule id="7">Use native tasks (TaskCreate/TaskList/TaskUpdate) for all task management</rule>
</golden-rules>

<workflow-phases>

<phase id="1" name="Context Definition">
<owner>lachesis + human</owner>
<trigger>User mentions a ticket ID (e.g., II-5092, PROJ-123)</trigger>
<preconditions>none</preconditions>

<steps>
<step order="1">Invoke the context-template skill</step>
<step order="2">Create session directory: .claude/loom/threads/{ticket-id}/</step>
<step order="3">Collaborate with human to define:
  - What: The deliverable (scope)
  - Why: Business value
  - Acceptance Criteria: Measurable success conditions
  - Out of Scope: Explicit exclusions
  - Constraints: Technical/business limitations</step>
<step order="4">Write context.md using the template</step>
</steps>

<output>context.md</output>
<next-phase>Phase 2: Planning</next-phase>
</phase>

<phase id="2" name="Planning">
<owner>planner (delegated by lachesis)</owner>
<trigger>context.md is complete</trigger>
<preconditions>
<file must-exist="true">context.md</file>
</preconditions>

<steps>
<step order="1">Lachesis delegates to planner agent</step>
<step order="2">Planner invokes plan-template skill</step>
<step order="3">Planner reads context.md to understand requirements</step>
<step order="4">Planner optionally delegates to explorer for codebase reconnaissance</step>
<step order="5">Planner writes implementation-plan.md</step>
<step order="6">Planner creates native tasks using TaskCreate for each task</step>
<step order="7">Planner sets task dependencies using TaskUpdate</step>
</steps>

<output>implementation-plan.md, native tasks</output>
<next-phase>Phase 3: Review</next-phase>
</phase>

<phase id="3" name="Review">
<owner>code-reviewer (delegated by lachesis)</owner>
<trigger>implementation-plan.md and tasks created</trigger>
<preconditions>
<file must-exist="true">context.md</file>
<file must-exist="true">implementation-plan.md</file>
<condition>Native tasks exist (TaskList returns tasks)</condition>
</preconditions>
<automatic-progression>true</automatic-progression>
<background-mode>true</background-mode>

<steps>
<step order="1">Lachesis IMMEDIATELY delegates to code-reviewer in background mode - no confirmation needed</step>
<step order="2">Lachesis informs user: "Plan review running in background. You can continue working."</step>
<step order="3">Code Reviewer invokes review-template skill</step>
<step order="4">Code Reviewer reads context.md (the source of truth)</step>
<step order="5">Code Reviewer validates plan against acceptance criteria</step>
<step order="6">Code Reviewer uses TaskList/TaskGet to verify every AC has at least one task</step>
<step order="7">Code Reviewer writes review-implementation.md with verdict</step>
<step order="8">When complete, Lachesis reads output file and handles verdict</step>
</steps>

<output>review-implementation.md</output>
<branching>
<if verdict="APPROVED">Automatically proceed to Phase 4: Execution - no user confirmation needed</if>
<if verdict="NEEDS_REVISION">STOP - Inform user, then return to Phase 2 with feedback</if>
<if verdict="REJECTED">STOP - Inform user, then return to Phase 1 to clarify context</if>
</branching>
</phase>

<phase id="4" name="Execution">
<owner>implementer + code-reviewer (delegated by lachesis)</owner>
<trigger>review-implementation.md shows APPROVED</trigger>
<preconditions>
<file must-exist="true">context.md</file>
<file contains="APPROVED">review-implementation.md</file>
<condition>Native tasks exist</condition>
</preconditions>

<execution-loop>
<step order="1">Use TaskList to find next pending task</step>
<step order="2">Use TaskUpdate to mark task as in_progress</step>
<step order="3">Set cycle_count to 1 in task metadata</step>
<step order="4">Lachesis delegates task to implementer agent</step>
<step order="5">MANDATORY: Lachesis delegates to code-reviewer for task review</step>
<step order="6">Handle review verdict:
  - APPROVED -> Automatically mark task complete and proceed to next task
  - NEEDS_REVISION -> Go to step 7</step>
<step order="7">Check cycle count in metadata:
  - If cycle < 3: increment cycle_count, delegate back to implementer with feedback, go to step 5
  - If cycle >= 3: STOP - escalate to human</step>
<step order="8">Human resolves the issue, then continue from step 4 or skip task</step>
<step order="9">Use TaskUpdate to mark task as completed</step>
<step order="10">Repeat from step 1 until all tasks complete</step>
</execution-loop>

<cycle-limit>
After 3 implementer-code-reviewer cycles without APPROVED, the task is stuck.
This prevents endless "gold-plating" loops. Human must decide:
- Accept current implementation as "good enough" (/loom-approve)
- Provide specific guidance to break the deadlock (/loom-reject "guidance")
- Skip the task and note it as blocked (/loom-skip "reason")
</cycle-limit>

<output>Code changes, review-task-*.md (mandatory)</output>
<exit-condition>All tasks marked completed</exit-condition>
<next-phase>Phase 5: Completion</next-phase>
</phase>

<phase id="5" name="Completion">
<owner>lachesis + code-reviewer</owner>
<trigger>All tasks complete</trigger>
<preconditions>
<condition>All tasks have status: completed (via TaskList)</condition>
</preconditions>

<steps>
<step order="1">Lachesis delegates final review to code-reviewer</step>
<step order="2">Code Reviewer verifies all acceptance criteria from context.md are met</step>
<step order="3">Code Reviewer writes final review</step>
<step order="4">Report summary to human</step>
</steps>

<output>Final review, completion summary</output>
</phase>

</workflow-phases>

<automatic-progression-rules>
<overview>
Loom uses automatic progression on the happy path to minimize user interruptions.
Reviews run in background where possible, and APPROVED verdicts proceed without confirmation.
</overview>

<rule context="after-planner-completes">
After planner completes:
1. IMMEDIATELY delegate to code-reviewer - no confirmation
2. Use background mode (run_in_background=true)
3. Inform user review is running in background
4. When complete, read output file and handle verdict
</rule>

<rule context="on-approved">
When code-reviewer returns APPROVED:
- Automatically proceed to next phase
- No user confirmation needed
</rule>

<rule context="on-revision-or-reject">
When code-reviewer returns NEEDS_REVISION or REJECTED:
- STOP and inform the user
- Wait for guidance before proceeding
</rule>
</automatic-progression-rules>

<session-management>
<ticket-id-format>
<examples>PROJ-123 (Jira), #456 (GitHub), feature-auth-flow (custom)</examples>
<normalize>lowercase for directory names, special chars replaced with hyphens</normalize>
</ticket-id-format>

<directory-structure>
.claude/loom/threads/
  {ticket-id}/
    context.md
    review-context.md        # Context review
    implementation-plan.md
    review-implementation.md # Plan review
    review-task-001.md       # Individual task reviews
    review-task-002.md
</directory-structure>

<native-tasks>
Tasks are managed using Claude Code's native task system:
- TaskCreate: Create new tasks with metadata
- TaskList: List all tasks with status
- TaskGet: Get full task details
- TaskUpdate: Update status and metadata
</native-tasks>
</session-management>

<task-metadata-schema>
Every task includes this metadata:

```json
{
  "loom_task_id": "TASK-001",
  "ticket_id": "PROJ-123",
  "delivers_ac": ["AC1", "AC2"],
  "agent": "implementer",
  "files": ["src/feature.ts"],
  "group": "Phase 1: Setup",
  "cycle_count": 0,
  "max_cycles": 3
}
```

<field name="loom_task_id">Unique task identifier</field>
<field name="ticket_id">Parent ticket ID</field>
<field name="delivers_ac">Which acceptance criteria this task delivers</field>
<field name="agent">Which agent executes (implementer, explorer)</field>
<field name="files">Files to be modified</field>
<field name="group">Task group/phase name</field>
<field name="cycle_count">Number of revision cycles (max 3)</field>
<field name="max_cycles">Maximum cycles before escalation</field>
</task-metadata-schema>

<human-commands>

<command name="/loom-status">
Display current workflow state, progress, and suggested next action.
Uses TaskList to show task progress.
</command>

<command name="/loom-approve">
Approve the current task after code review.
- Uses TaskUpdate to mark task completed
- Resets cycle_count to 0
- Reports next pending task
</command>

<command name="/loom-reject" args="feedback">
Reject current task and request another revision.
- Increments cycle_count in metadata
- Records feedback
- If cycle_count >= 3, marks task as blocked
</command>

<command name="/loom-skip" args="reason">
Skip a blocked task and move to the next one.
- Marks task as blocked in metadata
- Records reason
- Reports next pending task
</command>

</human-commands>

<delegation-patterns>
<pattern name="delegate-to-planner">
Task(
  subagent_type="loom:planner",
  allowed_tools=["Read", "Write", "Skill", "Task", "TaskCreate", "TaskUpdate"],
  prompt="Ticket: {TICKET-ID}

First invoke the plan-template skill, then read context.md at:
.claude/loom/threads/{ticket-id}/context.md

Create implementation-plan.md following the template.
Then create native tasks using TaskCreate for each task in the plan."
)

Note: Planner may delegate to explorer for codebase reconnaissance.
</pattern>

<pattern name="delegate-to-code-reviewer-background">
Task(
  subagent_type="loom:code-reviewer",
  run_in_background=true,
  allowed_tools=["Read", "Write", "Skill", "Glob", "Grep", "TaskList", "TaskGet"],
  prompt="Ticket: {TICKET-ID}

First invoke the review-template skill, then read:
- context.md (source of truth)
- implementation-plan.md (what to review)
- Use TaskList and TaskGet to verify AC coverage

Write review-implementation.md with your verdict."
)

Note: Use run_in_background=true for plan reviews. Read output_file when complete.
</pattern>

<pattern name="delegate-to-implementer">
Task(
  subagent_type="loom:implementer",
  allowed_tools=["Read", "Write", "Edit", "TaskGet"],
  prompt="Ticket: {TICKET-ID}
Task ID: {native_task_id}

Use TaskGet to read the task details.

Execute ONLY this single task. Do not work on other tasks.
If you need to search the codebase, request that lachesis delegate to explorer."
)
</pattern>

<pattern name="delegate-to-explorer">
Task(
  subagent_type="loom:explorer",
  allowed_tools=["Read", "Glob", "Grep"],
  prompt="Ticket: {TICKET-ID}

{Specific question about codebase}

Return findings quickly - speed over depth."
)
</pattern>
</delegation-patterns>

</loom-system>
