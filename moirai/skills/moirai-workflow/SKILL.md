---
name: moirai-workflow
description: Master workflow for multi-agent orchestration. Invoke at session start or when coordinating agents.
user-invocable: true
---

# Moirai Workflow

<moirai-system>

<overview>
Moirai coordinates specialized AI agents through a structured workflow to deliver complex features.
Named after the Moirai (the three Fates of Greek mythology), the plugin orchestrates the thread of development through Lachesis's measured direction.
</overview>

<agents>
<agent name="lachesis" model="opus" color="purple">
<role>Coordinator - decides WHAT and WHO, never implements</role>
<delegates-to>planner, code-reviewer, implementer, explorer</delegates-to>
</agent>
<agent name="planner" model="sonnet" color="blue">
<role>Architect - creates implementation plans and task breakdowns</role>
<creates>implementation-plan.md, tasks.md</creates>
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
<rule id="3">NEVER create tasks.md unless implementation-plan.md exists</rule>
<rule id="4">NEVER execute tasks unless review-implementation.md shows APPROVED</rule>
<rule id="5">Lachesis NEVER implements code directly - always delegate to implementer</rule>
<rule id="6">Every acceptance criterion must map to at least one task</rule>
</golden-rules>

<workflow-phases>

<phase id="1" name="Context Definition">
<owner>lachesis + human</owner>
<trigger>User mentions a ticket ID (e.g., II-5092, PROJ-123)</trigger>
<preconditions>none</preconditions>

<steps>
<step order="1">Invoke the context-template skill</step>
<step order="2">Create session directory: .moirai/sessions/{ticket-id}/</step>
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
<step order="6">Planner invokes tasks-template skill</step>
<step order="7">Planner writes tasks.md with atomic task breakdown</step>
</steps>

<output>implementation-plan.md, tasks.md</output>
<next-phase>Phase 3: Review</next-phase>
</phase>

<phase id="3" name="Review">
<owner>code-reviewer (delegated by lachesis)</owner>
<trigger>implementation-plan.md and tasks.md complete</trigger>
<preconditions>
<file must-exist="true">context.md</file>
<file must-exist="true">implementation-plan.md</file>
<file must-exist="true">tasks.md</file>
</preconditions>

<steps>
<step order="1">Lachesis delegates to code-reviewer agent</step>
<step order="2">Code Reviewer invokes review-template skill</step>
<step order="3">Code Reviewer reads context.md (the source of truth)</step>
<step order="4">Code Reviewer validates plan against acceptance criteria</step>
<step order="5">Code Reviewer checks every AC has at least one task</step>
<step order="6">Code Reviewer writes review-implementation.md with verdict</step>
</steps>

<output>review-implementation.md</output>
<branching>
<if verdict="APPROVED">Proceed to Phase 4: Execution</if>
<if verdict="NEEDS_REVISION">Return to Phase 2 with feedback</if>
<if verdict="REJECTED">Return to Phase 1 to clarify context</if>
</branching>
</phase>

<phase id="4" name="Execution">
<owner>implementer + code-reviewer (delegated by lachesis)</owner>
<trigger>review-implementation.md shows APPROVED</trigger>
<preconditions>
<file must-exist="true">context.md</file>
<file must-exist="true">tasks.md</file>
<file contains="APPROVED">review-implementation.md</file>
</preconditions>

<execution-loop>
<step order="1">Read tasks.md to find next pending task [ ]</step>
<step order="2">Update task checkbox to in-progress [~]</step>
<step order="3">Initialize cycle counter: cycle = 1</step>
<step order="4">Lachesis delegates task to implementer agent</step>
<step order="5">MANDATORY: Lachesis delegates to code-reviewer for task review</step>
<step order="6">Handle review verdict:
  - APPROVED → Mark task complete, go to step 9
  - NEEDS_REVISION → Go to step 7</step>
