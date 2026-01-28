---
name: plan-template
description: Template for creating implementation-plan.md. MUST invoke before writing plan.
user-invocable: true
---

# Plan Template

<plan-template-system>

<purpose>
implementation-plan.md describes HOW we will deliver what's defined in context.md.
It bridges requirements to executable tasks.
</purpose>

<preconditions>
<file must-exist="true">context.md</file>
<action>Read context.md first to understand What/Why/AC</action>
</preconditions>

<validation-rules>
<rule>Must reference the ticket ID from context.md</rule>
<rule>Technical approach must address all acceptance criteria</rule>
<rule>AC Coverage table must map each AC to planned approach</rule>
<rule>Risks section must identify potential blockers</rule>
</validation-rules>

<file-location>
.claude/loom/threads/{ticket-id}/implementation-plan.md
</file-location>

<template>
```markdown
# Implementation Plan: {TICKET-ID}

**Ticket:** {TICKET-ID}
**Created:** {YYYY-MM-DDTHH:MM:SSZ}
**Author:** planner

---

## Summary

{2-3 sentence overview of the technical approach}

---

## Context Reference

- **What:** {Brief restatement from context.md}
- **Why:** {Brief restatement from context.md}

---

## Technical Approach

### Overview

{High-level description of the implementation strategy}

### Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| {Decision 1} | {Choice made} | {Why this choice} |
| {Decision 2} | {Choice made} | {Why this choice} |

### Components Affected

- `{path/to/file1}` - {what changes}
- `{path/to/file2}` - {what changes}

---

## AC Coverage

| AC | Approach | Verified By |
|----|----------|-------------|
| AC1: {criterion} | {How we'll achieve it} | {How we'll verify} |
| AC2: {criterion} | {How we'll achieve it} | {How we'll verify} |
| AC3: {criterion} | {How we'll achieve it} | {How we'll verify} |

---

## Implementation Phases

### Phase 1: {Name}

**Objective:** {What this phase achieves}

**Changes:**
- {Change 1}
- {Change 2}

### Phase 2: {Name}

**Objective:** {What this phase achieves}

**Changes:**
- {Change 1}
- {Change 2}

---

## Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| {Risk 1} | High/Med/Low | High/Med/Low | {How to address} |
| {Risk 2} | High/Med/Low | High/Med/Low | {How to address} |

---

## Out of Scope Verification

Confirming these items from context.md are NOT addressed in this plan:
- {Out of scope item 1} - Confirmed excluded
- {Out of scope item 2} - Confirmed excluded

---

## Dependencies

- {External dependency 1}
- {External dependency 2}

---

## Notes

- {Implementation notes}
- {Technical considerations}
```
</template>

<writing-guidelines>

<guideline name="AC Coverage">
CRITICAL: Every acceptance criterion from context.md MUST appear in the AC Coverage table.
If an AC cannot be addressed, flag it immediately - don't proceed with an incomplete plan.
</guideline>

<guideline name="Technical Approach">
Be specific enough that another developer could implement from this plan.
Include file paths, function names, and data structures where relevant.
</guideline>

<guideline name="Risks">
Identify what could go wrong. Better to surface risks early than discover them during execution.
</guideline>

<guideline name="Phases">
Group related changes into logical phases. This helps with task breakdown and review.
</guideline>

</writing-guidelines>

<next-step>
After creating implementation-plan.md, create native tasks using TaskCreate for each task.
Include metadata: loom_task_id, ticket_id, delivers_ac, agent, files, group, cycle_count, max_cycles.
Set task dependencies using TaskUpdate with addBlockedBy/addBlocks as needed.
</next-step>

</plan-template-system>
