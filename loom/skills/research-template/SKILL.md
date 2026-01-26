---
name: research-template
description: Template for creating research.md. MUST invoke before writing research.md.
user-invocable: true
---

# Research Template

<research-template-system>

<purpose>
research.md captures exploration findings and design decisions before committing to implementation.
It documents approaches considered, trade-offs analyzed, and rationale for the chosen direction.
The planner agent reads this artifact to inform implementation-plan.md when research mode is used.
</purpose>

<validation-rules>
<rule>Exploration Summary must include at least 3 specific findings</rule>
<rule>At least 2 approaches must be documented with trade-offs</rule>
<rule>Design Decision must reference which option was chosen</rule>
<rule>Rationale must explain why chosen approach is better than alternatives</rule>
<rule>Open Questions should be actionable items for implementation phase</rule>
</validation-rules>

<file-location>
.claude/loom/threads/{session-id}/research.md
</file-location>

<preconditions>
<file must-exist="true">context.md in same session directory</file>
<note>In research mode, context.md is created in Phase R5 before research.md</note>
</preconditions>

<template>
```markdown
# Research: {Topic}

## Session Info
- **Session ID:** {session-id}
- **Date:** {YYYY-MM-DD}
- **Status:** In Progress | Complete

---

## Exploration Summary

What was discovered during reconnaissance:
- {Finding 1: Key files and patterns found}
- {Finding 2: Relevant documentation reviewed}
- {Finding 3: Existing implementations studied}

---

## Approaches Considered

### Option A: {Name}
- **Description:** Brief explanation of this approach
- **Pros:** Benefits of this approach
- **Cons:** Drawbacks and risks
- **Complexity:** Low | Medium | High

### Option B: {Name}
- **Description:** Brief explanation of this approach
- **Pros:** Benefits of this approach
- **Cons:** Drawbacks and risks
- **Complexity:** Low | Medium | High

### Option C: {Name} (if applicable)
- **Description:** Brief explanation of this approach
- **Pros:** Benefits of this approach
- **Cons:** Drawbacks and risks
- **Complexity:** Low | Medium | High

---

## Design Decision

**Chosen approach:** Option {X}: {Name}

**Rationale:** Why this approach was selected over alternatives. Reference specific pros/cons from options above.

**Key design elements:**
- {Element 1}
- {Element 2}
- {Element 3}

---

## Open Questions

Questions to resolve during implementation:
- [ ] {Actionable question 1}
- [ ] {Actionable question 2}
- [ ] {Actionable question 3}

---

## References

- **Files consulted:** {List of files examined}
- **Documentation:** {Relevant docs referenced}
- **External resources:** {URLs or resources used}
```
</template>

<writing-guidelines>

<guideline name="Exploration Summary">
Be specific about what you found. Instead of "looked at the codebase", say "found 3 existing implementations of caching in src/cache/, all using Redis with TTL patterns".
Each finding should be concrete and actionable information.
</guideline>

<guideline name="Approaches Considered">
Document at least 2 genuine alternatives. Each option should be:
- Viable: Could actually work as a solution
- Distinct: Meaningfully different from other options
- Complete: Has pros, cons, and complexity assessment

Complexity ratings:
- Low: Can be done with existing patterns, minimal changes
- Medium: Requires some new patterns or moderate changes
- High: Significant architectural changes or new dependencies
</guideline>

<guideline name="Design Decision">
The rationale must reference the trade-offs from the options. Explain why the chosen approach's pros outweigh its cons compared to alternatives.

Bad: "Option A is the best choice"
Good: "Option A's lower complexity (estimated 2 days) outweighs Option B's slightly better performance, given our timeline constraints"
</guideline>

<guideline name="Open Questions">
Each question should be:
- Actionable: Can be resolved with specific investigation or decision
- Relevant: Affects the implementation approach
- Scoped: Focused enough to have a clear answer

Bad: "How should we handle errors?"
Good: "Should we retry failed API calls with exponential backoff, or fail fast and let the user retry?"
</guideline>

</writing-guidelines>

<planning-connection>
When research mode is used, the planner agent reads research.md to inform implementation-plan.md:
- Design Decision becomes the foundation for the plan
- Open Questions may become investigation tasks
- References inform which files to modify
- Complexity assessments help estimate task effort
</planning-connection>

<next-step>
After completing research.md (Status: Complete), the user can either:
1. Start a ticket session to implement the design - lachesis creates context.md referencing the research
2. Continue exploring if more questions emerged
3. Archive the research if the approach is not viable
</next-step>

</research-template-system>
