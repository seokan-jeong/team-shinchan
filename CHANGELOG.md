# Changelog

## [4.34.1] - 2026-04-14

## [4.34.0] - 2026-04-14

## [4.33.0] - 2026-04-13

## [4.32.0] - 2026-04-10

### Changed
- **release-skill**: Moved from plugin skill (`skills/release/`) to project-local command (`.claude/commands/release.md`) — no longer exposed to plugin users

## [4.31.0] - 2026-04-10

### Added
- **release-plugin-cache-purge**: Release skill now purges old plugin version caches from `~/.claude/plugins/cache/` to prevent stale cache issues

## [4.30.0] - 2026-04-10

### Added
- **parallel-workflows**: Multiple workflows can now be `active` simultaneously — new workflows no longer force-pause existing ones
- **release-cache-clear**: Release skill now clears local caches (agent-context-cache, llm-scan-cache) after non-dry-run releases

### Fixed
- **completion-stage-skip**: Added explicit Phase Loop completion check that asks user before proceeding to Stage 4, preventing silent skipping of the completion stage

## [4.29.0] - 2026-04-10

### Added
- **figma-mcp-integration**: Ume, Aichan, Action Kamen agents now detect and use any available Figma MCP tool for precise design data extraction
- **figma-url-support**: design-review skill accepts Figma URLs directly, producing precision Design Specs with exact colors, typography, and spacing from the Figma API
- **precision-design-fidelity**: Action Kamen performs exact-value comparison (HEX, px) when Figma API data is available, with defined tolerance thresholds

### Changed
- **design-review**: Updated input validation and workflow to branch between Figma URL (API) and image file (visual analysis) paths
- **ume**: Added Figma URL detection, MCP tool invocation, and precision vs visual Design Spec comparison
- **aichan**: Added Figma URL Direct Access workflow for extracting exact design tokens before implementation

## [4.28.2] - 2026-04-08

### Fixed
- **workflow**: Added AK-BEFORE-USER rule to IMMUTABLE RULES in misae and shinnosuke agents to enforce AK review before user approval (ordering was lost during context compression)

## [4.28.1] - 2026-04-08

## [4.28.0] - 2026-04-08

### Added
- **prompt-injection-guard**: New PreToolUse hook scans Read targets for invisible Unicode, threat patterns, credential exfiltration, and hidden HTML
- **memory-context-fencing**: KB and learnings output wrapped in `<recalled-context>` XML tags to prevent model confusion with user input
- **debate-transcript-archiving**: Midori archives structured debate transcripts to `.shinchan-docs/debates/DECISION-{NNN}.json`
- **capabilities-routing**: Agent capability tags from `agent-capabilities-vocab.json` wired to `domain-router.json` as secondary routing signal
- **cost-estimator**: New `src/cost-estimator.js` utility for per-agent/per-turn API cost estimation with model pricing
- **smart-model-routing**: `recommendModel()` in `collaboration-score.js` classifies task complexity for haiku/sonnet/opus routing
- **compression-guide**: Pre-compact hook outputs iterative compression template with iteration counter for context preservation
- **cross-session-trends**: `computeTrends()` in `eval-metrics.js` for rolling-window agent performance analysis and regression detection
- **skill-self-improvement**: Masumi collects skill feedback during retrospective; new `/team-shinchan:skill-feedback` command
- **hook-wildcard-matcher**: New `src/hook-matcher.js` utility supports glob-style event pattern matching for hooks

### Changed
- **budget-guard**: Now shows per-turn cost estimation alongside token budget warnings
- **hooks.json**: Added `_meta` field with wildcard support documentation

## [4.27.0] - 2026-04-06

### Changed
- **autopilot**: Align pipeline with `/start` for full parity — added workflow expiry/archive/pause, DOC_ID generation, detailed WORKFLOW_STATE schema (ak_gate, interview), Ume visual analysis, and direct Misae invocation in auto-analyze mode

## [4.26.1] - 2026-04-06

### Fixed
- **deny-list regex bug**: `curl.*| bash` pattern was incorrectly blocking ALL commands containing "curl" due to unescaped `|` being treated as regex OR operator. Fixed to `curl.*\|\s*bash` to only block actual pipe-to-bash patterns.

## [4.26.0] - 2026-04-03

## [4.25.3] - 2026-04-03

### Fixed
- **CI**: Regenerate AGENTS.md to fix static-validation freshness check (masumi allowedTools sync)

## [4.25.2] - 2026-04-01

### Fixed
- **Misae Requirements Flow**: Enforce AK review before user approval — Misae was asking for user approval immediately after drafting REQUESTS.md, skipping the AK review step

## [4.25.1] - 2026-03-30

### Fixed
- **AK Review Gate Hardening**: AK review was being skipped at workflow stage transitions due to context compression and prompt drift. Defense-in-depth fix:
  - Promoted `AK-GATE` rule to first position in `agents/misae.md` IMMUTABLE RULES with hard-stop wording
  - Added top-level `## IMMUTABLE RULES` section + Rule 7 in `agents/shinnosuke.md`
  - Added actionable recovery instructions to `transition-gate.sh` error messages
  - Added `ak_gate` backfill step (Step 1.7) in `skills/resume/SKILL.md` for legacy workflows
  - Added AK-GATE regression tests in `tests/validate/agent-schema.js`