<step order="7">Check cycle count:
  - If cycle &lt; 3: increment cycle, delegate back to implementer with feedback, go to step 5
  - If cycle &gt;= 3: STOP - escalate to human</step>
<step order="8">Human resolves the issue, then continue from step 4 or skip task</step>
<step order="9">Update task checkbox to complete [x]</step>
<step order="10">Update Progress line and Session Log in tasks.md</step>
<step order="11">Repeat from step 1 until all tasks complete</step>
</execution-loop>

<cycle-limit>
After 3 implementer↔code-reviewer cycles without APPROVED, the task is stuck.
This prevents endless "gold-plating" loops. Human must decide:
- Accept current implementation as "good enough"
- Provide specific guidance to break the deadlock
- Simplify or split the task
- Skip the task and note it as blocked
</cycle-limit>

<output>Code changes, review-task-*.md (mandatory)</output>
<exit-condition>All tasks marked [x] complete</exit-condition>
<next-phase>Phase 5: Completion</next-phase>
</phase>

<phase id="5" name="Completion">
<owner>lachesis + code-reviewer</owner>
<trigger>All tasks complete</trigger>
<preconditions>
<condition>All tasks in tasks.md marked [x]</condition>
</preconditions>

<steps>
<step order="1">Lachesis delegates final review to code-reviewer</step>
<step order="2">Code Reviewer verifies all acceptance criteria from context.md are met</step>
<step order="3">Code Reviewer writes final review or updates review-implementation.md</step>
<step order="4">Lachesis updates tasks.md Session Log with completion summary</step>
<step order="5">Report summary to human</step>
</steps>

<output>Updated tasks.md Session Log, final summary</output>
</phase>

</workflow-phases>

<session-management>
<ticket-id-format>
<pattern>[A-Z0-9]+-[A-Z0-9]+</pattern>
<examples>II-5092, PROJ-123, BUG-42, FEAT-1</examples>
<normalize>lowercase for directory names</normalize>
</ticket-id-format>

<directory-structure>
.moirai/
  sessions/
    {ticket-id}/
      context.md
      implementation-plan.md
      tasks.md                 # includes Session Log
      review-implementation.md
      review-task-001.md
      review-task-002.md
</directory-structure>
</session-management>

<delegation-patterns>
<pattern name="delegate-to-planner">
Task(
  subagent_type="planner",
  allowed_tools=["Read", "Write", "Skill", "Task"],
  prompt="Ticket: {TICKET-ID}

First invoke the plan-template skill, then read context.md at:
.moirai/sessions/{ticket-id}/context.md

Create implementation-plan.md following the template.
Then invoke tasks-template skill and create tasks.md."
)

Note: Planner may delegate to explorer for codebase reconnaissance.
</pattern>

<pattern name="delegate-to-code-reviewer">
Task(
  subagent_type="code-reviewer",
  allowed_tools=["Read", "Write", "Skill", "Glob", "Grep"],
  prompt="Ticket: {TICKET-ID}

First invoke the review-template skill, then read:
- context.md (source of truth)
- implementation-plan.md (what to review)
- tasks.md (verify AC coverage)

Write review-implementation.md with your verdict."
)
</pattern>

<pattern name="delegate-to-implementer">
Task(
  subagent_type="implementer",
  allowed_tools=["Read", "Write", "Edit"],
  prompt="Ticket: {TICKET-ID}
Task: {TASK-ID}

Read the task details from:
.moirai/sessions/{ticket-id}/tasks.md

Execute ONLY this single task. Do not work on other tasks.
If you need to search the codebase, request that lachesis delegate to explorer."
)
</pattern>

<pattern name="delegate-to-explorer">
Task(
  subagent_type="explorer",
  allowed_tools=["Read", "Glob", "Grep"],
  prompt="Ticket: {TICKET-ID}

{Specific question about codebase}

Return findings quickly - speed over depth."
)
</pattern>
</delegation-patterns>

</moirai-system>
