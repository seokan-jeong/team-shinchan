# Team-Shinchan Plugin

This repository is the source code for the **Team-Shinchan** Claude Code plugin.

All orchestration rules, agent routing, workflow definitions, and communication formats are defined within the plugin itself (agents/, hooks/, skills/). No project-level CLAUDE.md configuration is needed for the plugin to function.

---

## Repository-Specific Notes

- **Branch strategy**: `main` is the primary branch
- **Plugin docs**: `docs/` contains workflow guides and architecture documentation
- **Local data**: `.shinchan-docs/` stores workflow state, learnings, work tracker, and session data (gitignored)
- **Hooks**: `hooks/` contains event-driven automation (write-tracker.sh, workflow-guard, etc.)
- **Testing**: Use `/team-shinchan:verify-implementation` to run all validation checks
