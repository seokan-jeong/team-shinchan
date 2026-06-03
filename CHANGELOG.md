# Changelog

## [4.41.0] - 2026-06-03

### Tier 2 — `/team-shinchan:fierce-review` (new, opt-in)

The two-tier pattern proven for debate now covers code review — the canonical case for the failure modes the Workflow tier exists to fix: agentic laziness (a single pass quietly stops at "good enough"), self-preferential bias (the team's own reviewer going easy on the team's code), and rule adherence.

**`/team-shinchan:fierce-review` (new)**
- A main-loop Workflow: dimensions (correctness / security / performance / quality / tests / principles) fan out as independent agents, EVERY finding is challenged by a skeptic (`is_real` only if it holds against the actual code), a completeness critic hunts the files and rules nobody examined, and an Action-Kamen judge scores against the shared rubric with schema-validated output.
- Reuses `agents/_shared/eval-rubrics.json` as the single rubric source — the main loop injects the chosen rubric into the Workflow (the script has no filesystem access), so the judge never forks it.
- Writes `.shinchan-docs/reviews/REVIEW-{NNN}.json`. An APPROVED artifact (empty `must_fix`) counts as code-review evidence at the `verification-before-completion` pre-PR / pre-completion checkpoint.
- Opt-in only (Workflow is main-loop only; never delegated). `team-shinchan:review` stays the cheap, auto-triggerable Tier 1 default; Action Kamen surfaces the escalation on high-stakes scope.

Mirrors the runtime constraints fierce-debate already handles: `args` is parsed defensively (delivered as a JSON string), and the Action Kamen persona is delivered by prompt injection (the Workflow agent registry does not expose plugin subagents).

### Workflow persona helper — `src/workflow-personas.js` (Tier C infra)

Workflow-tier skills must inject an agent's role/voice by prompt (the runtime can't load plugin subagents via `agentType`), and the Workflow script itself can't read files — so hard-coded persona strings drift from the canonical `agents/<name>.md`.

- New `src/workflow-personas.js` derives a concise, faithful persona descriptor from an agent's definition (identity from "You are **X**", role from frontmatter `description`, voice from the Personality & Tone line). Runs in the main loop (`node src/workflow-personas.js <agent>`); the SKILL injects the result via `args`.
- `fierce-review` and `fierce-debate` now resolve their personas through the helper instead of hard-coded strings — single source of truth is the agent file.
- `tests/workflow-personas.test.js` — 8 `node --test` cases (extraction fidelity, "Use for" stripping, boilerplate exclusion, missing-agent throw, path-traversal sanitization). Unlike the `.workflow.js` scripts, this helper is `require()`-able and therefore directly unit-tested.
- Foundation for the next Workflow tiers (ralph loop, competitive-code tournament): they inject Kazama / Bo / Action Kamen personas through the same helper.

### Tier 2 — `/team-shinchan:fierce-ralph` (new, opt-in)

