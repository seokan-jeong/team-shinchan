# Changelog

All notable changes to Team-Shinchan will be documented in this file.

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
- Integrated documentation system (shinchan-docs/)
- Debate system for design decisions
- WORKFLOW_STATE.yaml for state management
- Action Kamen verification layer
- Real-time progress reporting
- Agent delegation via Task tool
- Memory system for learning patterns