## [Unreleased]

## [4.25.0] - 2026-03-30

### Added
- **Doctor Diagnostic Skill**: `skills/doctor/SKILL.md` — full plugin health diagnostics covering agents, skills, hooks, validators, and workflow state.
- **AI Slop Cleaner**: `skills/simplify/SKILL.md` — reviews changed code for reuse, quality, and efficiency, then fixes issues found.
- **Keyword Router Help Section**: `skills/help/SKILL.md` — added keyword-based routing guidance to help users find the right skill faster.
- **Workflow Order Change**: AK spec review now runs before user approval step in the Phase Loop, ensuring quality gates are enforced earlier.
- **Interview UX with Numbered Options**: Misae interview turns now present options as numbered lists for clearer user interaction.

## [4.24.0] - 2026-03-29

### Added
- **Ambiguity Gate**: `hooks/transition-gate.sh` blocks requirements→planning when `clarity_score.overall < 0.8`. Legacy pass-through with warning. Sub-score tampering detection.
- **Mechanical Pre-Check**: `src/mechanical-check.js` validates document structure (AC, file refs, FR→AC mapping) at $0 cost before AK review. Integrated into misae and shinnosuke agents.
- **Stagnation Detection**: `src/stagnation-detector.js` tail-reads work-tracker JSONL for REPEAT_ERROR, OSCILLATION, AC_STALL patterns. Integrated into ralph and ultrawork skills.
- **Auto-Escalation**: `escalateModel()` in `src/collaboration-score.js` — haiku→sonnet→opus chain on failure. Integrated in micro-execute Step 3b retry loop.
- **Drift Check**: `src/drift-check.js` measures AC coverage ratio (0-100%) with exit codes 0/1/2. Integrated in shinnosuke Phase Loop step 3g.
- **Event Replay Resume**: `skills/resume/SKILL.md` Step 1.6 JSONL checkpoint scan with 32KB tail-read and per-workflow path isolation.
- **Clarity Scoring Rubric**: `agents/misae.md` Phase D — goal_clarity, constraint_clarity, success_criteria scoring per interview turn.

### Fixed
- **AK Gate Bypass**: `hooks/transition-gate.sh` checks only `yamlOnDisk` (not `combinedYaml`) for AK approval — closes injection bypass.
- **AK IMMUTABLE RULES**: Explicit prohibition against string-injecting approval records in misae and shinnosuke agents.
- **Tests**: TC-13/14 injection bypass, TC-15~18 ambiguity gate. 27/27 pass.

## [4.23.1] - 2026-03-26

### Fixed
- Sync README inventory counts with actual codebase (commands 50→49, validators 28→24, promptfoo 25→29)
- Add 8 undocumented commands to README table (design-review, micro-execute, systematic-debugging, etc.)
- Add ARCHITECTURE.md auto-generation mention to Harness Engineering section
- Sync TEST_SUMMARY.md and COVERAGE.md with current validator list

## [4.23.0] - 2026-03-25

### Added
- **Pre-compact handoff artifact** (BM): `hooks/pre-compact.sh` saves 5 handoff fields to `pre-compact-state.json`. HR-1 sensitive masking, HR-2 100KB size guard.
- **Resume handoff loading** (BM): `skills/resume/SKILL.md` Step 1.5 loads `pre-compact-state.json` with `[Handoff]` context header.
- **Sprint-Contract pattern** (BM): Nene `PLANNING_COMPLETE` → Shinnosuke mediates AK testability review → audit log. Nene Steps 1,5,6 + Shinnosuke Steps 2,4.
- **Spec Granularity Rules** (BM): `agents/nene.md` — Deliverable Anchor, Binary Verifiability, Command Evidence.
- **Skepticism Rules S1-S4** (BM): `agents/actionkamen.md` — Evidence Gate, Assumption Audit, Coverage Traceability, Regression Guard.
- **Test Execution Mode** (BM): `agents/actionkamen.md` — `run_tests: true/false` for test command execution as evidence.
- **eval-rubrics.json** (BM): `agents/_shared/eval-rubrics.json` — default/documentation/planning rubrics.
- **Assumption Audit** (BM): `src/harness-lint.js` `checkDrift()` — 4 structural checks in drift category.

## [4.22.0] - 2026-03-24

### Added
- **AK review gate for Requirements stage**: Misae triggers Action Kamen auto-review after user approval of REQUESTS.md. Hard block with max 2 auto-revise retries before user escalation.
- **AK review gate for Planning stage**: Shinnosuke triggers Action Kamen auto-review after user approval of PROGRESS.md. Same hard block + 2-retry loop with escalation.
- **WORKFLOW_STATE.yaml ak_gate schema**: New `ak_gate` section tracks review status, retry count, and rejection reasons per stage. Session-restart safe.
- **transition-gate.sh defense-in-depth**: Hard block checks for AK APPROVED history entries on requirements→planning and planning→execution transitions.
- **4 new test cases**: TC-11/11b (requirements gate), TC-12/12b (planning gate). TC-3, TC-4b updated for AK APPROVED compatibility.

## [4.21.0] - 2026-03-23

