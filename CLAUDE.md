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

---

## Source Layer (`src/`)

Beyond the markdown harness (`agents/`, `skills/`, `commands/`, `hooks/`), this plugin ships a **JavaScript implementation layer** under `src/` (~47 modules): the ontology engine (`ontology-engine.js`, `ontology-scanner.js`), analytics (`analytics.js`, `collaboration-score.js`), the dashboard (`src/dashboard/` — an htmx + SSE web app), and supporting tools (`mechanical-check.js`, `slop-cleaner.js`, `token-estimator.js`, `cost-estimator.js`, …).

- **Run the dashboard**: `npm run dashboard` (stop with `npm run dashboard:stop`)
- **Test the JS layer**: `./run-tests.sh static` for static validation; `npm run test:dashboard` for the dashboard `node --test` suite; the top-level `tests/*.test.js` suites also run under `node --test`.
- **Markdown vs JS split**: `/team-shinchan:verify-implementation` validates the *markdown* harness surface; `run-tests.sh` + the `tests/` `node --test` suites validate the *JS* layer. (The `manage-skills` skill is intentionally scoped to the markdown surface only.)
