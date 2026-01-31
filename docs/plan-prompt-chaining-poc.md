# Plan: Prompt Chaining PoC with Subagent Delegation

## Goal

Prove that **main agent orchestrated prompt chaining** with **subagent delegation per step** works.

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  USER executes /loom-init                                       │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  MAIN AGENT (Lachesis)                                          │
│                                                                 │
│  Step 1: ASK for input (ticket number OR feature idea)          │
│          → Use direct prompting to user                         │
│                                                                 │
│  Step 2: IF ticket number                                       │
│          → DELEGATE to SUBAGENT #1 (ticket-fetcher)             │
│                                                                 │
│          ┌─────────────────────────────────────┐                │
│          │  SUBAGENT #1: ticket-fetcher        │                │
│          │  - Fetch ticket content (Jira/GH)   │                │
│          │  - Extract: title, description, ACs │                │
│          │  - RETURN structured data           │                │
│          └─────────────────────────────────────┘                │
│                           │                                     │
│                           ▼                                     │
│  Step 3: WRITE context.md using subagent output                 │
│                                                                 │
│  Step 4: DELEGATE to SUBAGENT #2 (context-reviewer)             │
│                                                                 │
│          ┌─────────────────────────────────────┐                │
│          │  SUBAGENT #2: context-reviewer      │                │
│          │  - Review context.md                │                │
│          │  - Check: clarity, measurability    │                │
│          │  - RETURN feedback                  │                │
│          └─────────────────────────────────────┘                │
│                           │                                     │
│                           ▼                                     │
│  Step 5: PROCESS feedback, UPDATE context.md                    │
│                                                                 │
│  Step 6: CONFIRM with user, proceed to planning                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Simplified PoC (3-step version)

For testing, we simplify to prove the pattern:

```
USER → /loom-init

MAIN AGENT:
  1. ASK: "Ticket number or describe your feature"

  2. IF ticket number → DELEGATE to ticket-fetcher
     ELSE → Use input directly as description

  3. WRITE draft context.md

  4. DELEGATE to context-reviewer → GET feedback

  5. UPDATE context.md based on feedback

  6. DONE
```

---

## Files to Create/Modify

### 1. Create `ticket-fetcher` agent

**File:** `loom/agents/ticket-fetcher.md`

```yaml
---
name: ticket-fetcher
description: |
  Fetches ticket content from issue trackers (Jira, GitHub).
  Returns structured data: title, description, acceptance criteria.
model: haiku
disallowedTools:
  - Edit
  - Write
  - Task
---
```

**Purpose:** Fetch and parse ticket, return structured XML:
```xml
<ticket-data>
  <title>...</title>
  <description>...</description>
  <acceptance-criteria>...</acceptance-criteria>
</ticket-data>
```

### 2. Create `context-reviewer` agent

**File:** `loom/agents/context-reviewer.md`

```yaml
---
name: context-reviewer
description: |
  Reviews context.md for clarity and completeness.
  Returns feedback on what needs improvement.
model: haiku
disallowedTools:
  - Edit
  - Write
  - Task
  - Bash
---
```

**Purpose:** Review and return feedback:
```xml
<review-feedback>
  <verdict>NEEDS_IMPROVEMENT | APPROVED</verdict>
  <issues>
    <issue>AC2 is not measurable</issue>
  </issues>
  <suggestions>
    <suggestion>Rephrase AC2 to: "API returns 200 status"</suggestion>
  </suggestions>
</review-feedback>
```

### 3. Update `init` skill

**File:** `loom/skills/init/SKILL.md`

Add the orchestration chain that:
1. Asks user for input
2. Delegates to ticket-fetcher (if ticket ID)
3. Writes context.md
4. Delegates to context-reviewer
5. Processes feedback and updates

---

## Implementation Details

### Ticket-Fetcher Agent Logic

