# Loom - Claude Code Multi-Agent Orchestration

## Project Overview

Loom is a **Claude Code multi-agent orchestration plugin** that coordinates specialized AI agents to deliver complex features through a structured **Context → Plan → Review → Execute** workflow.

> **Named after the Moirai** (the three Fates of Greek mythology), this plugin orchestrates the thread of development through Lachesis's measured direction.

## Quick Reference

| What | Where |
|------|-------|
| Plugin manifest | `loom/.claude-plugin/plugin.json` |
| Agent definitions | `loom/agents/*.md` |
| Skills (templates) | `loom/skills/*/SKILL.md` |
| Hooks (guardrails) | `loom/hooks/hooks.json` |
| Workflow documentation | `loom/WORKFLOW.md` |
| Installation guide | `loom/README.md` |

## Architecture: Skills-First + Native Tasks

Loom uses **skills and native Claude Code tools** instead of MCP servers:

- **No external dependencies** - No npm packages required
- **Native tools** - Agents use Read, Write, Edit, Glob, Grep, Task, Skill
- **Template skills** - Provide exact artifact formats
- **Native task system** - TaskCreate, TaskList, TaskGet, TaskUpdate for task management
- **Hook guardrails** - Command hooks enforce workflow rules

## Project Structure

```
lachesis/
├── CLAUDE.md                                     # This file
└── loom/                                         # Main plugin
    ├── .claude-plugin/plugin.json                # Plugin manifest
    ├── README.md                                 # Usage documentation
    ├── WORKFLOW.md                               # Detailed workflow docs
    ├── agents/                                   # Agent definitions
    │   ├── lachesis.md                           # Coordinator (Opus)
    │   ├── planner.md                            # Architect (Sonnet)
    │   ├── code-reviewer.md                      # Reviewer (Sonnet)
    │   ├── implementer.md                        # Developer (Sonnet)
    │   └── explorer.md                           # Scout (Haiku)
    ├── skills/                                   # Template skills
    │   ├── loom-workflow/SKILL.md                # Master workflow
    │   ├── context-template/SKILL.md             # context.md template
    │   ├── plan-template/SKILL.md                # implementation-plan.md template
    │   ├── review-template/SKILL.md              # review files template
    │   ├── research-template/SKILL.md            # research.md template
    │   ├── loom-status/SKILL.md                  # Status display command
    │   ├── loom-approve/SKILL.md                 # Task approval command
    │   ├── loom-reject/SKILL.md                  # Task rejection command
    │   └── loom-skip/SKILL.md                    # Task skip command
    └── hooks/                                    # Hook guardrails
        ├── hooks.json                            # Hook definitions
        └── scripts/                              # Command hooks
            └── pre-tool-use/
                └── validate-write.js             # File precondition checks
```

## The Five Agents

See `loom/agents/` for full definitions. Each agent has specific responsibilities:

| Agent | Model | Role | Key Constraint |
|-------|-------|------|----------------|
| **Lachesis** | Opus | Coordinates workflow, defines context | **Never implements directly** |
| **Planner** | Sonnet | Creates implementation plans and native tasks | Maps every AC to tasks |
| **Code Reviewer** | Sonnet | Reviews plans and implementations | Assumes something is wrong |
| **Implementer** | Sonnet | Executes individual tasks | One task at a time |
| **Explorer** | Haiku | Fast codebase reconnaissance | Speed over depth |

## Skills System

Skills provide templates and enforce structure. Before writing any artifact, agents must invoke the corresponding skill:

| Artifact | Required Skill |
|----------|---------------|
| `context.md` | `context-template` |
| `implementation-plan.md` | `plan-template` |
| `review-*.md` | `review-template` |
| `research.md` | `research-template` |

**Note:** Tasks are managed using Claude Code's native task system (TaskCreate, TaskList, TaskGet, TaskUpdate) instead of a tasks.md file.

## Native Task Management

Loom uses Claude Code's native task system for all task tracking:

| Tool | Purpose |
|------|---------|
| `TaskCreate` | Planner creates tasks with metadata |
| `TaskList` | List all tasks with status |
| `TaskGet` | Get full task details |
| `TaskUpdate` | Update status and metadata |

### Task Metadata Schema

```json
{
  "loom_task_id": "TASK-001",
  "ticket_id": "II-5092",
  "delivers_ac": ["AC1", "AC2"],
  "agent": "implementer",
  "files": ["src/feature.ts"],
  "group": "Phase 1: Setup",
  "cycle_count": 0,
  "max_cycles": 3
}
```

## Workflow Phases

See `loom/WORKFLOW.md` for complete documentation with diagrams.

```
1. CONTEXT DEFINITION → context.md
2. PLANNING           → implementation-plan.md, native tasks via TaskCreate
3. REVIEW             → review-implementation.md (APPROVED/NEEDS_REVISION/REJECTED)
4. EXECUTION          → Code changes, review-task-NNN.md (MANDATORY per task)
                        Max 3 implementer↔code-reviewer cycles, then human escalation
5. COMPLETION         → Final review
```

