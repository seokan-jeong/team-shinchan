---
name: team-shinchan:help
description: Use when you need guidance on Team-Shinchan agents, skills, or memory system.
user-invocable: true
---

# Team-Shinchan Help

## Commands

| Command | Description |
|---------|-------------|
| `/team-shinchan:start` | Start a new task — requirements, planning, execution, review all handled |
| `/team-shinchan:resume` | Resume an interrupted workflow from where it left off |
| `/team-shinchan:autopilot` | Autonomous execution from idea to working code |
| `/team-shinchan:review` | Code review with Action Kamen |
| `/team-shinchan:help` | This guide |

## Quick Start

```
/team-shinchan:start Add user authentication
```

Shinnosuke orchestrates 15 agents through 4 stages:

1. **Requirements** — Nene interviews you, Misae checks risks
2. **Planning** — Nene creates phased plan with acceptance criteria
3. **Execution** — Bo/Aichan/Bunta/Masao implement, Action Kamen reviews each phase
4. **Completion** — Documentation, retrospective, final verification

## What Happens Automatically

- **Project Ontology** — knowledge graph auto-built on first session, updated incrementally
- **Workflow Guard** — blocks code edits during planning, enforces stage transitions
- **Security Hook** — blocks secrets, destructive git, sensitive files
- **Budget Guard** — token budget with 80%/100% alerts
- **Agent Narration** — Shinnosuke announces every delegation and result
- **Session Wrap** — auto-summary on session end

## 15 Agents

| Layer | Agents |
|-------|--------|
| Orchestration | Shinnosuke (conductor), Himawari (large projects), Midori (debates) |
| Execution | Bo (code), Kazama (deep work) |
| Specialists | Aichan (frontend), Bunta (backend), Masao (devops) |
| Advisors | Hiroshi (architecture), Nene (planning), Misae (requirements), Action Kamen (review) |
| Utility | Shiro (explorer), Masumi (docs), Ume (vision) |

All agents are invoked automatically by Shinnosuke. You just describe your task.

## Keyword Map

Use these trigger words to reach the right skill quickly. Korean equivalents are listed alongside each entry.

| Trigger (EN) | Trigger (KO) | Skill |
|-------------|-------------|-------|
| fix, debug, error | 버그, 디버그 | `systematic-debugging` |
| plan, design | 계획, 설계 | `plan` |
| implement, add, feature | 구현, 추가 | `implement` |
| review, check | 리뷰, 검토 | `review` |
| test | 테스트 | `test-driven-development` |
| release | 릴리스 | `release` |
| analyze, understand | 분석, 이해 | `analyze` |

Mappings in arrow notation:

- fix / debug / error / 버그 / 디버그 → `systematic-debugging`
- plan / design / 계획 / 설계 → `plan`
- implement / add / feature / 구현 / 추가 → `implement`
- review / check / 리뷰 / 검토 → `review`
- test / 테스트 → `test-driven-development`
- release / 릴리스 → `release`
- analyze / understand / 분석 / 이해 → `analyze`