```markdown
# Ticket Fetcher Agent

You fetch ticket information and return structured data.

<workflow>
1. Receive ticket ID (e.g., PROJ-123, #456)
2. Determine source:
   - PROJ-123 pattern → Jira (use WebFetch or known API)
   - #123 pattern → GitHub (use gh CLI via Bash)
3. Extract:
   - Title
   - Description
   - Acceptance criteria (if present)
4. Return as XML structure
</workflow>

<output-format>
<ticket-data>
  <source>jira|github</source>
  <id>{TICKET-ID}</id>
  <title>{ticket title}</title>
  <description>{ticket description}</description>
  <acceptance-criteria>
    <ac>First criterion</ac>
    <ac>Second criterion</ac>
  </acceptance-criteria>
</ticket-data>
</output-format>
```

### Context-Reviewer Agent Logic

```markdown
# Context Reviewer Agent

You review context.md and provide actionable feedback.

<review-checklist>
- [ ] "What" section is specific and bounded
- [ ] "Why" section articulates business value
- [ ] Each AC is measurable and testable
- [ ] Out of scope is defined
- [ ] No ambiguities
</review-checklist>

<output-format>
<review-feedback>
  <verdict>APPROVED | NEEDS_IMPROVEMENT</verdict>
  <score>8/10</score>
  <issues>
    <issue field="AC2">Not measurable - "should be fast" is vague</issue>
  </issues>
  <suggestions>
    <suggestion field="AC2">Change to: "Response time under 200ms"</suggestion>
  </suggestions>
</review-feedback>
</output-format>
```

### Init Skill Orchestration

```markdown
<init-chain>

<step order="1" name="get-input">
Ask user: "Enter a ticket ID (e.g., PROJ-123) or describe what you want to build"
Capture response as {{user_input}}
</step>

<step order="2" name="fetch-or-use" condition="user_input matches ticket pattern">
IF ticket pattern:
  DELEGATE to ticket-fetcher:
  ```
  Task(
    subagent_type="loom:ticket-fetcher",
    allowed_tools=["Bash", "WebFetch", "Read"],
    prompt="Fetch ticket {{user_input}} and return structured data"
  )
  ```
  Capture response as {{ticket_data}}
ELSE:
  Use {{user_input}} as raw description
</step>

<step order="3" name="write-draft">
Invoke context-template skill
Write context.md using {{ticket_data}} or {{user_input}}
</step>

<step order="4" name="review">
DELEGATE to context-reviewer:
```
Task(
  subagent_type="loom:context-reviewer",
  allowed_tools=["Read"],
  prompt="Review context.md at .claude/loom/threads/{{TICKET-ID}}/context.md
          Return feedback as XML"
)
```
Capture response as {{feedback}}
</step>

<step order="5" name="process-feedback">
IF feedback.verdict == "NEEDS_IMPROVEMENT":
  Update context.md based on suggestions
  (Optionally: loop back to step 4, max 2 iterations)
</step>

<step order="6" name="confirm">
Display final context.md summary to user
Ask: "Ready to proceed to planning?"
</step>

</init-chain>
```

---

## Verification Steps

1. Run `/loom-init`
2. Enter a ticket ID (e.g., `TEST-001`) or feature description
3. Verify ticket-fetcher is called (check logs/output)
4. Verify context.md is written
5. Verify context-reviewer is called
6. Verify feedback is processed
7. Check final context.md reflects improvements

---

## Success Criteria

| Check | Expected |
|-------|----------|
| Main agent orchestrates | ✓ Lachesis controls flow |
| Subagent #1 called | ✓ ticket-fetcher invoked |
| Subagent #1 returns data | ✓ XML structure returned |
| context.md written | ✓ File exists with content |
| Subagent #2 called | ✓ context-reviewer invoked |
| Subagent #2 returns feedback | ✓ Feedback XML returned |
| Feedback processed | ✓ context.md updated |

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `loom/agents/ticket-fetcher.md` | Create | Fetch ticket data |
| `loom/agents/context-reviewer.md` | Create | Review context.md |
| `loom/skills/init/SKILL.md` | Update | Add orchestration chain |
