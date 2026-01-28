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
<rule id="7">AUTO-PROCEED on APPROVED verdicts - no confirmation needed for happy path</rule>
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
<automatic-progression>true</automatic-progression>
<background-mode>true</background-mode>

<steps>
<step order="1">Lachesis IMMEDIATELY delegates to code-reviewer in background mode - no confirmation needed</step>
<step order="2">Lachesis informs user: "Plan review running in background. You can continue working."</step>
<step order="3">Code Reviewer invokes review-template skill</step>
<step order="4">Code Reviewer reads context.md (the source of truth)</step>
<step order="5">Code Reviewer validates plan against acceptance criteria</step>
<step order="6">Code Reviewer checks every AC has at least one task</step>
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
  - APPROVED -> Automatically mark task complete and proceed to next task
  - NEEDS_REVISION -> Go to step 7</step>
<step order="7">Check cycle count:
  - If cycle < 3: increment cycle, delegate back to implementer with feedback, go to step 5
  - If cycle >= 3: STOP - escalate to human</step>
<step order="8">Human resolves the issue, then continue from step 4 or skip task</step>
<step order="9">Update task checkbox to complete [x]</step>
<step order="10">Update Progress line and Session Log in tasks.md</step>
<step order="11">Repeat from step 1 until all tasks complete</step>
</execution-loop>

<cycle-limit>
After 3 implementer-code-reviewer cycles without APPROVED, the task is stuck.
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
    state.json               # Workflow state tracking
    context.md
    review-context.md        # Context review
    implementation-plan.md
    review-plan.md           # Plan review
    tasks.md                 # includes Session Log
    review-tasks.md          # Tasks review
    review-task-001.md       # Individual task reviews
    review-task-002.md
</directory-structure>
</session-management>

<state-management>

<overview>
Loom tracks workflow state in state.json to enforce review-gated phase progression.
State is automatically updated by hooks after agent delegations complete.
Human commands provide intervention points for approval, rejection, and skipping.
</overview>

<state-file>
state.json is created automatically when context.md is first written.

```json
{
  "ticket": "PROJ-123",
  "phase": "context | planning | execution | complete",
  "context_reviewed": false,
  "plan_reviewed": false,
  "tasks_reviewed": false,
  "current_task_id": null,
  "task_status": null,
  "cycle_count": 0,
  "started_at": "2024-01-15T10:00:00Z",
  "last_updated": "2024-01-15T12:30:00Z"
}
```

<field name="phase">Current workflow phase</field>
<field name="context_reviewed">Whether context.md has been reviewed and APPROVED</field>
<field name="plan_reviewed">Whether implementation-plan.md has been reviewed and APPROVED</field>
<field name="tasks_reviewed">Whether tasks.md has been reviewed and APPROVED</field>
<field name="current_task_id">ID of task currently being worked</field>
<field name="task_status">Status within execution: null | implementing | awaiting_review | addressing_feedback | awaiting_approval | blocked</field>
<field name="cycle_count">Number of revision cycles for current task (max 3)</field>
</state-file>

<state-transitions>

<transition from="context" to="planning">
Trigger: review-context.md created with APPROVED verdict
Auto-updated by: PostToolUse hook after code-reviewer completes
</transition>

<transition from="planning" to="execution">
Trigger: review-tasks.md created with APPROVED verdict
Auto-updated by: PostToolUse hook after code-reviewer completes
Auto-proceeds: Yes - no user confirmation needed
</transition>

<transition task_status="null -> implementing">
Trigger: Delegate to loom:implementer
Auto-updated by: PostToolUse hook after delegation
</transition>

<transition task_status="implementing -> awaiting_review">
Trigger: Implementer completes
Auto-updated by: PostToolUse hook
</transition>

<transition task_status="awaiting_review -> awaiting_approval">
Trigger: Code-reviewer returns APPROVED
Auto-updated by: PostToolUse hook
</transition>

<transition task_status="awaiting_review -> addressing_feedback">
Trigger: Code-reviewer returns NEEDS_REVISION
Auto-updated by: PostToolUse hook (also increments cycle_count)
</transition>

<transition task_status="awaiting_approval -> null (next task)">
Trigger: Human uses /loom-approve
Manual action required
</transition>

<transition task_status="* -> addressing_feedback">
Trigger: Human uses /loom-reject
Manual action required (also increments cycle_count)
</transition>

<transition task_status="* -> blocked">
Trigger: cycle_count reaches 3, or human uses /loom-skip
</transition>

</state-transitions>

<review-gates>
Hooks enforce that each phase transition requires review approval:

<gate artifact="implementation-plan.md">
Blocked until: review-context.md exists with APPROVED verdict
Enforced by: validate-write.sh PreToolUse hook
</gate>

<gate artifact="tasks.md">
Blocked until: review-plan.md exists with APPROVED verdict
Enforced by: validate-write.sh PreToolUse hook
</gate>

<gate artifact="delegation to implementer">
Blocked until: review-tasks.md exists with APPROVED verdict
Enforced by: validate-task.sh PreToolUse hook
</gate>

<gate artifact="next task after code review">
Blocked until: Human approves via /loom-approve
Enforced by: state.json task_status check
</gate>
</review-gates>

</state-management>

<human-commands>

<command name="/loom-status">
Display current workflow state, progress, and suggested next action.
Use to check where you are in the workflow.
</command>

<command name="/loom-approve">
Approve the current task after code review.
- Marks task [x] complete
- Resets cycle_count to 0
- Clears current_task_id
- Reports next pending task
</command>

<command name="/loom-reject" args="feedback">
Reject current task and request another revision.
- Increments cycle_count
- Sets task_status to addressing_feedback
- Records feedback in Session Log
- If cycle_count >= 3, marks task as blocked
</command>

<command name="/loom-skip" args="reason">
Skip a blocked task and move to the next one.
- Marks task [!] blocked
- Records reason in Blocked Tasks section
- Resets cycle_count
- Reports next pending task
</command>

</human-commands>

<delegation-patterns>
<pattern name="delegate-to-planner">
Task(
  subagent_type="loom:planner",
  allowed_tools=["Read", "Write", "Skill", "Task"],
  prompt="Ticket: {TICKET-ID}

First invoke the plan-template skill, then read context.md at:
.claude/loom/threads/{ticket-id}/context.md

Create implementation-plan.md following the template.
Then invoke tasks-template skill and create tasks.md."
)

Note: Planner may delegate to explorer for codebase reconnaissance.
</pattern>

<pattern name="delegate-to-code-reviewer-background">
Task(
  subagent_type="loom:code-reviewer",
  run_in_background=true,
  allowed_tools=["Read", "Write", "Skill", "Glob", "Grep"],
  prompt="Ticket: {TICKET-ID}

First invoke the review-template skill, then read:
- context.md (source of truth)
- implementation-plan.md (what to review)
- tasks.md (verify AC coverage)

Write review-implementation.md with your verdict."
)

Note: Use run_in_background=true for plan reviews. Read output_file when complete.
</pattern>

<pattern name="delegate-to-code-reviewer">
Task(
  subagent_type="loom:code-reviewer",
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
  subagent_type="loom:implementer",
  allowed_tools=["Read", "Write", "Edit"],
  prompt="Ticket: {TICKET-ID}
Task: {TASK-ID}

Read the task details from:
.claude/loom/threads/{ticket-id}/tasks.md

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
