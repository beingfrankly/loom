---
name: coding-standards
description: Use when implementing code. Enforces TDD, DRY, YAGNI, and quality practices.
user-invocable: false
---

# Coding Standards

<coding-standards-system>

<core-philosophy>
**TDD is non-negotiable.** Every line of production code must be justified by a failing test. This is not a preference—it is an iron law.

The disciplines in this skill prevent:
- Code that doesn't work (TDD catches bugs early)
- Code that's hard to change (DRY reduces coupling)
- Code that's never needed (YAGNI prevents waste)
- Code that's hard to understand (KISS ensures simplicity)
</core-philosophy>

## The TDD Cycle

<tdd-cycle>

```
┌─────────────────────────────────────────────────────────┐
│                    TDD CYCLE                            │
│                                                         │
│    ┌─────────┐                                          │
│    │   RED   │ ← Write a failing test FIRST             │
│    └────┬────┘                                          │
│         │                                               │
│         ▼                                               │
│    ┌─────────┐                                          │
│    │  GREEN  │ ← Write MINIMAL code to pass             │
│    └────┬────┘                                          │
│         │                                               │
│         ▼                                               │
│    ┌─────────┐                                          │
│    │REFACTOR │ ← Improve code, tests stay green         │
│    └────┬────┘                                          │
│         │                                               │
│         └────────────► Back to RED                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

<phase name="RED" rule="Write a failing test FIRST">
- Define what the code should do via a test
- Test must FAIL before you write any production code
- If you can't write a test, you don't understand the requirement
- **VIOLATION:** Writing production code without a failing test
</phase>

<phase name="GREEN" rule="Write MINIMAL code to pass">
- Write the simplest code that makes the test pass
- Do NOT add extra features, error handling, or "improvements"
- Hardcode values if that passes the test—this is correct
- **VIOLATION:** Writing more code than needed to pass
</phase>

<phase name="REFACTOR" rule="Improve without changing behavior">
- Clean up duplication (DRY applies HERE, not in GREEN)
- Extract methods, rename variables, simplify logic
- Tests must stay green throughout
- **VIOLATION:** Adding new functionality during refactor
</phase>

</tdd-cycle>

## Quality Principles

<principles>

<principle name="TDD" definition="Test-Driven Development">
**The Iron Law:** No production code without a failing test first.

Why it matters:
- Tests document intent
- Forces you to think before coding
- Catches bugs immediately
- Builds confidence to refactor

Enforcement: **DELETE production code written without a failing test.**
</principle>

<principle name="DRY" definition="Don't Repeat Yourself">
**Rule:** Extract duplication—but only during REFACTOR phase.

When to apply:
- During REFACTOR, never during GREEN
- When you see the same code 3+ times
- When a change requires updates in multiple places

When NOT to apply:
- During GREEN phase (duplication is fine temporarily)
- When the "duplication" serves different purposes
- When extraction makes code harder to understand
</principle>

<principle name="YAGNI" definition="You Aren't Gonna Need It">
**Rule:** Don't build features until you have a failing test for them.

Critical during GREEN:
- Only write code to pass the current test
- No "while I'm here" additions
- No "we might need this later" features
- No "just in case" error handling

If you think "we'll need this later"—STOP. Write a test for it, or don't build it.
</principle>

<principle name="KISS" definition="Keep It Simple, Stupid">
**Rule:** The simplest solution that works is the best solution.

Apply everywhere:
- Prefer simple over clever
- Prefer readable over concise
- Prefer boring over interesting
- Prefer obvious over elegant

If you feel smart writing it, it's probably too complex.
</principle>

<principle name="Single Responsibility">
**Rule:** Each function/class/module does ONE thing well.

Signs of violation:
- Functions longer than 20 lines
- Classes with more than 5 public methods
- Methods with "and" in their names (doThisAndThat)
- Multiple reasons to change a piece of code
</principle>

<principle name="Self-Documenting Code" definition="No Comments Unless Absolutely Required">
**Rule:** Code should explain itself. Comments are a failure to express intent in code.

When comments are FORBIDDEN:
- Explaining WHAT the code does (the code shows this)
- Describing function parameters or return values (use clear names)
- Documenting obvious logic (if it's obvious, no comment needed)
- Adding TODOs or FIXMEs (create a task instead)

When comments are ALLOWED:
- Explaining WHY a non-obvious decision was made
- Documenting complex algorithms that cannot be simplified
- Public API documentation (JSDoc/TSDoc) when project standards require it
- Regulatory or legal requirements
- Linking to external documentation for complex domain logic

**The test:** If you need a comment to explain what code does, rewrite the code to be clearer instead.

Signs you should refactor instead of comment:
- Variable names like `x`, `temp`, `data`, `result`
- Functions longer than 10 lines
- Nested conditionals deeper than 2 levels
- Magic numbers or strings

**Good code reads like prose. Comments are admitting defeat.**
</principle>

</principles>

## Common Rationalizations

<rationalizations>

**STOP when you think any of these—you're violating the principles:**

| Thought | Reality | Principle Violated |
|---------|---------|-------------------|
| "I'll write the test after" | You won't. And the code won't be testable. | TDD |
| "This is too simple to test" | Simple code is easiest to test. No excuses. | TDD |
| "I know this works" | Prove it with a test. Confidence ≠ correctness. | TDD |
| "Let me just add this one thing" | One thing becomes ten. Test it first or don't add it. | YAGNI |
| "We'll definitely need this later" | Build it when you have a test for it. | YAGNI |
| "I'll clean this up later" | You won't. Clean it now during REFACTOR. | DRY |
| "This abstraction will help" | Abstractions should emerge from duplication, not be planned. | KISS |
| "I'll make this configurable" | Hardcode it. Make it configurable when a test demands it. | YAGNI |
| "Edge cases need handling" | Write a test for the edge case first. | TDD |
| "This is a quick fix" | Quick fixes without tests become permanent bugs. | TDD |
| "It's obvious what this does" | Then a test will be trivial to write. Write it. | TDD |
| "The test would be the same as the code" | Then write a simpler implementation. | KISS |
| "I'll add a comment to explain" | No. Rewrite the code to be self-explanatory. | Self-Documenting |
| "This needs documentation" | Use better names and smaller functions instead. | Self-Documenting |

</rationalizations>

## Red Flags

<red-flags>

**IMMEDIATE STOP signals—if you see yourself doing this, STOP and reassess:**

| Red Flag | What's Happening | Correct Action |
|----------|------------------|----------------|
| Writing production code first | TDD violation | Delete the code, write a failing test |
| Test passes immediately | Test doesn't test anything | Make the test actually fail first |
| Adding "just one more feature" | YAGNI violation | Stop. Does a test demand this? |
| Refactoring while tests fail | Discipline breakdown | Get to GREEN first |
| "Improving" code beyond the task | Scope creep | Stay within task boundaries |
| Adding error handling "to be safe" | YAGNI violation | Does a test require this handling? |
| Creating abstractions preemptively | KISS violation | Wait for duplication to emerge |
| Writing more than 10 lines to pass a test | Likely over-engineering | Simplify—pass the test minimally |
| Multiple tests failing at once | Working on too much | Focus on ONE failing test |
| Can't write a test for the requirement | Don't understand requirement | Clarify before coding |
| Writing a comment to explain code | Code isn't self-explanatory | Rename, extract, simplify instead |
| Adding JSDoc/docstrings to internal code | Over-documentation | Only document public APIs when project standards require it |

</red-flags>

## Verification Checklist

<verification-checklist>

**Before marking a task complete, verify ALL of these:**

### TDD Compliance
- [ ] Every piece of production code was written to pass a failing test
- [ ] No test was written after the production code
- [ ] All tests pass

### Code Quality
- [ ] Code is readable without comments explaining what it does
- [ ] No comments added (unless explaining complex WHY, not WHAT)
- [ ] Functions do one thing
- [ ] No obvious duplication (applied during REFACTOR)
- [ ] Names are clear and descriptive

### Scope Discipline
- [ ] Only code required by tests was written (YAGNI)
- [ ] No "improvements" beyond task scope
- [ ] No speculative features or abstractions

### Task Alignment
- [ ] Implementation matches the task description
- [ ] Acceptance criteria from the task are met
- [ ] No unauthorized file changes

</verification-checklist>

## Workflow Integration

<workflow>

When you receive a task:

1. **Read the task** - Understand what needs to be done
2. **Identify the first test** - What's the smallest behavior to test?
3. **RED** - Write a failing test for that behavior
4. **GREEN** - Write minimal code to pass
5. **REFACTOR** - Clean up if needed (tests stay green)
6. **Repeat** - Next test until task is complete
7. **Verify** - Run the verification checklist above

</workflow>

## Exception: When TDD Doesn't Apply

<exceptions>

TDD applies to logic and behavior. It does NOT apply to:

- **Configuration files** (YAML, JSON, etc.)
- **Static content** (documentation, templates)
- **Infrastructure** (deployment scripts, CI configuration)
- **Exploratory code** (spikes to understand a problem—delete after)

Even in these cases, YAGNI and KISS still apply.

</exceptions>

</coding-standards-system>
