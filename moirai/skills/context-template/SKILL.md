---
name: context-template
description: Template for creating context.md. MUST invoke before writing context.md.
user-invocable: true
---

# Context Template

<context-template-system>

<purpose>
context.md is the source of truth for all work. It defines WHAT we're building and WHY.
All planning, reviews, and implementations trace back to this document.
</purpose>

<validation-rules>
<rule>Ticket ID must match pattern: [A-Z0-9]+-[A-Z0-9]+</rule>
<rule>What section must clearly define the deliverable scope</rule>
<rule>Why section must articulate business value</rule>
<rule>Acceptance Criteria must be measurable and testable</rule>
<rule>Each AC should be a checkbox [ ] for tracking</rule>
</validation-rules>

<file-location>
.moirai/sessions/{ticket-id}/context.md
</file-location>

<template>
```markdown
# Context: {TICKET-ID}

**Ticket:** {TICKET-ID}
**Created:** {YYYY-MM-DDTHH:MM:SSZ}
**Contributors:** Human, AI

---

## What

{Describe the deliverable. What are we building? Be specific about scope.}

---

## Why

{Explain the business value. Why does this matter? Who benefits?}

---

## Acceptance Criteria

- [ ] AC1: {First measurable success condition}
- [ ] AC2: {Second measurable success condition}
- [ ] AC3: {Third measurable success condition}

---

## Out of Scope

- {What we are explicitly NOT doing}
- {Features or changes that are excluded}

---

## Constraints

- {Technical constraints (e.g., must use existing API)}
- {Business constraints (e.g., no breaking changes)}
- {Time or resource constraints}

---

## Notes

- {Additional context from human}
- {Relevant background information}
- {Links to related tickets or docs}
```
</template>

<writing-guidelines>

<guideline name="What section">
Be specific and bounded. Instead of "improve performance", say "reduce API response time for /users endpoint to under 200ms".
</guideline>

<guideline name="Why section">
Connect to user or business value. "Faster response times improve user experience and reduce bounce rate on the dashboard."
</guideline>

<guideline name="Acceptance Criteria">
Each criterion should be:
- Measurable: Can be verified as done or not done
- Independent: Can be tested separately
- Specific: No ambiguity about what "done" means

Bad: "System should be fast"
Good: "API responds in under 200ms for 95th percentile requests"
</guideline>

<guideline name="Out of Scope">
Explicitly list what you're NOT doing. This prevents scope creep and sets clear boundaries.
</guideline>

</writing-guidelines>

<next-step>
After creating context.md, the lachesis should delegate to the planner agent to create implementation-plan.md.
</next-step>

</context-template-system>
