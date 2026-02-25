# Changelog

All notable changes to Team-Shinchan will be documented in this file.

## [4.1.0] - 2026-02-25

### New Features
- **Project Ontology System**: Auto-build knowledge graph of any codebase at session start
  - `src/ontology-engine.js`: Core CRUD + query + merge engine (entities, relations, impact analysis, health score, Mermaid diagrams, evolution tracking)
  - `src/ontology-scanner.js`: Regex-based code scanner detecting 7 entity types (Module, Component, DomainConcept, API, DataModel, Configuration, TestSuite) and 3 relation types (PART_OF, DEPENDS_ON, TESTED_BY)
  - `hooks/ontology-auto-build.md`: SessionStart hook — auto-init + scan when no ontology exists, incremental update via git diff when it does
  - **Auto-Build First**: Users never need to run ontology commands — it builds silently on first session
- **Ontology Skill/Command**: `/team-shinchan:ontology` — show, query, add, remove, scan, gen-kb, diagram
- **Impact Analysis Skill/Command**: `/team-shinchan:impact-analysis` — cascade dependency analysis with risk assessment (HIGH/MEDIUM/LOW)
- **Health Score**: Architecture health 0-100 (connectivity, test coverage, documentation, modularity)
- **Mermaid Diagrams**: Auto-generate module dependency, domain concept, and entity neighborhood diagrams
- **Evolution Tracking**: Ontology change history analysis from JSONL logs

### Agent Integration
- **Shinnosuke**: Ontology-aware routing — queries impact scope before delegation
- **Nene**: DEPENDS_ON depth-2 traversal for impact-based phase splitting
- **Action Kamen**: FOLLOWS_PATTERN and DECIDED_BY compliance checks
- **Misae**: Reverse DEPENDS_ON fan-in analysis for risk assessment
- **Shiro**: DomainConcept → IMPLEMENTS mapping for instant file discovery
- **Midori**: Decision entity auto-capture after debate conclusions

### Improvements
- **load-kb**: Now loads ontology summary + auto-refreshes kb-summary.md when stale
- **change-tracker**: Ontology update reminder on file modifications
- **Ontology Integrity Validator**: 7-check data validation (ID uniqueness, type validity, reference integrity, orphan detection)

### Component Counts
- 40 skills, 40 commands, 13 hooks, 19 validators, 7 src scripts, 15 agents

## [4.0.0] - 2026-02-25

### Repositioning
- **Agent Harness**: Repositioned from "AI development team" to "Agent Harness for Claude Code"
- **Harness Engineering Principles**: README structured around 5 principles — Context Engineering, Architectural Constraints, Guardrails & Quality Gates, Feedback Loops, State Management
- **Documentation**: README, Getting Started, Workflow Guide updated with Harness terminology

### New Features
- **Analytics** (`src/analytics.js`): Trace ID generation, event tracking, agent performance metrics
- **Analytics Skill/Command**: `/team-shinchan:analytics` for viewing trace data and agent metrics
- **Budget Guard** (`hooks/budget-guard.md`): Token budget enforcement with 80% warning and 100% hard stop
- **Budget Skill/Command**: `/team-shinchan:budget` for checking token budget status
- **Harness Lint** (`src/harness-lint.js`): Static analysis of plugin structure — detects orphaned skills, broken refs, stale configs
- **Lint-Harness Skill/Command**: `/team-shinchan:lint-harness` for running harness structural checks
- **Eval System** (`src/eval-schema.js`, `src/regression-detect.js`): Schema validation and regression detection for agent outputs
- **Eval Skill/Command**: `/team-shinchan:eval` for running eval checks
- **AGENTS.md**: Auto-generated agent map documenting all 15 agents with roles, layers, tools, and capabilities
- **Agent Map Generator** (`src/gen-agents-map.js`): Script to regenerate AGENTS.md from agent source files
- **Layer Map** (`agents/_shared/layer-map.json`): Defines 5 architectural layers (Orchestration, Execution, Specialist, Advisory, Utility)
- **Layer Enforcement Validator**: Ensures agents operate within their designated layer
- **Agents-Map Validator**: Validates AGENTS.md stays in sync with agent source files