## Human Commands

| Command | Purpose |
|---------|---------|
| `/loom-status` | Display current state, task progress |
| `/loom-approve` | Approve task, mark complete, move to next |
| `/loom-reject "feedback"` | Reject with feedback, increment cycle |
| `/loom-skip "reason"` | Skip blocked task, move to next |

## Development Guidelines

### Working with Agent Definitions

Agent files use YAML frontmatter followed by Markdown with XML structure:

```yaml
---
name: agent-name
description: Role description shown in UI
model: opus|sonnet|haiku
disallowedTools:
  - Bash
  - Task
---
```

**Conventions:**
- Agent names are lowercase with hyphens
- Tools are native Claude Code tools
- Use XML tags for structured instructions (e.g., `<golden-rules>`, `<workflow>`)

### Working with Skills

Skills go in `loom/skills/{skill-name}/SKILL.md`:

```yaml
---
name: skill-name
description: When this skill should be invoked
user-invocable: true
---
```

**Skill content structure:**
- Use XML tags for structure (e.g., `<template>`, `<guidelines>`, `<validation-rules>`)
- Include literal templates that agents copy
- Document preconditions and next steps

**Note:** `user-invocable: true` means users can invoke the skill directly via `/skill-name` or the Skill tool.

### Working with Hooks

Hooks defined in `loom/hooks/hooks.json`:

```json
{
  "hooks": {
    "SessionStart": [],
    "PreToolUse": [
      { "matcher": "Write", "hooks": [{ "type": "command", "command": "..." }] },
      { "matcher": "Task", "hooks": [{ "type": "prompt", "prompt": "..." }] }
    ],
    "PostToolUse": [],
    "Stop": [{ "hooks": [{ "type": "prompt", "prompt": "..." }] }]
  }
}
```

**Available hooks:**
- `SessionStart` - Load workflow rules at session start
- `PreToolUse` - Inject guardrails before specific tools (Write, Task)
- `PostToolUse` - Handle post-tool actions
- `Stop` - Session cleanup

**Enforcement Model:** Write uses `type: "command"` for hard enforcement via validate-write.js. Task uses `type: "prompt"` for advisory guidance.

### Session Artifact Formats

All artifacts are Markdown files in `.claude/loom/threads/{ticket-id}/`.

Tasks are managed via native task system with metadata for loom-specific fields.

## Testing the Plugin

1. **Create test marketplace:**
   ```bash
   mkdir -p ~/test-marketplace/loom
   cp -r loom/* ~/test-marketplace/loom/
   ```

2. **Add to Claude Code:**
   ```
   /plugin marketplace add ~/test-marketplace
   /plugin install loom
   ```

3. **Verify installation:**
   - Check agent availability in `/agents`
   - Verify skills load with `Skill(skill="loom-workflow")`

4. **Iterate:**
   ```
   /plugin uninstall loom
   # Make changes
   /plugin install loom
   ```

## Creating a Distribution Archive

```bash
cd /Users/Frank.vanEldijk/code/lachesis
zip -r loom.zip loom
```

## Key Design Principles

1. **Skills-First** - Template skills enforce artifact structure
2. **Native Tools** - No MCP dependencies, uses Claude Code built-ins
3. **Native Tasks** - Uses TaskCreate/TaskList/TaskUpdate for task management
4. **Lachesis Decides WHAT and WHO** - Coordination only, never implementation
5. **Context Anchors Everything** - All decisions trace to context.md
6. **Every AC Needs a Task** - Golden rule: no orphan acceptance criteria
7. **Explicit Delegation** - Clear handoffs between agents
8. **Artifact Trail** - Everything documented for audit and meta-learning

## Documentation References

- **Installation & Usage**: See `loom/README.md`
- **Detailed Workflow**: See `loom/WORKFLOW.md` (includes Mermaid diagrams)
- **Agent Specifications**: See individual files in `loom/agents/`
- **Template Skills**: See individual files in `loom/skills/*/SKILL.md`

## Common Tasks

### Adding a New Agent

1. Create `loom/agents/{agent-name}.md` with frontmatter
2. Define tools the agent can use (native Claude Code tools)
3. Add XML-structured instructions
4. Document in `loom/README.md`

### Adding a New Skill

1. Create `loom/skills/{skill-name}/SKILL.md`
2. Add YAML frontmatter with name, description
3. Include template with XML structure
4. Document validation rules and next steps

### Modifying Hook Guardrails

Edit `loom/hooks/hooks.json`:
- Use command hooks for hard enforcement
- Use prompt hooks for advisory guidance
- Keep prompts focused on rules and checklists

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Agent not showing | Verify frontmatter syntax, check `plugin.json` agents path |
| Skill not loading | Check skill directory structure, verify SKILL.md exists |
| Hooks not firing | Verify `hooks.json` syntax, check hook event names |
| Artifacts not created | Check ticket ID format (e.g., `PROJ-123`), verify write permissions |

## Version Information

- **Plugin Version**: 0.5.14
- **License**: MIT
- **Author**: Frank van Eldijk
