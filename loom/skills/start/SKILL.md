---
name: start
description: Initialize a new loom workflow session for a ticket. Usage: /loom:start TICKET-ID
user-invocable: true
---

# Loom Session Initialization

<usage>
**Command:** `/loom:start TICKET-ID`

**Examples:**
- `/loom:start PROJ-123` (Jira)
- `/loom:start #456` (GitHub issue)
- `/loom:start feature-auth-flow` (custom identifier)
- `/loom:start my-feature` (descriptive name)
</usage>

<ticket-id-handling>
Accept any identifier the user provides. The ticket ID is used to:
1. Create the session directory (normalized to lowercase, special chars replaced with hyphens)
2. Track the work in session artifacts and native tasks

If no ticket ID is provided:
1. Ask the user to provide an identifier for this work session
2. Suggest they use their issue tracker ID or a descriptive name
</ticket-id-handling>

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
<phase id="1" name="Context" owner="lachesis + human" output="context.md"/>
<phase id="2" name="Planning" owner="loom:planner" output="implementation-plan.md, native tasks"/>
<phase id="3" name="Review" owner="loom:code-reviewer" output="review-implementation.md"/>
<phase id="4" name="Execution" owner="loom:implementer + loom:code-reviewer" output="code changes, task reviews"/>
<phase id="5" name="Completion" owner="lachesis + loom:code-reviewer" output="final verification"/>
</workflow-phases-summary>

<available-skills>
<skill name="loom-workflow">Master workflow and delegation patterns</skill>
<skill name="context-template">Template for context.md</skill>
<skill name="plan-template">Template for implementation-plan.md</skill>
<skill name="review-template">Template for review files with verdicts</skill>
<skill name="research-template">Template for research.md</skill>
</available-skills>

<available-agents>
<agent name="loom:planner">Creates implementation plans and native tasks from context.md</agent>
<agent name="loom:code-reviewer">Reviews plans and implementations</agent>
<agent name="loom:implementer">Executes individual tasks</agent>
<agent name="loom:explorer">Fast codebase reconnaissance</agent>
</available-agents>

</loom-system>

<next-step>
After initialization, begin Phase 1: Context Definition.

1. Invoke the `context-template` skill
2. Collaborate with the user to define the context
3. Write context.md to the session directory

Ask the user: "What would you like to build? Please describe the feature, bug fix, or change you want to implement."
</next-step>