### Improvements
- **Session Wrap**: Enhanced with Work Tracker integration for auto-summary on session end
- **load-kb**: Alerts when knowledge base is stale or missing
- **Auto-Retrospective**: Now includes eval data in retrospective analysis
- **Terminology**: Harness Engineering subtitles added to workflow-guard ("Hard Guardrail Matrix") and self-check ("Quality Gate")

### Component Counts
- 38 skills, 38 commands, 12 hooks, 19 validators, 5 src scripts, 15 agents, 4 rule categories (54 rules)

## [3.12.0] - 2026-02-24

### Removed
- **Dashboard**: Deleted `dashboard/` folder, `docs/dashboard-guide.md`, MCP server entry in `.mcp.json`
- **send-event.sh**: Replaced HTTP-based event forwarding with local JSONL logging

### Added
- **write-tracker.sh**: Zero-dependency JSONL event logger — appends to `.shinchan-docs/work-tracker.jsonl`
  - Event mapping: SubagentStart/Stop, PostToolUse (delegation, file_change, tool_use), UserPromptSubmit, Stop, SessionStart/End
  - Auto-rotation: archives to `.jsonl.gz` when file exceeds 10,000 lines
  - Session ID management via `.shinchan-docs/.session-id`
- **work-log skill**: `/team-shinchan:work-log` — query JSONL events with `--last N`, `--agent`, `--type`, `--session` filters
- **work-log command**: `commands/work-log.md` for skill-command parity

### Changed
- **hooks.json**: All 9 `send-event.sh` references replaced with `write-tracker.sh`
- **README.md**: Dashboard sections replaced with Work Tracker documentation
- **skills/status/SKILL.md**: Removed "dashboard" terminology

## [3.11.0] - 2026-02-24

### Added
- **Agent Memory**: Persistent cross-session memory for 5 agents — actionkamen(`project`), hiroshi(`project`), kazama(`project`), bo(`local`), masumi(`user`)
- **Skills Preloading**: 7 agents now auto-load domain knowledge via `skills:` frontmatter (bo, aichan, bunta, masao, actionkamen, hiroshi, kazama)
- **maxTurns Guard**: Execution turn limits for 11 agents (10~50 based on role complexity) to prevent runaway loops
- **permissionMode**: Role-based permission modes — `plan` for read-only agents, `acceptEdits` for code editors
- **Worktree Isolation**: Kazama runs in isolated git worktree for safe large-scale refactoring
- **Self-Evolving Agents**: Action Kamen and Hiroshi now have Learnings sections that accumulate insights across sessions

### Changed
- All agent frontmatter now leverages Claude Code v2.1.x features (memory, skills, maxTurns, permissionMode, isolation)
- Memory usage instructions added to agent prompts for actionkamen, hiroshi, kazama, bo, masumi

## [3.10.0] - 2026-02-23

### Fixed (Critical — Plugin Portability)
- **Validator Paths**: All verify-* skills now use `cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/...` so validators run correctly from any host project
- **Midori Write Tool**: Added `Write` to Midori's tool list — debate decisions can now be recorded
- **Debate Decisions Storage**: Moved from `agents/_shared/debate-decisions.md` (plugin dir) to `.shinchan-docs/debate-decisions.md` (project-local)
- **Nene Task Mismatch**: Removed `Task` from IMMUTABLE RULES (not in tools list), fixed misleading "READ-ONLY" label
- **Help Skill Completeness**: Expanded from 14 to all 32 skills, added Midori to agent table
- **Resume Command**: Fixed broken YAML frontmatter (was wrapped in code block, preventing parsing)
- **Research Skill**: Added missing input validation (was the only task-dispatching skill without it)

