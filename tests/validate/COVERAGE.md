# Validator Coverage Matrix

## Overview

17 static validators ensure consistency across the Team-Shinchan codebase.

## Coverage Matrix

| Validator | Files Checked | What It Validates |
|-----------|--------------|-------------------|
| agent-schema | agents/*.md | YAML frontmatter (name, description, model, color, tools), role patterns |
| skill-schema | skills/*/SKILL.md | YAML frontmatter format |
| cross-refs | CLAUDE.md, agents/*.md | Agent IDs match between CLAUDE.md and agent files; skill references |
| stage-matrix | CLAUDE.md, hooks/workflow-guard.md | 9 tools × 4 stages permission matrix consistency |
| debate-consistency | CLAUDE.md, agents/*.md | No "Direct Orchestration" patterns; Midori-only debate |
| workflow-state-schema | skills/start/SKILL.md | WORKFLOW_STATE.yaml template has all 4 stage_rules + 4 transition_gates |
| skill-format | skills/*/SKILL.md | Standard skill file sections present |
| shared-refs | agents/*.md | All 15 agents reference _shared/output-formats.md |
| input-validation | skills/*/SKILL.md | 8 user-invocable skills have input validation |
| error-handling | CLAUDE.md, agents/shinnosuke.md, agents/midori.md, hooks/workflow-guard.md | Error handling documentation present |
| part-numbering | CLAUDE.md | PARTs are sequential (1 through N) with no gaps |
| quick-fix-path | CLAUDE.md | Quick Fix Path criteria and mandatory Action Kamen review |
| memory-system | hooks/load-kb.md, skills/learn/SKILL.md, skills/memories/SKILL.md, skills/forget/SKILL.md | Memory system files exist and cross-reference correctly |
| token-budget | agents/*.md, CLAUDE.md | File sizes within recommended token budget thresholds |
| hook-registration | hooks/*.md, hooks/hooks.json | All hooks referenced in hooks.json exist; no broken references |
| skill-command-parity | skills/*/,  commands/*.md | Every skill directory has a matching command file and vice versa |
| version-consistency | .claude-plugin/plugin.json, .claude-plugin/marketplace.json, README.md, CHANGELOG.md | Version numbers match across all release files |

## Overlap Analysis

| Overlap Area | Validators |
|-------------|-----------|
| CLAUDE.md content | stage-matrix, debate-consistency, error-handling, part-numbering, cross-refs |
| Agent files | agent-schema, cross-refs, debate-consistency, shared-refs |
| Skill files | skill-schema, skill-format, input-validation, cross-refs |

No redundant validators found — each checks a distinct aspect, though multiple validators read the same files.

## Execution Time

See validation runner output for per-validator timing (added in Phase 5).
