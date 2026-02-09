## Quick Reference

| What | Where |
|------|-------|
| Workflow documentation | `loom/WORKFLOW.md` |

## Architecture: Skills-First + Native Tasks

Loom uses **skills and native Claude Code tools** instead of MCP servers:

- **No external dependencies** - No npm packages required
- **Native tools** - Agents use Read, Write, Edit, Glob, Grep, Task, Skill
- **Template skills** - Provide exact artifact formats
- **Native task system** - TaskCreate, TaskList, TaskGet, TaskUpdate for task management


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
## Key Design Principles

1. **Skills-First** - Template skills enforce artifact structure
2. **Native Tools** - No MCP dependencies, uses Claude Code built-ins
3. **Native Tasks** - Uses TaskCreate/TaskList/TaskUpdate for task management
4. **MAIN AGENT Decides WHAT and WHO** - Coordination only, never implementation
5. **Context Anchors Everything** - All decisions trace to context.md
6. **Every AC Needs a Task** - Golden rule: no orphan acceptance criteria
7. **Explicit Delegation** - Clear handoffs between agents
8. **Artifact Trail** - Everything documented for audit and meta-learning

## Documentation References

- **Detailed Workflow**: See `loom/WORKFLOW.md` (includes Mermaid diagrams)
- **Agent Specifications**: See individual files in `loom/agents/`
- **Template Skills**: See individual files in `loom/skills/*/SKILL.md`

## Common Tasks

### Adding a New Agent

1. Create `loom/agents/{agent-name}.md` with frontmatter
2. Define tools the agent can use (native Claude Code tools)
4. Document in `loom/README.md`

### Adding a New Skill

1. Create `loom/skills/{skill-name}/SKILL.md`
2. Add YAML frontmatter with name, description
3. Include template with XML structure
4. Document validation rules and next steps