### Fixed (High Priority)
- **Path Consistency**: Unified `.team-shinchan/` → `.shinchan-docs/` across README, DOGFOODING
- **Dead References**: Removed `PART 13 in CLAUDE.md` references in workflow-guide (CLAUDE.md reduced to 16 lines)
- **Outdated Troubleshooting**: Removed CLAUDE.md loading advice from getting-started.md (no longer required)
- **Dashboard File Events**: Registered `send-event.sh` for PostToolUse Edit/Write — file changes now appear in dashboard

### Changed
- **Dashboard Metrics**: 7 real-time metrics (completed, active, pending, phases, elapsed, tokens, version)
- **SSE Reconnect**: Health check + auto-recovery for dashboard stability
- **Token Optimization**: Reduced overhead across hooks, agents, shared resources, and skills
- **Workflow Connectivity**: Improved skill-to-skill stage transitions

### Added
- **Kazama Guardrails**: Bash Restrictions + Testing Protocol sections (matching other execution agents)
- **Agent Examples**: Second `<example>` blocks for Himawari, Misae, Shinnosuke (routing accuracy)
- **Validator Count Sync**: TEST_SUMMARY.md (13→17), manage-skills (14→17 validators)

## [3.9.0] - 2026-02-22

### Changed
- **Plugin Standalone Operation**: Migrated all orchestration rules from CLAUDE.md into plugin files
  - `shinnosuke-orchestrate.md`: Added Agent Priority, Skill→Agent Mapping (20 skills), Work Classification (Lite/Full)
  - `shinnosuke.md`: Added CONDUCTOR role declaration, Core Rules (6), Completion Checklist, Document Management
  - `output-formats.md`: Expanded Agent Team table with Role/Model/Layer columns (15 agents)
  - `CLAUDE.md`: Reduced from 232→16 lines (repo-specific notes only)
- **Self-Check Enhancement**: Added 5th principle "Elegance Check" to self-check.md
- **Quick Fix Path Expansion**: Clear bug fixes (≤3 files, no design decisions) now use Lite Mode

### Added
- **Correction Capture Hook**: `hooks/correction-capture.md` auto-detects user corrections (KR/EN/JP) and records learnings
- **Dashboard Session Isolation**: Per-session state management, SSE broadcast filtering, SessionSelector component
- **Vite Dev Proxy**: `server.proxy` in vite.config.ts for SSE real-time updates in dev mode

### Fixed
- **SSE Real-time Updates**: Vite dev proxy with `timeout: 0` resolves SSE long-polling disconnects
- **gracefulShutdown**: Fixed `sseClients[i].res.end()` (was calling `.end()` on wrong object)

## [3.8.0] - 2026-02-22

### Added
- **Dashboard Document Viewer**: 4th tab with markdown rendering and real-time doc_updated SSE
- **Session Persistence**: localStorage save/restore with previous session display
- **Progress Enhancement**: Phase-level progress bars, metrics widget, activity normalization
- **Extended Event Pipeline**: 4 new event types (file_change, plan_step, review_result, progress_update)

### Changed
- **Frontend Split**: Monolithic index.html (2618 lines) → index.html (213) + styles.css (1584) + app.js (1849)
- **server.mjs**: Added `/api/docs` endpoints, `parseProgressMd()` phase-level parsing, session auto-save

### Fixed
- **Hook Registration** (critical): Added `"hooks": "./hooks/hooks.json"` to plugin.json — hooks were never loaded by Claude Code
- **SSE Port Discovery**: send-event.sh now searches `$PWD` before `$PLUGIN_ROOT` for `.dashboard-port`
- **SSE Client Bugs**: Removed undefined `updateTimeline()` call, fixed `agent_status` event type mapping

## [3.7.0] - 2026-02-22