### Added
- **PreCompact hook** (BM): `hooks/pre-compact.sh` persists workflow state (doc_id, stage, phase, ts) to `.shinchan-docs/pre-compact-state.json` before context compaction. Registered in `hooks/hooks.json` as PreCompact event.
- **SubagentStart audit log** (BM): `hooks/write-tracker.sh` now records `spawned_by` field on `agent_start` events — reads `.current-agent` before overwriting to capture parent agent chain.
- **Path-scoped rules** (BM): `rules/path-rules.json` defines glob-pattern-based coding standards. `hooks/workflow-guard.sh` emits advisory output when Edit/Write targets a matched path. Custom `globToRegex()` handles `*`, `**`, `?` without external deps.
- **Project gap detection** (BM): `hooks/session-init.sh` Section 8 scans for README, test dirs, .gitignore, lock files, CI config at SessionStart. Advisory-only output, language-aware lock file check gated on `package.json`.
- **Team presets** (BM): `agents/_shared/team-presets.json` with 5 named agent combinations (fullstack, backend-api, quality, data-pipeline, security-audit). `skills/ultrawork/SKILL.md` Step 1.5 references preset lookup.
- **Workflow output templates** (BM): `agents/_shared/templates/` with `REQUESTS.md.tpl`, `PROGRESS.md.tpl`, `RETROSPECTIVE.md.tpl` using `{{PLACEHOLDER}}` syntax. Referenced by misae, nene, masumi agents.
- **HUD git branch + test status** (BM): `src/statusline/index.js` adds `readGitBranch()` (file-read only, no subprocess) and `readTestStatus()`. Displays `branch:NAME` and `T:ok`/`T:--` on Line 1.

### Fixed
- **comment-checker.sh permissions**: Added missing executable permission (`chmod +x`)

## [4.20.0] - 2026-03-23

### Added
- **Subagent model tier selection** (BM): `collaboration-score.js` now outputs `model_tier` field (haiku/sonnet/opus) based on complexity score. `micro-execute/SKILL.md` Step 2.5 uses it for dynamic implementer model selection. Reviewers remain opus.
- **Skill description "Use when" pattern** (BM): `skill-format.js` warns when description doesn't start with "Use when". All 50 skills unified to trigger-focused descriptions.
- **Skill word count validator** (BM): `skill-schema.js` checks description (≤20 words) and body (200-500 words) with WARNING/NOTICE levels. Also fixed subdirectory traversal bug (was scanning 0 skills).
- **Writing-skills TDD meta-skill** (BM): `skills/writing-skills/SKILL.md` — 4-step process (trigger scenarios → expected behavior → implement → pressure validation) for creating quality skills.
- **Cursor plugin support** (BM): `.cursor-plugin/cursor-rules.md` adapts 4-stage workflow as Cursor rules. `.cursor-plugin/README.md` with installation guide.
- **Branch completion 4-option** (BM): Stage 4 Step 4.5 — merge locally / create PR / keep for later / discard options after Action Kamen approval.
- **Worktree first-class support** (BM): Stage 3 Step 3.0 offers optional worktree isolation with `.shinchan-worktrees/{DOC_ID}/` path, dependency install, and baseline test verification.

### Fixed
- **workflow-guard deadlock** (BM): `.shinchan-docs/` paths now allowed for Edit/Write in all stages (workflow metadata ≠ source code). Previously caused planning→execution transition deadlock.
- **transition-gate AC regex** (BM): Now accepts `FR-XX`, `NFR`, `**AC**:` formats in addition to `AC-XX`.
- **skill-schema.js traversal**: Was scanning `skills/*.md` (0 files found) instead of `skills/*/SKILL.md` (50 files).

## [4.19.0] - 2026-03-23

### Added
- **Workflow auto-expiry**: Active workflows inactive for N days (default 7) are automatically expired on `/start`, eliminating stale paused notifications
- **Archive system**: Expired workflows moved to `.shinchan-docs/archived/YYYY-MM/` for clean folder structure
- **Configurable expiry**: `workflow_expiry_days` setting in plugin.json (project override via `.shinchan-config.yaml`, `0` to disable)
- **Archive-safe guards**: `workflow-guard.sh` and `session-init.sh` exclude archived paths (defense in depth)
- **Resume from archive**: `/resume` scans archived folders and supports unarchive flow

## [4.18.0] - 2026-03-19

### Added
- **Domain-aware `/implement` routing** (BM): `domain-router.json` single source of truth for 4 domains (frontend→Aichan, backend→Bunta, devops→Masao, general→Bo). `/implement` skill auto-detects domain from file extensions, keywords, path patterns.
- **Delegation guard hook** (BM): `delegation-guard.sh` PreToolUse hook warns when Bo edits domain-specialist files. Advisory mode (exit 0), reads `domain-router.json` for extension matching.
- **Collaboration score CLI** (BM): `src/collaboration-score.js` scores task complexity 0-100 → solo/delegate/debate routing. Bo references it before Phase execution.
- **Sparse debate template** (BM): `debate-templates/sparse.md` — 2-agent, max 2-round pattern for quick 2-domain tradeoffs. Added to Midori's Debate Patterns table.
- **Wave parallel execution** (BM): Shinnosuke Phase Loop groups phases by wave, launches parallel Tasks, isolates failures. Nene's planning now includes wave grouping + file conflict detection.
- **Artifact dependency gate** (BM): `artifact_dependency` field in Phase specs blocks execution until prerequisite artifacts complete. Priority over wave parallelization.