The two-tier pattern reaches persistence/looping. `ralph` (Kazama's narrated boulder loop) can only *describe* "don't stop until done" — the loop lives in one agent context and depends on the model honoring it (agentic-laziness exposure). `fierce-ralph` makes the loop condition the SCRIPT's, not the agent's.

**`/team-shinchan:fierce-ralph` (new)**
- A main-loop Workflow: a worker agent does the next unit of work, a verifier independently checks progress + completion against the real repo (tests, ACs), and it repeats — bounded by a hard iteration cap, the token budget (`budget.remaining()`), and a stagnation limit (3 no-progress iterations) — then an Action-Kamen final gate runs.
- `completed` is **deterministic**: true only if the loop reached `done` AND the gate shows `verdict APPROVED && tests_pass && goal_met && no blockers` — not the LLM's verdict label alone.
- Carries forward every fierce-review hardening lesson: defensive `args` parse, personas injected via `src/workflow-personas.js` (kazama=worker, actionkamen=verifier/gate), **every** agent call (worker, verifier, and gate) guarded for null so a transient null never crashes the loop or reads as "done", and an honest `stop_reason` (completed / max_iterations / stagnation / budget_exhausted). Writes `.shinchan-docs/ralph-runs/RALPH-{NNN}.json`; an APPROVED gate is completion evidence for verification-before-completion.
- Opt-in only; `team-shinchan:ralph` stays the cheap, delegatable Tier 1 default. Added to the CI KNOWN_SKILLS allow-lists alongside its siblings.

The script has no filesystem/git access, so progress/completion is judged by the verifier agent (which runs tests and reads PROGRESS.md); the script owns only the deterministic control flow (loop, caps, budget, stagnation counter) — it cannot call `stagnation-detector.js` the way the Tier 1 narrated loop does.

### Tier 2 — `/team-shinchan:fierce-compete` (new, opt-in)

The two-tier pattern reaches competitive code. `/team-shinchan:debate` competitive-code mode (Midori + worktrees, Task-orchestrated) gets a deterministic Workflow sibling.

**`/team-shinchan:fierce-compete` (new)**
- A main-loop Workflow tournament: N (2–4) builder agents independently solve the same task and each returns an apply-ready unified-diff **patch** — read-only, so there are no parallel working-tree collisions and nothing to merge (the patch-return model sidesteps Workflow worktree mechanics). An Action-Kamen judge scores each on correctness / completeness / quality.
- The **winner is selected deterministically** in-script (max clamped total, tie → higher correctness), never trusting an LLM "winner" label; `dissent` is non-empty by contract. The SKILL's main loop applies the winner with `git apply` and then runs the tests (builders are read-only, so patches are untested until applied — surfaced honestly).
- Personas injected via `src/workflow-personas.js` (bo=builder, actionkamen=judge); judge guarded for null; degenerate tournaments (<2 surviving impls) return an error rather than proceeding. Writes `.shinchan-docs/tournaments/COMPETE-{NNN}.json` and records the winner to the shared `debate-decisions.md` ledger. Added to the CI KNOWN_SKILLS allow-lists.
- Opt-in only; debate's competitive-code mode stays the cheap, keyword-triggered Tier 1 default.

This completes the Workflow-tier sweep seeded by fierce-debate: **review → fierce-review**, **ralph → fierce-ralph**, **debate competitive-code → fierce-compete**, all sharing the `src/workflow-personas.js` foundation and the same hardening (defensive args, null-guarded agents, deterministic gates/winners, no silent drops).

## [4.40.0] - 2026-06-02

### Two-tier debate — now actually enforced

Telemetry showed the debate moderator never fired in practice (**0 of 4,813 logged actions**) because debate was only a soft auto-detect. This release makes design-decision debate a real, enforced part of the workflow, and adds a fiercer adversarial tier for high-stakes calls.

**Enforced trigger gate (planning → execution)**
- The transition gate now blocks advancing from planning to execution until `PROGRESS.md` records a design decision: cite a `DECISION-NNN` from a debate, or write an explicit one-line waiver with a reason.
- Floor + signal hard-layer: when design-choice signals (vs / option A|B / approach 1|2 / trade-off / alternative / irreversible) appear, a waiver is not enough — a debate is required.
- The PROGRESS template prompts for it; Nene's planning guidance documents it.

**Tier 1 (Midori) hardening**
- Sparse-debate Round 2 (rebuttal) is now mandatory, with a red-team pass.
- `dissenting_views` may no longer be silently empty.

**Tier 2 — `/team-shinchan:fierce-debate` (new, opt-in)**
- A deterministic main-loop Workflow for irreversible / high-stakes decisions: advocates argue each option maximally, then mandatory cross-refutation, then an Action-Kamen-scored judge, with schema-validated output that rejects empty dissent.
- Shares the single `debate-decisions.md` ledger with Midori.

The gate design was itself stress-tested with the new fierce-debate flow. All static validation passes; the transition-gate behavior suite covers the new gate (TC-DG1..DG6).

## [4.39.0] - 2026-05-30

**Release tooling is now a full GitHub release orchestrator.** `src/release.js` previously only bumped version numbers across 4 files; commit/tag/push and the GitHub Release were manual steps.

### Added
- `src/release.js` opt-in flags `--git`, `--tag`, `--push`, `--gh-release`, and `--full`. The 4-file version bump stays the always-on default; the git/GitHub steps are opt-in.
- Release-notes resolution: `--notes-file <f>`, falling back to a draft from `git log <last-tag>..HEAD` — the CHANGELOG header is never left silently empty.
- `--title` for the GitHub Release; `--dry-run` now previews every step (bump + git + gh) with zero side effects.
- Fail-fast preconditions: semver check, already-current guard, tag-exists guard, `gh auth` check, not-on-main warning.
- `tests/release.test.js` — 16 `node --test` cases.

### Fixed
- `commands/release.md` overclaimed it "creates a git commit and tag" while the script did neither — docs now match behavior.

### Notes
- Commit **and** tag messages are emitted as conventional `chore: release vX.Y.Z` (the harness commit-lint hook rejects non-conventional commit/tag messages).
- After a release, clear local plugin caches (see `commands/release.md`).

## [4.38.1] - 2026-05-30

Harness-fit maintenance pass via `/meta-harness:improve` (4-phase pipeline). Project-fit re-evaluation moved the harness from `draft` to `good` (2 high coverage-gaps + 1 broken validator route resolved).

### Added
- **CLAUDE.md § "Source Layer (`src/`)"**: orients contributors to the JavaScript implementation layer (~47 `src/*.js` modules + the `src/dashboard/` htmx+SSE app) and the real run/test commands (`npm run dashboard`, `npm run test:dashboard`, `./run-tests.sh static`, top-level `tests/*.test.js` via `node --test`). Previously the harness documented only the markdown surface.

### Fixed
- **skills/manage-skills/SKILL.md**: the Step-2 validator map routed `hooks/hooks.json` / `plugin.json` changes to a non-existent `verify-hooks` skill — repointed to `verify-workflow` (which already owns `hooks/*.md`) so the `hook-registration` validator stays reachable.
- **skills/manage-skills/SKILL.md**: corrected the false "markdown plugin / no `src/`" assertion in the Prohibited list (the project ships a real `src/` JS layer) and clarified the skill is intentionally scoped to the markdown surface.
- **commands/release.md**: fixed a dangling pointer to the non-existent `skills/release/SKILL.md` (now references the actual `src/release.js`).

### Changed
- **Conciseness pass**: removed 23 redundant-restatement lines across `agents/{ume,kazama,masumi}.md` and `skills/help/SKILL.md` (Anthropic conciseness test; no behavior change).
- **Trigger descriptions sharpened** for `skills/skill-feedback`, `agents/midori`, and `agents/ume` (clearer "use when" phrasing + concrete trigger phrases).
- **.gitignore**: ignore `.meta-harness/` local state (snapshots, improve-state).

## [4.38.0] - 2026-05-24

### Added
- **agents/misae.md + skills/start/SKILL.md (main-074, FR-1..7)**: Stage 1 interview is now **clarity-gated** instead of turn-counted. A 3-axis rubric (`goal_clarity`, `constraint_clarity`, `success_criteria`) drives both entry and exit. Pre-interview scoring skips the interview entirely when `overall ≥ skip_threshold` (default `0.85`) AND ≥3 of 5 explicit fields are present (problem, scope, constraint, success_criterion, target_user — deterministic regex check to prevent retro-justification skips). Mid-interview exit when `overall ≥ done_threshold` (default `0.75`) AND `unresolved_unknowns == []`. `hard_cap` (default `10`) is an absolute ceiling — when hit with residual unknowns, REQUESTS.md gets a `## Open Questions` section listing the gaps.
- **gap-targeted question contract (FR-4)**: Each `interview-question` JSON block now declares `targets_subscore` ∈ {goal_clarity, constraint_clarity, success_criteria} and `closes_unknown` (≤80 chars, one item from `unresolved_unknowns`). `skills/start/SKILL.md` GUARD validates both fields. No more formulaic asks.
- **visible reasoning (FR-5)**: One-line prose rationale of the form `Clarity 0.55 (goal=0.7, constraint=0.3, success=0.6). Asking to lift constraint_clarity: "Latency target (p50/p95/p99 ms)"` precedes every JSON block for transparency.
- **escape hatch (HR-2)**: Literal `skip-interview` (case-insensitive) in `user_request` triggers immediate `status: done, reason: user_skip_override` regardless of computed score.
- **autopilot consistency (AC9)**: `skills/autopilot/SKILL.md` Step 5 now requires Misae to persist `clarity_score.history[0]` with `source: autopilot_inferred` so the rubric remains the single shared quality signal across manual and autopilot paths.
- **configurable thresholds (FR-6)**: `.shinchan-config.yaml` `interview.{skip_threshold, done_threshold, hard_cap}` honored with silent defaults + sanity check (`done_threshold < skip_threshold ≤ 1.0`).
- **src/mechanical-check.js Check D / Check HD (NFR-1, AC6)**: New version-gated check. For `schema_version: 1` WORKFLOW_STATE.yaml (main-069..main-073) emits a warning only — preserves backwards compat. For `schema_version: 2+` missing `clarity_score.history` emits a hard error. Markdown mode (`checkD`) + HTML mode (`checkHD`) both wired.
- **tests/mechanical-check-clarity.test.js + 3 fixture dirs**: 6 unit tests covering version-1-no-history (no error), version-2-no-history (1 error matching `/Check D.*clarity_score\.history/`), version-2-with-history (no error), missing WORKFLOW_STATE.yaml (vacuous pass), `checkHD` aliasing, and an explicit AC6 regression assertion against `.shinchan-docs/main-073/REQUESTS.md`.
- **agents/_shared/templates/REQUESTS.md.tpl**: Optional `## Open Questions` section between Acceptance Criteria and Validation Checklist — present only when interview exits via `hard_cap_reached` or `no_more_actionable_gaps`.
- **docs/workflow-guide.md**: New `### Clarity Gate (since main-074)` subsection documenting the two-threshold contract, `.shinchan-config.yaml` snippet, escape hatch, version-gated mechanical-check, and FR-5 prose rationale format.

### Notes
- **AC10 — `agents/actionkamen.md` untouched**: confirmed by empty `git diff --stat`. Action Kamen's review contract remains the constant reference frame for this self-modifying release.
- **Dogfooded**: main-074 itself ran under autopilot; the workflow's own `WORKFLOW_STATE.yaml` carries `clarity_score.history[0]` with `source: autopilot_inferred` and AK approved final verification 15/15 (correctness 5/5, completeness 5/5, quality 5/5).

## [4.37.0] - 2026-05-21

### Added
- **hooks/pre-push-gate.sh (main-073, FR-1.3)**: New PreToolUse(Bash) hook that blocks `git push` and `gh pr create` when an active workflow's `IMPLEMENTATION.md` is missing. Fast-path filters keep unrelated Bash commands under 10ms (NFR-2). No bypass env-var — the gate is mandatory. Non-shinchan no-op when `.shinchan-docs/` is absent; CI-safe when `CLAUDE_PLUGIN_ROOT` is unset.
- **hooks/dashboard-autostart.sh + src/dashboard/autostart.js (main-072)**: Dashboard auto-spawns on Claude Code `SessionStart` as a permanent daemon. Singleton-enforced via `~/.shinchan/dashboard.lock` + `/health` probe. First-spawn opens the default browser; subsequent sessions silently attach. Opt-out via `TS_DASHBOARD_AUTOSTART=0` (env wins) or `.claude-plugin/plugin.json` `settings.dashboard_autostart: false`.

### Changed
- **agents/masumi.md (main-073, FR-1.4)**: Stage 4 retrospective deliverable folded into `IMPLEMENTATION.md ## Lessons` for new workflows. Legacy `RETROSPECTIVE.md` files (main-070..072) preserved unchanged. IMPLEMENTATION required sections grew from 5 to 6 (`## Lessons` added). HTML mode `data-ts-kind` enum extended.
- **hooks/transition-gate.sh (main-073, FR-1.4)**: Status completion gate now accepts either legacy `RETROSPECTIVE.md` OR new `## Lessons` section in `IMPLEMENTATION.md`. Legacy workflows pass via RETRO; new workflows pass via Lessons. Regex check: `/\n##\s+Lessons\b/`.
- **hooks/hooks.json**: `pre-push-gate.sh` registered in `PreToolUse(Bash)` chain after `commit-lint.sh`.
- **README.md**: Dashboard documentation section added (auto-spawn, opt-out channels, stop daemon).
- **.claude-plugin/plugin.json**: `settings.dashboard_autostart: true` (default).

### Notes
- **main-073 closes itself via this release**: the workflow that shipped FR-1.4 was unable to flip to `status: done` while the v4.36.0 cached `transition-gate.sh` was still running. Releasing v4.37.0 rebuilds the cache; on the next session, main-073 can finalize. This was the intended dogfooding path documented in main-073 IMPLEMENTATION.md.
- **No source defect in ontology pipeline**: main-073 Phase 0 read-only baseline confirmed `src/ontology-scanner.js:126` PART_OF emission and `src/ontology-engine.js:323` aggregation are both correct. The apparent "0 components" for most modules reflects `.md`-only skill directories, not a scanner bug. FR-1.2 closed as "no defect found." No `src/` files were modified for this fix.
- **Legacy RETRO immutability verified**: SHA-256 hashes of `main-070/RETROSPECTIVE.md`, `main-071/RETROSPECTIVE.md`, `main-072/RETROSPECTIVE.md` unchanged.

## [4.36.0] - 2026-05-19

### Added
- **dashboard**: New real-time observability dashboard (`src/dashboard/`) — HTMX + SSE card grid that streams workflow state from `.shinchan-docs/`. Run via `npm run dashboard` (defaults to port 8765, override with `TS_DASHBOARD_PORT`). Covers grid view, per-doc panel, file viewer, status/stage/progress/recent-activity slots, and click-to-load doc rendering.
- **dashboard/realtime (main-071)**: SSE client now stamps a "마지막 업데이트" indicator on every event + heartbeat + reconnect (`htmx:sseOpen`) and runs a 60s safety-net interval, so users no longer need to hard-refresh to see workflow state changes.
- **dashboard/done-card-semantics (main-071)**: `computeStageInfo`/`computeActionHint`/`extractRecentActivity` now respect `status: done` — done cards show `progressPct: 100`, no stale "워크플로 마무리 진행 중" action hint, and an `EVENT_VERB_MAP` priority chain (EVENT_VERB_MAP > EVENT_LABELS > slug) turns event slugs into human verb sentences like "사용자가 컨펌했습니다". WCAG AA dim measured at 7.05:1 at `opacity: 0.65`.
- **mechanical-check/html-mode**: `src/mechanical-check.js` extended with HTML structural validation alongside Markdown — supports the new `agents/_shared/templates/{PROGRESS,REQUESTS,RETROSPECTIVE}.html.tpl` artifacts and is covered by `tests/mechanical-check-html.test.js` + `tests/html-token-estimator.test.js`.
- **docs**: `docs/HOOKS_DASHBOARD_INTEGRATION.md` documents how the dashboard subscribes to workflow hooks; `docs/HTML_STYLE_GUIDE.md` documents the HTML artifact contract for the templates above.
- **scripts/nfr-suite.sh**: Aggregated NFR pre-flight suite for dashboard/template work.
- **tests**: New `tests/dashboard/` unit suite, `tests/e2e/dashboard-card-click.e2e.js`, and `tests/fixtures/` for dashboard/HTML coverage.

### Changed
- **agents/aichan, bo, bunta, himawari, kazama, masumi, misae, nene**: Agent contracts updated for HTML-template authoring path and dashboard awareness (deliverables, slot vocabulary).

### Fixed
- **dashboard/field.js (main-071)**: Suppress duplicate `.ts-recent-agent` column when `eventLabel` already leads with the agent name (regression caught at P3 puppeteer acceptance: "shinnosuke shinnosuke가 …"). Legacy agent-less labels still render the column normally.

## [4.35.0] - 2026-05-06

### Fixed
- **autopilot/AK-GATE-bypass**: Removed `Auto-approve requirements` (Stage 1) and `Auto-approve planning gate` (Stage 2) instructions from `skills/autopilot/SKILL.md`. These were string-injecting approval records without an actual `Task(subagent_type="team-shinchan:actionkamen")` call, violating the IMMUTABLE AK-GATE rule defined in `agents/misae.md` and `agents/shinnosuke.md`. Autopilot now runs the real AK review loop (max 2 retries) and escalates to user on rejection.
- **autopilot/stage4-author**: Stage 4 documentation (`RETROSPECTIVE.md`, `IMPLEMENTATION.md`) now correctly delegated to **Masumi** instead of Bo, restoring agent role consistency with `agents/masumi.md` and `docs/workflow-guide.md`.

### Added
- **autopilot/quality-gates**: Autopilot Stage 2-3 prompt now explicitly includes the standard quality gates that were previously missing — Sprint-Contract AC Testability Review (FR-3), Mechanical Pre-Check (`src/mechanical-check.js`), and Drift Gate (`src/drift-check.js`).
- **autopilot/stage4-completeness**: Stage 4 prompt now covers the full Stage 4 checklist — learnings extraction to `.shinchan-docs/learnings.md`, Branch Completion Options (Step 4.5: A=merge / B=PR / C=keep / D=discard), and Parking Lot Triage (Step 6).
- **autopilot/stage3-to-4-confirm**: Required user gate before Stage 4 ("All execution phases done. Proceed to Stage 4?") added per project memory (`feedback_completion_stage`), preventing silent skipping of completion stage even in autopilot mode.

## [4.34.2] - 2026-04-24

### Changed
- **Misae interview**: Options count now flexible (no upper limit) — removed hardcoded 2-4 constraint; parent handles AskUserQuestion's max-4 limit via pagination ("더 많은 선택지 보기")
- **Misae interview**: Turn count now flexible (safety cap: 10) — removed fixed 5-turn loop; early exit on `status: done`
- **Misae interview**: "직접 입력/Other" option no longer generated by Misae — AskUserQuestion provides it automatically

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

