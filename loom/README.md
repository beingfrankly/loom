# Loom

Multi-agent orchestration plugin for Claude Code using skills and native tools. Named after the Moirai (the three Fates of Greek mythology), this plugin orchestrates the thread of development through Lachesis's measured direction.

## Design Philosophy: The Three Fates

### The Moirai (Μοῖραι)

In Greek mythology, the Moirai were three goddesses who controlled the thread of every mortal's life:

| Fate | Greek Meaning | Mythological Role | Plugin Mapping |
|------|---------------|-------------------|----------------|
| **Clotho** | "to spin" | Spins the thread of life | Planner + Implementer (creation) |
| **Lachesis** | "to allot" | Measures the thread | Coordinator agent (orchestration) |
| **Atropos** | "unturnable" | Cuts the thread | Code Reviewer (final decisions) |

### Workflow as Thread

```
Context Definition  →  The raw material (wool before spinning)
Planning Phase      →  Clotho spins the thread (design emerges)
Review Phase        →  Lachesis measures (is it the right length?)
Execution Phase     →  The thread is woven (implementation)
Completion Phase    →  Atropos accepts or cuts (final judgment)
```

## Installation

### Option 1: Local Plugin (Recommended for development)

1. Copy the plugin to your Claude Code plugins directory or a local marketplace:

```bash
# Create a test marketplace
mkdir -p test-marketplace/loom
cp -r loom/* test-marketplace/loom/
```

2. Create a marketplace manifest (`test-marketplace/.claude-plugin/marketplace.json`):

```json
{
  "name": "test-marketplace",
  "owner": { "name": "Test" },
  "plugins": [
    {
      "name": "loom",
      "source": "./loom",
      "description": "Multi-agent orchestration plugin"
    }
  ]
}
```

3. Install the plugin:

```bash
/plugin marketplace add ./test-marketplace
/plugin install loom@test-marketplace
```

### Option 2: Direct Installation

Copy the plugin to your Claude Code plugins cache and restart Claude Code.

## What's Included

### Skills (`skills/`)

Skills provide templates and workflow guidance. Agents invoke skills before writing artifacts.

| Skill | Purpose |
|-------|---------|
| `loom:weave` | Entry point - weave a new thread, asks about ticket ID and research mode |
| `context-template` | Template for context.md |
| `plan-template` | Template for implementation-plan.md |
| `review-template` | Template for review files with verdicts |
| `research-template` | Template for research.md |
| `loom:status` | Display current workflow state |
| `loom:approve` | Approve task and move to next |
| `loom:reject` | Reject task with feedback |
| `loom:skip` | Skip blocked task |

### Agents (`agents/`)

| Agent | Model | Role | Fate Mapping |
|-------|-------|------|--------------|
| `lachesis` | Opus | Coordinates, defines context, never implements | The Measurer |
| `planner` | Sonnet | Creates plans and native tasks | Clotho (spinning) |
| `code-reviewer` | Sonnet | Reviews against context.md | Atropos (cutting) |
| `implementer` | Sonnet | Executes tasks | Clotho (spinning) |
| `explorer` | Haiku | Fast codebase search | Scout |

### Hooks (`hooks/hooks.json`)

| Hook | Trigger | Purpose |
|------|---------|---------|
| `SessionStart` | Session begins | Load workflow rules |
| `PreToolUse` | Before Write/Task | Enforce preconditions |
| `Stop` | Session ends | Remind to check status |

## Architecture: Skills-First + Native Tasks

Loom uses **skills and native Claude Code tools**. This means:

1. **No external dependencies** - No npm packages required
2. **Native Claude Code tools** - Agents use Read, Write, Edit, Glob, Grep
3. **Template skills** - Provide exact artifact formats
4. **Native task system** - TaskCreate, TaskList, TaskGet, TaskUpdate for task management

### Skill → Artifact Mapping

Before writing any artifact, agents must invoke the corresponding skill:

| Artifact | Required Skill |
|----------|---------------|
| `context.md` | `context-template` |
| `implementation-plan.md` | `plan-template` |
| `review-*.md` | `review-template` |
| `research.md` | `research-template` |

### Native Task System

Tasks are managed using Claude Code's native task tools instead of a tasks.md file:

| Tool | Purpose |
|------|---------|
| `TaskCreate` | Create tasks with metadata |
| `TaskList` | List all tasks with status |
| `TaskGet` | Get full task details |
| `TaskUpdate` | Update status and metadata |

### Preconditions

| Artifact | Requires |
|----------|----------|
| `implementation-plan.md` | `context.md` must exist |
| `review-implementation.md` | `implementation-plan.md` must exist |
| Task execution | `review-implementation.md` must show APPROVED |
| `research.md` | `context.md` must exist |

## The Flow