### Changed
- **Stage 4 documents → Masumi** (BM): RETROSPECTIVE.md and IMPLEMENTATION.md writing delegated to Masumi (was Bo). Masumi gains `Write` tool and `permissionMode: default`.

## [4.17.0] - 2026-03-19

### BREAKING CHANGE
- **Git commits deferred to Stage 4 (Completion)**: `git commit` and `git push` are now blocked during Stage 3 (execution) via `workflow-guard.sh`. Commits are deferred to Stage 4 after Action Kamen review passes. Quick Fix paths are unaffected.

### Added
- **Plan Mode native integration** (BM): Nene calls `EnterPlanMode`/`ExitPlanMode` in Stage 2 planning. Advisory log in `transition-gate.sh` for requirements→planning transition.
- **Token usage tracking** (BM): `write-tracker.sh` records `input_tokens`, `output_tokens`, `cache_read_tokens`, `cache_write_tokens` with graceful null fallback. `analytics.js --cost` flag for estimated cost report by model/session.
- **Agent self-observation feedback loop** (BM): `getFailureHints(agentName)` in `agent-context.js` — detects below-average eval dimensions and auto-injects improvement hints via `session-init.sh`. Max 3 hints, 5s timeout.
- **Wave-based parallel execution** (BM): `getWaveOrder(projectRoot, taskList)` in `ontology-engine.js` — topological sort via DEPENDS_ON relations, Kahn's algorithm, circular dependency handling. `ultrawork/SKILL.md` Step 2.5 integration.
- **Intent Gate** (BM): `hooks/intent-gate.sh` classifies UserPromptSubmit complexity (high/medium/low) → `.shinchan-docs/.intent-complexity`. `shinnosuke-orchestrate.md` Step 0.5 reads result for model tier override (Opus/Sonnet, never Haiku).
- `hooks/workflow-guard.sh`: git commit/push detection and blocking in execution stage, explicit allow in completion stage
- `tests/validate/workflow-guard-behavior.js`: TC-11 (execution + git commit → BLOCK), TC-12 (completion + git commit → ALLOW), TC-13 (execution + git push → BLOCK)

### Changed
- `hooks/workflow-guard.md`: Stage-Tool Matrix updated with git blocking rule for execution stage
- `hooks/hooks.json`: intent-gate registered in UserPromptSubmit (async: true, timeout: 5)
- `docs/workflow-guide.md`: Stage 3 section notes commit deferral to Stage 4

## [4.16.0] - 2026-03-18

### Added
- **IntentGate** (BM): Shinnosuke RULE 0.5 — keyword-based auto-skill routing before domain routing. `agents/_shared/intent-map.json` with 10 keyword→skill mappings. Explicit skill calls always take priority (HR-1).
- **Plan Validation Gate** (BM): 3 quality checks added to `transition-gate.sh` for Stage 2→3 transitions — AC references per phase, file reference resolution, phase description specificity (≥20 chars).
- **Boulder Mechanism** (BM): Ralph v2 with idle detection (3 consecutive iterations without measurable progress), exponential backoff (0s→2s→4s→...→60s max), 15-iteration hard limit, and boulder-log.jsonl logging.
- **Hierarchical Context Injection** (BM): `src/gen-context-files.js` auto-generates per-directory `.context.md` files on SessionStart using ontology data. Background execution with 5s timeout.
- **Comment Checker** (BM): PostToolUse hook detects 5 AI slop comment patterns (`// TODO: implement`, `// FIXME:`, etc.) with warn-only decision (never blocks). Registered for Edit/Write matchers.
- **JSON Schema Generation** (BM): `src/gen-schemas.js` generates 3 JSON schemas (workflow-state, layer-map, intent-map) with `--check` mode for CI staleness detection.

### Changed
- `.gitignore`: added `**/.context.md` pattern and `src/gen-context-files.js`, `src/gen-schemas.js` whitelist entries
- `agents/bo.md`: added Context Loading section for `.context.md` awareness
- Validator filters: `agent-schema.js`, `skill-schema.js`, `agents-map.js` now exclude dot-prefixed files (`.context.md`)

### Fixed
- `transition-gate-behavior.js` TC-4b fixture updated to pass Plan Validation Gate checks

## [4.15.0] - 2026-03-13

### Added
- **Content extraction pipeline** (BM): masumi gains youtube/article/auto mode with yt-dlp/trafilatura environment probing and WebFetch fallback. agent-tool-guard adds masumi probe-only Bash exception. research/SKILL.md routes mode parameter to masumi.
- **Rubric LLM-as-Judge** (BM): actionkamen adds 3-item rubric scoring (Correctness/Completeness/Quality, 15pt, ≥9 pass), caller override support, and max-2-retry loop. micro-execute passes rubric: field to reviewers.
- **Competitive Code mode** (BM): debate/SKILL.md detects competitive triggers and routes to midori. midori orchestrates N Bo agents in worktree isolation, Action Kamen judges with rubric, winner merged via Bo Task, guaranteed cleanup on all paths.

