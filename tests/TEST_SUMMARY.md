# Team-Shinchan Test Infrastructure Summary

## Overview

Three tiers of testing ensure plugin quality:
1. **Static Validators** (17) - Structure/schema checks, no API calls
2. **Promptfoo Agent Tests** (25) - Individual agent behavior verification
3. **E2E Workflow Tests** (11) - Full workflow scenario validation

## Static Validators (17 total)

| # | Validator | What It Validates |
|---|-----------|-------------------|
| 1 | agent-schema | Agent markdown YAML frontmatter, role patterns |
| 2 | skill-schema | Skill YAML frontmatter format |
| 3 | cross-refs | Agent ID consistency between CLAUDE.md and agent files |
| 4 | stage-matrix | Stage-Tool Matrix consistency (CLAUDE.md vs workflow-guard.md) |
| 5 | debate-consistency | All debate references route to Midori only |
| 6 | workflow-state-schema | WORKFLOW_STATE.yaml template + stage rules in CLAUDE.md |
| 7 | skill-format | Standard skill file sections present |
| 8 | shared-refs | All 15 agents reference output-formats.md |
| 9 | input-validation | User-invocable skills have input validation |
| 10 | error-handling | Error handling documentation present |
| 11 | part-numbering | CLAUDE.md PARTs are sequential |
| 12 | quick-fix-path | Quick Fix Path defined with criteria and mandatory review |
| 13 | memory-system | Memory skills + hook + storage path consistency |
| 14 | hook-registration | All hooks in hooks.json are registered in plugin.json |
| 15 | skill-command-parity | Each skill has a corresponding command file |
| 16 | version-consistency | Version matches across plugin.json, marketplace.json, README, CHANGELOG |
| 17 | token-budget | File sizes stay within token budget limits |

## Promptfoo Agent Tests (25 total)

Individual agent behavior tests covering: Shiro (read-only, Glob, Grep), Bo (implementation), Hiroshi (analysis), Shinnosuke (delegation, stage transitions, quick fix), Nene (planning), Action Kamen (review verdicts), Midori (debate), Misae (hidden requirements), Masumi (documentation), Kazama (persistence), Ume (multimodal), Aichan (frontend), Bunta (backend), stage awareness, error handling, Himawari escalation, input validation, CI awareness, and status checking.

## E2E Workflow Tests (11 total)

| Scenario | Tests | What It Validates |
|----------|-------|-------------------|
| 1: Simple Feature | 3 | Full workflow: classify → requirements → delegation |
| 2: Bug Fix | 2 | Quick fix path with mandatory review |
| 3: Design Decision | 2 | Debate trigger → Midori facilitation |
| 4: Large Project | 2 | Himawari escalation + multi-domain awareness |
| 5: Review Rejection | 2 | Fix-and-retry → user notification on persistent failure |

## Running Tests

```bash
./run-tests.sh static    # Static validators only (free)
./run-tests.sh agents    # Agent behavior tests (requires API key)
./run-tests.sh e2e       # E2E workflow tests (requires API key)
./run-tests.sh all       # All tests
```

Prerequisites for agent/E2E tests:
1. `npm install -g promptfoo`
2. `export ANTHROPIC_API_KEY=your-key`