```
Human: /loom:weave

Lachesis: I'll help you weave a new thread. Let me ask a few questions:
- Do you have a ticket number? [Yes/No]
- Do you want to research a specific topic first? [Yes/No]

[Interactive flow based on answers]

--- RESEARCH MODE (if selected) ---

1. CONTEXT
   -> Lachesis invokes context-template skill
   -> Build context.md (What to research, Why, Success Criteria)

2. RESEARCH
   -> Explorer investigates codebase
   -> Lachesis invokes research-template skill
   -> Creates research.md with findings, recommendations

3. COMPLETION
   -> Human decides: actionable ticket or knowledge captured

--- TICKET MODE ---

1. CONTEXT (Human + Lachesis agent)
   -> Lachesis invokes context-template skill
   -> Build context.md together
   -> Define What, Why, Acceptance Criteria

2. PLANNING
   -> Planner invokes plan-template skill
   -> Creates implementation-plan.md
   -> Creates native tasks via TaskCreate

3. REVIEW
   -> Code Reviewer invokes review-template skill
   -> Validates plan against context.md
   -> Uses TaskList to verify AC coverage
   -> Creates review-implementation.md

4. REVISION (if needed)
   -> Planner addresses review issues

5. EXECUTION (with mandatory review, max 3 cycles)
   For each task:
   -> Lachesis uses TaskUpdate (status: in_progress)
   -> Implementer executes
   -> Code Reviewer reviews (MANDATORY)
   -> If NEEDS_REVISION & cycles < 3: back to implementer
   -> If NEEDS_REVISION & cycles >= 3: human escalation
   -> If APPROVED: TaskUpdate (status: completed)

6. COMPLETION
   -> All acceptance criteria verified
```

## Session Structure

Sessions are identified by **ticket ID** (e.g., `ii-5092`):

```
.claude/loom/threads/
└── ii-5092/
    ├── context.md              # What, Why, AC
    ├── research.md             # Research findings (Research mode)
    ├── implementation-plan.md  # How (Ticket mode)
    ├── review-implementation.md
    └── review-task-001.md
```

Tasks are managed via native task system (not in files).

## Human Commands

| Command | Purpose |
|---------|---------|
| `/loom:weave` | Weave a new thread - interactive workflow initialization |
| `/loom:status` | Display current state, task progress |
| `/loom:approve` | Approve task, mark complete, move to next |
| `/loom:reject "feedback"` | Reject with feedback, increment cycle |
| `/loom:skip "reason"` | Skip blocked task, move to next |

## Usage Example

Start Claude Code and work with agents:

```
Human: I need to work on ii-5092 - adding rate limiting

Lachesis: I'll coordinate this with Loom.

[Invokes context-template skill]
[Creates .claude/loom/threads/ii-5092/]

Let's define the context:
- What: Rate limiting middleware for the REST API
- Why: Prevent abuse and ensure fair usage
- Acceptance criteria:
  1. Requests limited to 100/min per API key
  2. Returns 429 with retry-after header
  3. Limits configurable per endpoint

[Writes context.md]

Now delegating to planner agent...

[Uses Task tool with subagent_type: "planner"]

Planner:
[Invokes plan-template skill]
[Reads context.md]
[Writes implementation-plan.md]
[Creates native tasks via TaskCreate]

Lachesis: Delegating to code-reviewer for review...

[Uses Task tool with subagent_type: "code-reviewer"]

Code Reviewer:
[Invokes review-template skill]
[Reviews plan against context.md]
[Uses TaskList to verify AC coverage]
[Writes review-implementation.md - APPROVED]

Lachesis: Starting execution. 5 tasks found.

[For each task:
  - Uses TaskUpdate to mark in_progress
  - Delegates to implementer
  - MANDATORY: Delegates to code-reviewer
  - If approved: TaskUpdate to mark completed
  - If needs revision: max 3 cycles, then human escalation]

ii-5092 complete. All acceptance criteria delivered.
```

## Meta-Learning

Every review includes a "Meta-Learning Notes" section:

```markdown
## Meta-Learning Notes

- **Pattern:** Missing error handling for Redis failures
- **Root Cause:** Task criteria didn't specify failure scenarios
- **Prevention:** Add "handles dependency failures" to task template
```

Analyze `.claude/loom/threads/*/review-*.md` over time to improve your process.

## Plugin Structure

```
loom/
├── .claude-plugin/
│   └── plugin.json           # Plugin manifest
├── agents/
│   ├── lachesis.md           # Coordinator (Opus) - The Measurer
│   ├── planner.md            # Architect (Sonnet) - Clotho
│   ├── code-reviewer.md      # Reviewer (Sonnet) - Atropos
│   ├── implementer.md        # Developer (Sonnet) - Clotho
│   └── explorer.md           # Scout (Haiku)
├── skills/
│   ├── weave/                # Entry point - weave a new thread
│   ├── context-template/     # context.md template
│   ├── plan-template/        # implementation-plan.md template
│   ├── review-template/      # review files template
│   ├── research-template/    # research.md template
│   ├── status/               # Status display
│   ├── approve/              # Task approval
│   ├── reject/               # Task rejection
│   └── skip/                 # Task skip
├── hooks/
│   └── hooks.json            # Lifecycle hooks with guardrails
└── README.md
```

## License

MIT