## [4.14.1] - 2026-03-11

### Fixed
- **inferLayer() regex**: match paths without trailing slash — fixes 92% of entities missing layer field
- **DomainConcept layer**: `scanDC()` now tracks `file_path` and calls `inferLayer()`
- **Test file detection**: recognize `tests/` directory files — 28 TestSuite entities now detected
- **merge() property update**: existing entities receive new properties during merge

### Results
- Layer coverage: 7% → 99%
- TestSuite detection: 0 → 28

## [4.14.0] - 2026-03-10

### Added
- **LLM-driven ontology auto-scan** (BM-1): `auto-scan --check/--write` command in ontology-engine — LLM analyzes codebase to extract entities automatically with hallucination safeguards
- **ReACT Analysis Protocol** (BM-2): Structured Thought→Action→Observation→Answer cycle for Hiroshi and minimum tool-call principle for Misae
- **Structured agent step logging** (BM-3): Optional `step_type` field in work-tracker.jsonl for ReACT-style event tracking

### New Files
- `src/llm-ontology-scanner.js` — LLM scan core with caching and chunking
- `scripts/ontology-check.sh` — CI wrapper for ontology auto-scan --check

## [4.13.2] - 2026-03-09

### Fixed
- **Transition gate**: block `status: completed` unless current stage is `completion` — prevents skipping Stage 4 (code review, retrospective, implementation docs). Previously only artifact file existence was checked, allowing completion from any stage.
- Added TC-8/9/10 behavioral tests for stage skip prevention (16/16 passing)

## [4.13.1] - 2026-03-08

### Fixed
- **Statusline HUD**: use stdin `cwd` instead of `process.cwd()` to resolve `.shinchan-docs/` — fixes workflow state not showing when Claude Code runs the script from a different working directory
- **Statusline HUD**: fallback to `WORKFLOW_STATE.yaml` owner field when `.current-agent` file is missing

## [4.13.0] - 2026-03-08

### Added
- **Statusline HUD** (`src/statusline/index.js`): 2-line compact HUD using Claude Code's native statusLine API. Displays model, active workflow DOC_ID, stage, agent name, Todo progress (Line 1), and context usage bar with ANSI color coding, session cost, and elapsed time (Line 2).
- `/team-shinchan:setup-hud` command: installs/removes the HUD by writing `statusLine` configuration to `~/.claude/settings.json`. Detects plugin path at runtime (cache vs `--plugin-dir` mode). Confirms before overwriting existing statusLine configs.
- Zero npm dependencies; Node.js built-in only (`fs`, `path`). Graceful degradation when `.shinchan-docs/` is absent.

## [4.12.0] - 2026-03-07

### Added
- **Behavioral validators** — 5 new runtime behavior test validators for hard-guard hooks: `workflow-guard-behavior.js` (16 cases), `transition-gate-behavior.js` (13 cases), `agent-tool-guard-behavior.js` (14 cases), `layer-guard-behavior.js` (12 cases), `agent-routing.js` (40+ static checks). Total 54 behavioral test cases integrated into `index.js` (24 validators, ~7s).

### Discovered
- **HR-1 [Medium]**: `layer-guard.sh` defaults to `shinnosuke` (most-privileged) when `.current-agent` missing — privilege escalation path
- **HR-3 [Low]**: `transition-gate.sh` bypassed on new `WORKFLOW_STATE.yaml` creation
- **[Low]**: Reverse stage transitions not gated (undocumented)

## [4.11.0] - 2026-03-06

### Added
- **Scope change auto-absorption** — Shinnosuke RULE 0에 execution 중 scope 변경 감지 기준(4패턴+3반례), 처리 절차(4단계), `### Scope Change` 포맷 추가. Bo PO Workflow Step 1에 Scope Change 블록 확인 의무 추가. 워크플로우 이탈 없이 scope 변경을 PROGRESS.md에 자동 기록.

## [4.10.0] - 2026-03-06

### Added
- **ARCHITECTURE.md** — Auto-generated plugin architecture map (`src/gen-architecture-map.js`) with agent hierarchy, 4-stage workflow, invariant rules, boundaries, and entry points. Supports `--write`/`--check` flags for CI integration.
- **Ontology 3-layer** — `layer` field (global/domain/local) added to ontology entities. Path-based auto-inference in scanner: agents/skills/hooks → global, src/ → domain, tests/ → local. Layer-aware `query --layer`, `summary`, and `healthScore` outputs.
- **Agent self-observation** — `src/agent-context.js` provides per-agent performance summaries from eval-history and work-tracker. Session-init caches results. 5 execution agents (bo, aichan, bunta, masao, kazama) now check their own performance history at session start.
- **harness-lint** — `arch: exists` and `arch: fresh` staleness checks for ARCHITECTURE.md

### Fixed
- **harness-lint** — plugin.json path corrected from `D('plugin.json')` to `D('.claude-plugin/plugin.json')` (ver: README/CHANGELOG checks now work)
- **validate/index.js** — Token budget warnings/errors separation bug fixed

## [4.9.1] - 2026-03-05

