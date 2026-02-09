---
name: weave
description: Weave a new thread in the loom - initialize a workflow session. Usage: /loom:weave
user-invocable: true
---

# Loom Session Initialization

<usage>
**Command:** `/loom:weave`

The skill starts by asking two questions to understand your needs:
1. Do you have a ticket number? (Jira, GitHub, custom identifier)
2. Do you want to research a specific topic?

Based on your answers, the workflow branches accordingly.
</usage>

<interactive-entry>
When invoked, start by using AskUserQuestion tool with these two questions:

**Question 1:**
- Question: "Do you have a ticket number or identifier for this work?"
- Header: "Ticket ID"
- Options:
  - Label: "Yes, I have a ticket ID", Description: "I'll provide a Jira, GitHub, or custom identifier"
  - Label: "No, let me describe it", Description: "I'll provide a descriptive name for this work"

**Question 2:**
- Question: "Do you want to research a specific topic before defining requirements?"
- Header: "Research Mode"
- Options:
  - Label: "Yes, research first", Description: "Explore the codebase and document findings before planning"
  - Label: "No, skip to requirements", Description: "I have clear requirements, skip research and go straight to context definition"

Based on answers:
- If Q1 = "Yes" → Ask for ticket ID, attempt to fetch ticket data
- If Q1 = "No" → Ask for descriptive name (e.g., "feature-auth-flow")
- If Q2 = "Yes" → Enter Research Mode (Phase 0)
- If Q2 = "No" → Skip to Context Definition (Phase 1)
</interactive-entry>

<initialization-steps>
When a valid ticket ID is provided:

<step order="1">
**Create session directory:**
```
.claude/loom/threads/{ticket-id}/
```
(Use lowercase ticket-id for the directory name)
</step>

<step order="2">
**Confirm initialization:**
Report to user:
- Session created for ticket: {TICKET-ID}
- Session path: .claude/loom/threads/{ticket-id}/
- Current phase: Context Definition
</step>

<step order="3">
**Prompt for context definition:**
Ask the user to describe what they want to build. Guide them to provide:
- What: The deliverable (scope)
- Why: Business value
- Acceptance Criteria: Measurable success conditions
</step>
</initialization-steps>

<loom-system>

<identity>
You have initialized a Loom multi-agent orchestration session.
Lachesis coordinates specialized agents through a structured workflow.
</identity>

<agents-overview>
Loom coordinates specialized AI agents through a structured workflow:

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
</agents-overview>

<auto-progression-rules>
The workflow uses automatic progression on the happy path:
- After planner completes: Immediately delegate to code-reviewer (background mode)
- On APPROVED verdict: Automatically proceed to next phase
- On NEEDS_REVISION/REJECTED: Stop and wait for user guidance
- Revision cycle limits: Max 2 cycles for research/plan, then auto-approve
- Task execution: Max 3 cycles, then human escalation
</auto-progression-rules>

<golden-rules priority="critical">
<rule id="1">NEVER write an artifact without first invoking its template skill</rule>
<rule id="2">NEVER create implementation-plan.md unless context.md exists</rule>
<rule id="3">NEVER execute tasks unless review-implementation.md shows APPROVED</rule>
<rule id="4">Lachesis NEVER implements code directly - always delegate to implementer agent</rule>
<rule id="5">Every acceptance criterion must map to at least one task</rule>
<rule id="6">Use native task system (TaskCreate/TaskList/TaskUpdate) for all task management</rule>
</golden-rules>

<skill-requirements>
<skill-mapping>
<artifact name="context.md" requires-skill="context-template"/>
<artifact name="implementation-plan.md" requires-skill="plan-template"/>
<artifact pattern="review-*.md" requires-skill="review-template"/>
<artifact name="research.md" requires-skill="research-template"/>
</skill-mapping>
<enforcement>You MUST invoke the required skill BEFORE writing any loom artifact.</enforcement>
</skill-requirements>

<task-management>
Tasks are managed using Claude Code's native task system:
- TaskCreate: Planner creates tasks with metadata
- TaskList: List all tasks with status
- TaskGet: Get full task details
- TaskUpdate: Update status and metadata
</task-management>

<workflow-phases-summary>
<phase id="0" name="Research" owner="loom:researcher + loom:code-reviewer" output="research.md, review-research.md" optional="true"/>
<phase id="1" name="Context" owner="lachesis + human" output="context.md"/>
<phase id="2" name="Planning" owner="loom:planner" output="implementation-plan.md, native tasks"/>
<phase id="3" name="Review" owner="loom:code-reviewer" output="review-implementation.md"/>
<phase id="4" name="Execution" owner="loom:implementer + loom:code-reviewer" output="code changes, task reviews"/>
<phase id="5" name="Completion" owner="lachesis + loom:code-reviewer" output="final verification"/>
</workflow-phases-summary>