### Added
- **32 Command Files**: Added 16 new command `.md` files to complete coverage of all skills
  - `commands/implement.md`, `commands/frontend.md`, `commands/backend.md`, `commands/devops.md`
  - `commands/review.md`, `commands/requirements.md`, `commands/vision.md`
  - `commands/bigproject.md`, `commands/manage-skills.md`
  - `commands/verify-agents.md`, `commands/verify-budget.md`, `commands/verify-consistency.md`
  - `commands/verify-implementation.md`, `commands/verify-memory.md`, `commands/verify-skills.md`, `commands/verify-workflow.md`
- **3 New Validators**: `hook-registration.js`, `skill-command-parity.js`, `version-consistency.js` (14 → 17 total)
- **5 Hook Registrations**: workflow-guard, auto-retrospective, load-kb, shinnosuke-orchestrate, auto-verify added to hooks.json

### Changed
- **Agent Prompt Quality**: 5 agent files enhanced with domain-specific guidelines
  - aichan.md: WCAG 2.1 AA checklist, component patterns, performance standards
  - bunta.md: API design conventions, database rules, security patterns
  - masao.md: CI/CD principles, Dockerfile best practices, IaC guidelines
  - misae.md: STRIDE security framework, scalability checklist, requirement elicitation
  - himawari.md: PROGRESS.md ownership rules, phase lifecycle, checkpoint protocol
- **install.sh**: Post-install verification and component count summary

### Fixed
- **Dashboard DOCS_DIR**: Resolved to host project instead of plugin cache (shows actual workflow data)
- README.md version badge updated from 3.3.0 to 3.7.0
- README.md debate skill now correctly shows Midori (not Shinnosuke) as moderator
- README.md Commands table expanded from 14 to 32 commands
- README.md Skills table expanded to include all 15 specialist skill mappings
- COVERAGE.md updated to reflect 17 static validators

## [3.6.0] - 2026-02-22

### Changed
- **Token Budget Optimization**: 6 oversized files compressed (total -50%)
  - midori.md -56%, shinnosuke.md -58%, nene.md -33%
  - workflow-guard.md -65%, debate/SKILL.md -44%, resume/SKILL.md -32%
- **Verbose Communication**: Agents now report more frequently
  - output-formats.md: 6 event-based reporting rules + 5 communication rules
  - CLAUDE.md: "Be verbose and communicative" progress reporting
  - bo.md: "Never silently chain 3+ tool calls"
- **Interactive Interview**: Nene now uses AskUserQuestion for requirements
  - Added AskUserQuestion to Nene's tools
  - Interactive Interview section with single/multi-select patterns

### Fixed
- CLAUDE.md tone gaps (personality, progress reporting, error tiers)
- Dashboard SSE: added `connected` and `activity` event listeners

## [3.5.0] - 2026-02-22

### Added
- **Proactive Coding Hooks** (PreToolUse/PostToolUse prompt hooks)
  - `hooks/coding-reminder.md` - Injects Karpathy 4 principles before Edit/Write
  - `hooks/change-tracker.md` - Reminds agents to log changes in PROGRESS.md
- **Self-Check System** for all execution agents
  - `agents/_shared/self-check.md` - Completion checklist (Principle Compliance, Quality Gate, Reporting)
  - Applied to Bo, Aichan, Bunta, Masao, Kazama
- **Karpathy Coding Principles** integrated into agent system
  - `agents/_shared/coding-principles.md` - Think Before Coding, Simplicity First, Surgical Changes, Goal-Driven
  - `EXAMPLES.md` - 4 scenarios with Do/Don't examples and Anti-Pattern table
  - Action Kamen review checklist extended with principle-based checks
- **Rationale Structure** in PROGRESS.md template (mandatory Why/Alternatives/Trade-offs)
- **Step Splitting Rules** for large Phases (4+ files → Step N-M breakdown)
- **Standard Output Rationale** section in output-formats.md