### Fixed
- **Memory system** — learnings.md heading format `##` → `###` (session-init.sh was loading 0 entries due to format mismatch)
- **Memory system** — Backfilled `**Tier**: procedural` in all 45 learnings entries (tier-aware scoring was degraded)
- **Memory system** — Added `memory: project` to 5 agents (aichan, bunta, midori, shiro, ume)
- **Ontology** — session-wrap.sh ontology refresh now calls ontology-scanner.js correctly (was calling non-existent `scan` command)
- **Ontology** — Scanner no longer runs `scanDestructuredExports` on .md/.sh/.json files (eliminated false positive components)
- **Ontology** — Cycle detection in healthScore() no longer double-counts (modularity score corrected)

### Added
- **memory-system.js** — Heading format and Tier field validation checks
- **session-init.sh** — Prune suggestion when learnings count exceeds 50
- **ontology-engine.js** — Plugin Entities section in KB summary (agents, hooks, skills by name)

## [4.9.0] - 2026-03-05

### Added
- **Brainstorm skill** — New `/team-shinchan:brainstorm` skill for structured problem exploration before requirements. Invokes Hiroshi to produce: Problem Reframe, 2-4 Alternative Approaches (with pros/cons), Recommendation. Output saved as `brainstorm-output.md` for use by requirements skill.
- **Brainstorm command** — `commands/brainstorm.md` paired command file for skill registration

### Changed
- **Misae** — Socratic interview mode: exactly ONE question per turn, each with 2-3 concrete alternatives. IMMUTABLE RULES updated. Interview flow revised from batch questions to 5 sequential turns.
- **Bo** — Two-stage review (spec compliance + code quality via Action Kamen) generalized from micro-execute to standard Phase Loop. maxTurns 50→80. Phase Complexity Rule added (5+ sub-tasks → split into Steps).
- **requirements skill** — Step 0 brainstorm check: references prior brainstorm-output.md if found (advisory, not blocking)
- **Shinnosuke** — RULE 3 workflow table updated to show Brainstorm (Stage 0, optional) as pre-workflow step
- **workflow-guide.md** — Pre-Workflow Skill Chain section added: brainstorm → requirements → start chain documented
- **cross-refs.js** — `brainstorm` added to KNOWN_SKILLS array

## [4.8.0] - 2026-03-04

### Changed
- **Bo** — Redesigned from "Task Executor" to "Execution PO". Receives Phases from Shinnosuke, routes sub-tasks to domain specialists (Aichan/Bunta/Masao/Kazama) via Domain Routing Table, validates results, and reports back. maxTurns 30→50, memory local→project.
- **Shinnosuke** — Stage 3 Phase Loop updated: delegates Phases to Bo(PO) instead of routing directly to domain agents. RULE 0/1/2.5/3 updated. Quick Fix Path (RULE 2.5) explicitly bypasses Bo(PO).
- **layer-map.json** — 3 execution→specialist exceptions added (aichan, bunta, masao) for Bo(PO) delegation
- **output-formats.md** — Bo(PO) Delegation Format section added (before/after delegation, domain ambiguity, phase completion summary)
- **AGENTS.md** — Regenerated to reflect Bo's new role and maxTurns

## [4.7.0] - 2026-03-04

### Added
- **TDD Enforcement skill** — RED-GREEN-REFACTOR Iron Law with rationalization counters (7 entries), anti-patterns, and exception handling. Adopted from obra/superpowers.
- **Systematic Debugging skill** — 4-phase root-cause process (investigate, analyze, hypothesize, implement) with escalation rule (3+ failures → restart). Adopted from obra/superpowers.
- **Verification-Before-Completion skill** — Blocks completion claims without evidence. Red flags list, verification template, 4 checkpoint triggers. Strengthens self-check.md with evidence checkbox.
- **Parking Lot mechanism** — Discovered issues during execution are recorded in WORKFLOW_STATE.yaml `discovered_issues` instead of being fixed immediately. Triaged in Stage 4 Step 6 (promote/wontfix/resolved).
- **Scope Guard hook** — PreToolUse WARNING (not block) when Edit/Write targets files not listed in PROGRESS.md during execution stage. Guides agents to use parking lot for out-of-scope discoveries.
- **Mandatory Impact Scope Analysis** — Nene must grep for cross-references and paired files before writing any phase plan. Prevents missed file pairs (skill↔command, agent↔shared).
- **Skill-command content sync validator** — skill-command-parity.js now detects content drift (subagent_type mismatch, owner mismatch) between paired files.

### Changed
- **Bo, Kazama** — Required Sub-Skills section added: must use TDD, systematic debugging, and verification skills during implementation
- **Action Kamen** — Verification Evidence Check added to review criteria (rejects completion reports without evidence)
- **Nene** — Micro-task rules strengthened: 2-5 min scope, RED-GREEN commit cycle (Rule 8), rejection criteria for ambiguous instructions (Rule 9), Plan Quality Gate table
- **Coding Principles** — Surgical Changes now includes Parking Lot Rule: park scope-external issues, don't fix directly
- **Self-check** — Added Impact Scope Complete and Scope Discipline (parking lot) checkboxes

### Fixed
- **commands/start.md** — Stage 1 owner changed from nene to misae (was out of sync with skills/start/SKILL.md)
- **Misae** — Added Task tool for subagent delegation (Shiro/Ume) during Stage 1

## [4.6.0] - 2026-03-04

