# Changelog

All notable changes to Team-Shinchan will be documented in this file.

## [Unreleased]

*No unreleased changes*

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