### Changed
- CLAUDE.md Communication Format: emoji table inlined for cross-project plugin usage
- `hooks/hooks.json`: added PreToolUse and PostToolUse prompt hooks
- `agents/nene.md`: PROGRESS.md template guide with Rationale and Step rules
- `agents/shinnosuke.md`: Step Splitting delegation guide
- `docs/workflow-guide.md`: Quality Checklist and Phase Rationale Pattern

### Fixed
- Dashboard zombie process cleanup (`killZombieProcesses()`)
- Dashboard port file write-back verification
- `checkExistingServer()` response body validation
- `stdin.on('end')` now calls `gracefulShutdown()` instead of `process.exit(0)`

## [3.4.0] - 2026-02-20

### Added
- Dashboard auto-open browser on server start (`openBrowser()`, `DASHBOARD_AUTO_OPEN` env var)
- Dashboard URL notification in workflow entry skills

### Changed
- `marketplace.json` version bump to 3.4.0

## [3.3.0] - 2026-02-14

### Added
- 6 new verify-* skills wrapping existing JS validators
  - `verify-agents` (agent-schema, shared-refs)
  - `verify-skills` (skill-schema, skill-format, input-validation)
  - `verify-consistency` (cross-refs, stage-matrix, debate-consistency)
  - `verify-workflow` (workflow-state-schema, error-handling, part-numbering, quick-fix-path)
  - `verify-memory` (memory-system)
  - `verify-budget` (token-budget)

### Changed
- Redesigned `manage-skills` for markdown plugin structure (13KB → 3KB)
- Redesigned `verify-implementation` with actual verify-* skills and fast-path (8.9KB → 4KB)
- Updated `cross-refs.js` KNOWN_SKILLS with new verify-* skills

## [3.2.0] - 2026-02-14

### Added
- **Self-Evolving Verification System** (integrated from kimoring-ai-skills)
  - `skills/verify-implementation/SKILL.md` - orchestrates all verify-* skills sequentially
  - `skills/manage-skills/SKILL.md` - auto-generates/updates verify-* skills based on changes
  - `hooks/auto-verify.md` - auto-triggers verification in Completion stage
- New completion gate: `verify-implementation passed`

### Changed
- CLAUDE.md PART 2 & 11 - added verify-implementation and manage-skills
- CLAUDE.md PART 12 - added verify-implementation to completion checklist
- `docs/workflow-guide.md` - Stage 4 now includes automatic verification workflow

## [3.1.0] - 2026-02-08

### Added
- Knowledge Base session injection system (`.team-shinchan/kb-summary.md`)
- `hooks/load-kb.md` - unified session-start hook with KB + learnings + workflow detection
- `skills/resume/SKILL.md` + `commands/resume.md` - interrupted workflow resume skill
- Step 0 in `/start`: pause active workflows before creating new ones

### Changed
- `skills/start/SKILL.md`, `commands/start.md` - added Step 0 (pause active workflows)
- CLAUDE.md PART 2 & 11 - added `/resume` skill references
- `tests/validate/cross-refs.js`, `memory-system.js` - updated references for load-kb

### Removed
- `hooks/load-learnings.md` (merged into `load-kb.md`)

## [3.0.0] - 2026-02-07

### API Freeze

**v3.0.0 stabilizes the following interfaces:**

- **15 Agents**: shinnosuke, himawari, midori, bo, kazama, aichan, bunta, masao, hiroshi, nene, misae, actionkamen, shiro, masumi, ume
- **15 Skills**: start, autopilot, ralph, ultrawork, plan, analyze, deepsearch, debate, orchestrate, status, learn, memories, forget, help, resume
- **4-Stage Workflow**: Requirements → Planning → Execution → Completion
- **Debate System**: All debates via Midori, panel selection by topic
- **Memory System**: learn/memories/forget + auto-load at session start

### Added (Month 4 - Quality 97.6 → 99+)
- E2E workflow tests: 5 scenarios, 11 test cases with promptfoo
- Quick Fix Path: explicit criteria + mandatory Action Kamen review
- Dogfooding infrastructure: workflow metrics tracking
- 2 new static validators: quick-fix-path, memory-system (total: 13)
- 8 new promptfoo agent tests: Kazama, Ume, Aichan, Bunta, quick fix, stage transition (total: 25)
- E2E test job in GitHub Actions CI