### Added
- **Micro-execute skill** — Breaks implementation into 2-3 minute micro-tasks with fresh subagent per task. Two-stage review per task: spec compliance then code quality. Retry limits and final integration review. Inspired by obra/superpowers subagent-driven-development pattern.
- **Subagent prompt templates** — Reusable structured prompts for implementer, spec-reviewer, and code-quality-reviewer in `agents/_shared/micro-task-prompts/`
- **Stage 4 completion enforcement** — HARD-GATE ensures RETROSPECTIVE.md and IMPLEMENTATION.md are always written. Bo writes docs, Action Kamen does final review.

### Changed
- **Misae expanded to Stage 1 owner** — Now handles full requirements gathering: user interviews, REQUESTS.md creation, STRIDE analysis, and hidden requirements discovery
- **Nene simplified to Stage 2 only** — Focused purely on PROGRESS.md planning from approved requirements. Removed interview and requirements logic.
- **Start workflow** — Stage 1 now routes to Misae (was Nene). Separate Misae post-analysis step removed (integrated into Misae's flow).
- **Autopilot workflow** — Updated to use micro-execute pattern and explicit Stage 4 completion

### Fixed
- **Stage 4 silently skipped** — Shinnosuke had no executable logic for Stage 4 transition. Added 5-step completion sequence with HARD-GATE.
- **KNOWN_SKILLS drift** — Synced layer-enforcement.js with cross-refs.js (added eval, ontology, impact-analysis, design-review)

## [4.4.1] - 2026-03-02

### Fixed
- **Remove all 14 prompt hooks** — prompt hooks make extra Haiku API calls and require `{"ok": true}` JSON responses; our hooks never returned this format, causing "hook error" on every tool use. SessionStart prompt hooks additionally crash with "ToolUseContext required". All guardrail logic already handled by command hooks (shell scripts). 32 → 22 hooks, 39KB → 6.7KB hooks.json.

## [4.4.0] - 2026-03-02

### Fixed
- **CRITICAL: All prompt hooks erroring** — prompt `"prompt"` field is literal text sent to the model, NOT a file path. `${CLAUDE_PLUGIN_ROOT}` is only resolved in command hooks. All 14 prompt hooks now have their .md content inlined directly into hooks.json.
- **run.cjs stdin race condition** — simplified to `data`/`end`/`error` events with timeout fallback; removed problematic `readable` + `destroy` pattern
- **workflow-guard `.shinchan-docs/` exception** — workflow infrastructure writes are now always allowed regardless of stage

## [4.3.3] - 2026-03-02

### Fixed
- **Hook errors in external projects** — `run.cjs` stdin race condition where `readable` event consumed data before `data` event, causing all command hooks to error
- **workflow-guard blocking `.shinchan-docs/` writes** — prompt hook had "NO EXCEPTIONS" rule that blocked WORKFLOW_STATE.yaml creation during requirements stage; added `.shinchan-docs/` exception for workflow infrastructure
- **`mkdir .shinchan-docs/` blocked** — workflow-guard.sh now allows `mkdir` targeting `.shinchan-docs/` during requirements/planning stages

## [4.3.2] - 2026-03-01

### Fixed
- **CRITICAL: Hooks not loading** — `"prompt_file"` field renamed to `"prompt"` in all 14 prompt hook entries; Claude Code schema expects `"prompt"` for `type: "prompt"` hooks
- **Duplicate hooks file error** — Removed `"hooks": "./hooks/hooks.json"` from plugin.json; auto-discovery handles this, explicit field caused fatal duplicate detection

## [4.3.1] - 2026-03-01

### Fixed
- **BASH_SOURCE path resolution**: Use `${BASH_SOURCE[0]:-$0}` fallback for reliable path resolution when hooks are invoked via `bash <script>` (deny-check, layer-guard, session-init, session-wrap, ontology-auto-build)
- **run.cjs stdin timeout**: Increased from 50ms to 200ms with `readable` event detection to prevent intermittent hook failures
- **run.cjs exit code propagation**: Now propagates exit code 2 for block decisions
- **Sandboxed environment compatibility**: Use `${TMPDIR:-/tmp}` instead of hardcoded `/tmp` in ontology-auto-build
- **gzip availability check**: Verify `gzip` exists before background compression in write-tracker
- **openssl fallback**: Robust trace ID generation when `openssl` is unavailable in trace-init

### Added
- **Hook execution validator** (`tests/validate/hook-execution.js`): 109-assertion automated test suite covering JSON schema, file existence, permissions, run.cjs wrapper, stdin piping, and block detection
- **matcher field enforcement**: All 32 hook entries now have explicit `"matcher"` field for reliable hook loading

## [4.3.0] - 2026-02-28

### Added
- **Node.js hook runner** (`scripts/run.cjs`): Cross-platform wrapper for reliable hook execution in marketplace installs — mirrors oh-my-claudecode pattern
- **Commit lint hook** (`hooks/commit-lint.sh`): Enforces Git R-1 conventional commit format (`type(scope): description`, 72-char limit)
- **Branch naming rule** (`hooks/deny-list.json`): Enforces Git R-4 branch naming convention (`{type}/{description}`)
- **Version consistency hook** (`hooks/version-check.md`): PostToolUse prompt hook enforces Git R-13 version consistency across plugin.json, marketplace.json, README.md
- **Dependency pinning check** (`hooks/security-check.sh`): Blocks `"*"` and `"latest"` in package.json (Security R-9)
- **Setup skill** (`/team-shinchan:setup`): First-time installation onboarding and health check
- **Agent memory expansion**: 5 additional agents now have persistent project memory — shinnosuke, nene, misae, masao, himawari (total: 10/15)

### Changed
- All hook commands now use Node.js wrapper (`node run.cjs <script>`) for reliable marketplace execution
- Shell scripts use `set -eo pipefail` instead of `set -euo pipefail` across all 12 hooks
- Removed explicit `"hooks"` field from plugin.json — relies on auto-discovery of `hooks/hooks.json`
- Rules auto-enforcement expanded from 9/54 to 13/54

### Fixed
- Hooks not executing in marketplace installs due to direct shell invocation differences

## [4.2.2] - 2026-02-28

### Bug Fixes
- **Ontology not building in marketplace installs**: Plugin command hooks (`type: "command"`) are not executed by Claude Code in marketplace installs. Simplified `ontology-auto-build.md` prompt hook to invoke the `.sh` script via Bash, ensuring ontology builds regardless.
- **Silent hook failures**: Removed `-u` flag from `set -euo pipefail` to prevent unbound variable crashes in hook scripts.

## [4.2.1] - 2026-02-27

### Bug Fixes
- **ontology-integrity.js**: Fix `rel.type` → `rel.relation` field alignment — resolves 75 false-positive validation errors
- **workflow-guard.sh**: Allow read-only Bash (git log, ls, etc.) during requirements/planning stages — was blocking all Bash
- **budget-guard.sh**: Strip YAML comment lines before parsing — prevents matching commented-out values
- **agent-tool-guard.sh**: Block compound commands in actionkamen test exception — prevents `mkdir && npm test` bypass
- **transition-gate.sh**: Handle Edit tool partial stage replacements — detects bare stage names in old/new strings

### Improvements
- **Agent frontmatter**: Add missing `maxTurns`/`permissionMode` to himawari, misae, shinnosuke, ume, midori
- **README**: Update plugin inventory counts — 34 hooks (21 cmd + 13 prompt), 21 validators, 41 skills, 9 src scripts
- **Ontology scanner**: Plugin-aware cross-reference detection for .md/.sh files, health scoring calibrated (connectivity target 3.0 → 1.5)

## [4.2.0] - 2026-02-27

### New Features — Full Enforcement Audit & Hardening
- **budget-guard.sh**: Programmatic budget enforcement — hard block at 100% when `hard_limit: true`, warns at 80% (replaces prompt-only budget guard)
- **transition-gate.sh**: Stage transition prerequisite validation — blocks advancement without required artifacts (REQUESTS.md, PROGRESS.md, Action Kamen review)
- **session-wrap.sh**: Deterministic budget counter persistence on session end — fixes compounding failure where budget counters never updated
- **trace-init.sh**: Deterministic trace ID generation per user prompt — replaces unreliable prompt-based trace generation
- **agent-tool-guard.sh**: Read-only agent enforcement — blocks Edit/Write/destructive Bash for advisory/utility agents (hiroshi, actionkamen, misae, shiro, masumi, ume, nene)

### Improvements
- **security-check.sh**: Large file staging block — rejects `git add` of files >10MB
- **deny-list.json**: Added `git add .`/`git add -A` block (Git R-11) and `eval()` block (Security R-10)
- **Harness Engineering**: 6 structural improvements — state migrator, eval metrics, layer guard, phase-aware KB loading, budget hard limits
- **Plugin Portability**: All 15 agent path references fixed (`${CLAUDE_PLUGIN_ROOT}/`), SessionStart command hooks for ontology and KB
- **Workflow Enforcement**: workflow-guard.sh blocks code tools during requirements/planning stages

### Stats
- Command hooks: 11 → 21 (+10)
- Total hooks: 24 → 34
- Enforcement coverage: 18 identified gaps → 18 addressed
- New files: 10 shell scripts, 2 JS modules

## [4.1.1] - 2026-02-26

### Bug Fixes
- **Ontology Scanner**: Fix 4 critical bugs — Component detection for `module.exports = { Name }`, DEPENDS_ON wiring for DataModel files, TESTED_BY cross-directory matching via import analysis, API entity missing `name` field
- **Ontology Engine**: Add `name` to API schema props, `file_path` to DataModel schema props, support entity name lookup in impact/related CLI

### Improvements
- **Workflow Drift Prevention**: Enforce active workflow context in orchestrator hook — block "Simple question"/"Quick fix" classification when workflow is active, always show current position, guide back after unrelated questions
- **Agent Narration Rule**: Shinnosuke must announce every delegation (before: who/why, after: result/next step) and show Phase progress at every transition
- **Agent Auto-Integration**: Nene auto-runs impact/related during planning, Bo auto-rescans after phase completion, ActionKamen auto-checks health during review, session-wrap auto-refreshes ontology on session end
- **Minimal User Commands**: Reduce user-facing commands from 40 to 5 (`start`, `resume`, `autopilot`, `review`, `help`); 35 internal skills set to `user-invocable: false`

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