<available-skills>
<skill name="context-template">Template for context.md</skill>
<skill name="plan-template">Template for implementation-plan.md</skill>
<skill name="review-template">Template for review files with verdicts</skill>
<skill name="research-template">Template for research.md</skill>
</available-skills>

<available-agents>
<agent name="loom:researcher">Creates research.md from codebase exploration</agent>
<agent name="loom:planner">Creates implementation plans and native tasks from context.md</agent>
<agent name="loom:code-reviewer">Reviews plans and implementations</agent>
<agent name="loom:implementer">Executes individual tasks</agent>
<agent name="loom:explorer">Fast codebase reconnaissance</agent>
</available-agents>

</loom-system>

<chain-state-tracking>

**File:** `.claude/loom/threads/{ticket-id}/chain-state.json`

Track workflow progression across phases:

```json
{
  "ticket_id": "PROJ-123",
  "created": "2026-02-07T10:00:00Z",
  "current_phase": "context",
  "phases": {
    "research": {
      "status": "completed|skipped|in_progress|pending",
      "skipped_reason": "simple ticket - clear requirements",
      "artifact": "research.md",
      "review_artifact": "review-research.md",
      "cycle_count": 1,
      "max_cycles": 2,
      "final_verdict": "APPROVED|AUTO_APPROVED",
      "completed_at": "2026-02-07T10:15:00Z"
    },
    "context": {
      "status": "in_progress",
      "artifact": "context.md",
      "cycle_count": 0,
      "max_cycles": 2,
      "final_verdict": null
    },
    "planning": {
      "status": "pending",
      "artifact": "implementation-plan.md",
      "review_artifact": "review-implementation.md",
      "cycle_count": 0,
      "max_cycles": 2
    },
    "execution": {
      "status": "pending",
      "tasks_total": 0,
      "tasks_completed": 0
    }
  }
}
```

**Update chain-state.json at:**
- Session initialization (create file)
- Phase transitions (update current_phase, status)
- Review cycles (increment cycle_count)
- Phase completion (set final_verdict, completed_at)

</chain-state-tracking>

<prompt-chain name="init-with-ticket">

This prompt chain orchestrates the initialization workflow. The main Claude Code agent follows these steps, delegating to specialized subagents where indicated.

<step order="0" name="check-plan-mode">
**Prerequisite Check:**
IF plan mode is active:
  1. Use AskUserQuestion tool with these parameters:
     - Question: "Plan mode is currently active. The /loom:weave workflow needs to create files and directories. Do you want to exit plan mode to proceed?"
     - Header: "Plan Mode"
     - Options:
       - Label: "Exit plan mode", Description: "Exit plan mode and continue with initialization"
       - Label: "Stay in plan mode", Description: "Cancel initialization, remain in plan mode"

  2. If user selects "Exit plan mode":
     - Call ExitPlanMode tool
     - Continue to step 1

  3. If user selects "Stay in plan mode":
     - Respond: "Initialization cancelled. Run /loom:weave again after exiting plan mode."
     - STOP
</step>

<step order="1" name="ask-questions">
**Ask Entry Questions:**
Use AskUserQuestion tool with the two questions defined in <interactive-entry> above:
1. Ticket ID question (Yes/No)
2. Research mode question (Yes/No)

Store answers for routing in steps 2 and 2.5.
</step>

<step order="2" name="get-identifier" condition="always">
**Get Work Identifier:**