### Changed (Month 4)
- `/start` simplified: 6 steps → 2 steps, WORKFLOW_STATE.yaml 120 → 15 lines
- CLAUDE.md: 654 → 447 lines (TOC, extracted workflow guide, compressed sections)
- midori.md: 610 → 386 lines (condensed debate output, removed duplicate formats)
- shinnosuke.md: 515 → 338 lines (extracted stage details, compact delegation rules)
- output-formats.md: 249 → 78 lines (removed verbose examples)
- Debate routing strengthened: "NEVER conduct debate directly" in shinnosuke.md

### Fixed (Month 4)
- Nene validator false positive: removed `Edit|Write` from forbidden pattern
- Quick fix path: Action Kamen review now explicitly MANDATORY (was ambiguous)

## [2.13.0] - 2026-02-07

### Added (Month 3 - Quality 82 → 97.6)
- CI/CD: promptfoo test job in GitHub Actions (PR-only, graceful API key skip)
- Debate templates: architecture, security, performance, tech-selection
- Debate decision memory system (debate-decisions.md + decision-log.md with 8 entries)
- `/status` skill for workflow status dashboard
- MIGRATION_GUIDE.md for contributor onboarding
- Performance profiling script (tests/validate/performance-profile.js)
- Validator coverage matrix (tests/validate/COVERAGE.md)
- Extracted diagrams to docs/diagrams/ (workflow-stages, debate-process)
- 4 new promptfoo tests (Misae, Masumi, Midori templates, status awareness) → 17 total
- Validator timing output in summary table

### Changed (Month 3)
- CLAUDE.md optimized: TOC added, diagrams extracted, -83 lines net reduction (737→654)
- Midori: pre-debate decision check + post-debate decision recording
- workflow-guard.md: stage-specific block messages with transition requirements
- CI renamed from "Static Validation" to "CI Validation" with 2 independent jobs

### Fixed (Month 2)
- Stage-Tool Matrix unified across 3 files (CLAUDE.md, shinnosuke.md, workflow-guard.md) - 9 tools × 4 stages
- Debate system unified under Midori (removed "Direct Orchestration" contradictions)
- Error handling framework added (PART 13 in CLAUDE.md)
- Input validation added to all 8 user-invocable skills
- ~697 lines of code duplication removed via shared output-formats.md
- fix_and_retry() undefined references replaced with concrete procedures
- WORKFLOW_STATE.yaml template expanded with all 4 stages and transition gates
- CLAUDE.md PART 2 vs PART 6 duplication consolidated

### Added (Month 2)
- agents/_shared/output-formats.md - centralized output format definitions
- 5 new static validators (stage-matrix, debate-consistency, workflow-state-schema, skill-format, shared-refs)
- 6 new promptfoo agent behavior tests
- Error handling section in CLAUDE.md (PART 13)
- Debate failure recovery in midori.md (quorum rules)
- Corrupted state fallback in workflow-guard.md
- Midori lightweight mode for simple debates

### Changed (Month 2)
- All 15 agents now reference shared output formats
- Debate orchestration exclusively through Midori
- Workflow state management enhanced with validation rules
- Test coverage increased to 11 static validators

## [2.12.0] - 2026-02-06

### Added
- Initial multi-agent workflow system
- 15 agents across 5 layers (Orchestration, Execution, Specialist, Advisory, Utility)
- 13 skills for workflow automation
- 4-stage workflow (Requirements, Planning, Execution, Completion)
- Integrated documentation system (.shinchan-docs/)
- Debate system for design decisions
- WORKFLOW_STATE.yaml for state management
- Action Kamen verification layer
- Real-time progress reporting
- Agent delegation via Task tool
- Memory system for learning patterns
