---
name: review-template
description: Template for creating review files. MUST invoke before writing any review.
user-invocable: true
---

# Review Template

<review-template-system>

<purpose>
Review files document the code-reviewer's assessment of plans or task implementations.
The code-reviewer's job is to find problems - assume something is wrong and locate it.
</purpose>

<review-types>
<type name="implementation-review">
<file>review-implementation.md</file>
<reviews>implementation-plan.md and tasks.md against context.md</reviews>
<when>After planner creates plan, before execution begins</when>
</type>
<type name="task-review">
<file>review-task-{NNN}.md</file>
<reviews>Individual task implementation against task requirements</reviews>
<when>MANDATORY after implementer completes each task</when>
<cycle-limit>Max 3 implementer↔code-reviewer cycles before human escalation</cycle-limit>
</type>
<type name="final-review">
<file>review-final.md or updated review-implementation.md</file>
<reviews>Complete implementation against all acceptance criteria</reviews>
<when>After all tasks complete</when>
</type>
</review-types>

<verdicts>
<verdict name="APPROVED" action="proceed">
Plan/implementation meets all requirements. No critical or major issues.
</verdict>
<verdict name="NEEDS_REVISION" action="return to author">
Issues found that must be addressed before proceeding.
Author should fix and resubmit for re-review.
</verdict>
<verdict name="REJECTED" action="return to context">
Fundamental problems that require revisiting the context or requirements.
Cannot proceed without clarification from human.
</verdict>
</verdicts>

<severity-levels>
<severity name="Critical" blocks="yes">
Must fix before proceeding. Blocks approval.
Examples: Missing AC coverage, security vulnerability, breaking change
</severity>
<severity name="Major" blocks="yes">
Should fix before proceeding. Blocks approval.
Examples: Incomplete implementation, missing error handling
</severity>
<severity name="Minor" blocks="no">
Should fix but doesn't block approval.
Examples: Code style, minor optimization opportunities
</severity>
<severity name="Suggestion" blocks="no">
Optional improvement. Does not affect approval.
Examples: Alternative approaches, future considerations
</severity>
</severity-levels>

<file-location>
.claude/loom/threads/{ticket-id}/review-implementation.md
.claude/loom/threads/{ticket-id}/review-task-{NNN}.md
</file-location>

<template-implementation-review>
```markdown
# Review: Implementation Plan - {TICKET-ID}

**Ticket:** {TICKET-ID}
**Reviewed:** {YYYY-MM-DDTHH:MM:SSZ}
**Reviewer:** code-reviewer
**Verdict:** {APPROVED | NEEDS_REVISION | REJECTED}

---

## Summary

{2-3 sentence summary of the review findings}

---

## Context Alignment

### What/Why Verification
- [ ] Plan addresses the "What" from context.md
- [ ] Plan delivers the "Why" (business value)
- [ ] Plan respects "Out of Scope" boundaries
- [ ] Plan adheres to "Constraints"

### Acceptance Criteria Coverage

| AC | Covered? | How | Issues |
|----|----------|-----|--------|
| AC1: {criterion} | Yes/No/Partial | {Which tasks} | {Any issues} |
| AC2: {criterion} | Yes/No/Partial | {Which tasks} | {Any issues} |
| AC3: {criterion} | Yes/No/Partial | {Which tasks} | {Any issues} |

**Coverage Assessment:** {All ACs covered | Missing coverage for: AC2, AC3}

---

## Issues Found

### Critical Issues

{None | List critical issues}

1. **{Issue Title}**
   - **Location:** {File or section}
   - **Problem:** {Description}
   - **Impact:** {Why this matters}
   - **Recommendation:** {How to fix}

### Major Issues

{None | List major issues}

### Minor Issues

{None | List minor issues}

### Suggestions

{None | List suggestions}

---

## Task Breakdown Assessment

- [ ] Tasks are atomic (single responsibility)
- [ ] Tasks have clear acceptance criteria
- [ ] Dependencies are correctly identified
- [ ] Estimated effort is reasonable
- [ ] Agent assignments are appropriate

---

## Risk Assessment

| Risk from Plan | Assessment | Additional Concerns |
|----------------|------------|---------------------|
| {Risk 1} | Adequate/Inadequate | {Comments} |

---

## Verdict Rationale

{Explain why APPROVED/NEEDS_REVISION/REJECTED}

{If NEEDS_REVISION or REJECTED, list specific items that must be addressed}

---

## Meta-Learning Notes

{Patterns observed that could improve future work}
- {Learning 1}
- {Learning 2}
```
</template-implementation-review>

<template-task-review>
```markdown
# Review: {TASK-ID} - {TICKET-ID}

**Task:** {TASK-ID}
**Ticket:** {TICKET-ID}
**Reviewed:** {YYYY-MM-DDTHH:MM:SSZ}
**Reviewer:** code-reviewer
**Verdict:** {APPROVED | NEEDS_REVISION}

---

## Task Summary

**Description:** {Task description from tasks.md}
**Delivers:** {Which AC}
**Files Changed:** {List of files}

---

## Assessment

### Acceptance Criteria Check
- [ ] Task acceptance criterion met: {criterion}
- [ ] Implementation matches task description
- [ ] No unintended side effects

### Code Quality
- [ ] Code is readable and maintainable
- [ ] Error handling is appropriate
- [ ] No security concerns introduced
- [ ] Tests added/updated if applicable

---

## Issues Found

{None | List issues with severity}

---

## Verdict

{APPROVED: Task complete, ready for next task}
{NEEDS_REVISION: Must address issues before marking complete}

---

## Notes

{Any observations for the execution log}
```
</template-task-review>

<review-guidelines>

<guideline name="Skeptical Stance">
Your job is to find problems. Assume something is wrong and systematically check until you find it.
Don't rubber-stamp - genuine review catches issues before they become expensive to fix.
</guideline>

<guideline name="Context is Truth">
Always compare against context.md. The context defines what success looks like.
If the plan doesn't address an AC, it's incomplete - period.
</guideline>

<guideline name="Actionable Feedback">
Every issue should have a clear recommendation. Don't just say "this is wrong" - say how to fix it.
</guideline>

<guideline name="Meta-Learning">
Capture patterns that could improve future work. This builds organizational knowledge over time.
</guideline>

</review-guidelines>

<next-step>
After creating review-implementation.md:
- If APPROVED: Orchestrator proceeds to execution phase
- If NEEDS_REVISION: Orchestrator delegates back to planner with feedback
- If REJECTED: Orchestrator returns to human to clarify context
</next-step>

</review-template-system>