If Q1 answer = "Yes":
  - Ask user to provide their ticket ID
  - Detect pattern (#123, PROJ-123, owner/repo#123)
  - If pattern detected, proceed to step 2.3 (fetch-ticket)
  - If plain text, use as identifier and skip to step 2.5

If Q1 answer = "No":
  - Ask user for a descriptive name for this work session
  - Use provided name as identifier (normalized to lowercase)
  - Skip to step 2.5
</step>

<step order="2.3" name="fetch-ticket" condition="ticket-pattern-detected">
**Delegate to ticket-fetcher:**
When input matches ticket pattern (#123, PROJ-123, owner/repo#123):

```
Task tool call:
- subagent_type: "loom:ticket-fetcher"
- allowed_tools: ["Bash", "WebFetch", "Read", "Glob", "Grep"]
- prompt: "Fetch ticket data for: {ticket-id}"
```

**Capture the XML response** containing:
- title, description, acceptance criteria
- source (github/jira), url, labels

If error returned, fall back to manual description input.
</step>

<step order="2.5" name="research-detect">
**Determine Research Mode:**

Use Q2 answer to decide:

If Q2 = "Yes, research first":
  - Proceed to step 2.6 (research-create)

If Q2 = "No, skip to requirements":
  - Update chain-state.json: research.status = "skipped"
  - Set research.skipped_reason = "User opted to skip research phase"
  - Skip to step 3 (write-context)
</step>

<step order="2.6" name="research-create" condition="research-needed">
**Delegate to researcher:**

```
Task tool call:
- subagent_type: "loom:researcher"
- allowed_tools: ["Read", "Write", "Skill", "Task", "Glob", "Grep"]
- prompt: "Create research.md for ticket: {ticket-id}

  Topic: {ticket title or description}
  Session path: .claude/loom/threads/{ticket-id}/

  1. Invoke research-template skill
  2. Delegate to loom:explorer for codebase reconnaissance
  3. Document at least 2 viable approaches with trade-offs
  4. Write research.md to the session directory"
```

Update chain-state.json: research.status = "in_progress"
</step>

<step order="2.7" name="research-review">
**Delegate to code-reviewer:**

```
Task tool call:
- subagent_type: "loom:code-reviewer"
- allowed_tools: ["Read", "Write", "Skill"]
- prompt: "Review research.md at: .claude/loom/threads/{ticket-id}/research.md

  Invoke review-template skill.
  Validate exploration quality and approach viability.
  Write review-research.md with verdict: APPROVED or NEEDS_REVISION"
```

**Capture verdict** from the review.
</step>

<step order="2.8" name="research-revision" condition="verdict=NEEDS_REVISION">
**Handle Research Revision:**

Track: research_review_cycle (start at 0, max 2)

If verdict is NEEDS_REVISION:
1. Check cycle count
2. If cycle < 2:
   - Increment research_review_cycle
   - Extract feedback from review-research.md
   - Delegate back to researcher with feedback:
     ```
     Task(subagent_type="loom:researcher",
       prompt="Revise research.md based on feedback: {feedback}...")
     ```
   - Loop back to step 2.7
3. If cycle >= 2:
   - Log: "Auto-approving research after 2 cycles"
   - Set research.final_verdict = "AUTO_APPROVED" in chain-state.json
   - Proceed to step 3 (context)

If verdict is APPROVED:
- Set research.final_verdict = "APPROVED"
- Set research.status = "completed"
- Proceed to step 3 (context)
</step>

<step order="3" name="write-context">
**Create context.md:**
1. Invoke the `context-template` skill
2. Populate template using:
   - Ticket data (if fetched) OR
   - User's description (if manual input)
3. Write context.md to `.claude/loom/threads/{ticket-id}/`
</step>

<step order="4" name="review-context">
**Delegate to context-reviewer:**
After context.md is written:

```
Task tool call:
- subagent_type: "loom:context-reviewer"
- allowed_tools: ["Read", "Glob", "Grep"]
- prompt: "Review context.md at: .claude/loom/threads/{ticket-id}/context.md"
```

**Capture the XML response** containing:
- verdict: APPROVED or NEEDS_IMPROVEMENT
- checklist results
- required changes (if any)
- suggestions
</step>

<step order="5" name="process-feedback" condition="verdict=NEEDS_IMPROVEMENT">
**Handle Review Feedback:**
If verdict is NEEDS_IMPROVEMENT:
1. Apply the required changes to context.md
2. Loop back to step 4 (max 2 iterations)
3. If max iterations reached, proceed with current context and note limitations

Track iterations:
- context_review_cycle: 0 → 1 → 2
- max_context_review_cycles: 2
</step>

<step order="6" name="confirm">
**Confirm and Proceed:**
Display to user:
- Final context summary (What, Why, ACs)
- Review verdict and any outstanding suggestions
- Session path

Ask: "Context is ready. Shall I proceed to the planning phase?"
</step>

</prompt-chain>

<next-step>
After initialization, the prompt chain guides the workflow:

1. **Interactive Entry:** Ask two questions (ticket ID, research mode)
2. **Route based on answers:**
   - If ticket pattern detected: Fetch ticket data
   - If research requested: Enter Phase 0 (Research)
   - Otherwise: Proceed directly to Phase 1 (Context Definition)
3. **Context validation:** Ensure context.md is validated before proceeding to planning

The workflow adapts to user needs through the interactive entry questions.
</next-step>
