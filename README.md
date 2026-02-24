<div align="center">

# 🖍️ Team-Shinchan

<img src="https://i.pinimg.com/1200x/1c/06/b0/1c06b009abbb5c764ba8335b827e3421.jpg" alt="Shinchan" width="600"/>

### *"Stop doing everything yourself. Get a team of AI specialists."*

**15 AI agents that debate decisions, plan systematically, execute in parallel, and learn from your project.**

[![Version](https://img.shields.io/badge/version-3.12.0-blue.svg)](https://github.com/seokan-jeong/team-shinchan/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Plugin-purple.svg)](https://claude.ai)
![GitHub stars](https://img.shields.io/github/stars/seokan-jeong/team-shinchan?style=social)

[**Try It**](#try-it-in-2-minutes) • [**Commands**](#commands) • [**The Team**](#the-team-15-agents) • [**How It Works**](#how-skills-work)

</div>

---

## What is Team-Shinchan?

Team-Shinchan is a **Claude Code plugin** that gives you **15 specialist AI agents** working as an organized team.

Instead of one AI doing everything, you get experts in frontend, backend, DevOps, planning, code review, and more. They **debate architectural decisions**, **execute tasks in parallel** (5x faster), and **remember your project's conventions** so you don't repeat yourself.

No more context-switching between roles. No more forgetting past decisions. No more reviewing your own code.

---

## Before / After

| Without Team-Shinchan | With Team-Shinchan |
|----------------------|---------------------|
| ❌ You plan alone | ✅ Nene creates structured multi-phase plans |
| ❌ You review your own code | ✅ Action Kamen reviews every change |
| ❌ You forget past decisions | ✅ Memory system remembers conventions & preferences |
| ❌ Sequential execution (slow) | ✅ Parallel execution (5x faster) |
| ❌ No design debate | ✅ Expert panel debates trade-offs before coding |
| ❌ Ad-hoc task tracking | ✅ Structured workflow with documentation |
| ❌ Repeat the same context | ✅ Self-learning from retrospectives |
| ❌ Requires CLAUDE.md setup | ✅ Works standalone — just install the plugin |

---

## Try It in 2 Minutes

### Install

**From Marketplace (Recommended)**
```bash
/plugin marketplace add seokan-jeong/team-shinchan
/plugin install team-shinchan
```

**One-Click Install**
```bash
curl -fsSL https://raw.githubusercontent.com/seokan-jeong/team-shinchan/main/install.sh | bash
```

**Manual Install**
```bash
git clone https://github.com/seokan-jeong/team-shinchan.git ~/.claude/plugins/team-shinchan
```

### Verify Installation

```bash
/team-shinchan:help
```

If you see the help menu, you're ready to go.

### What's Next?

- Read the [Getting Started Guide](docs/getting-started.md) for your first task
- Try `/team-shinchan:start {your task}` to see the full workflow
- Use `/team-shinchan:debate` for design decisions

---

## Use Cases

### 1. Debate-Driven Design Decisions

```
User: Add OAuth2 authentication

💭 [Shinnosuke] Design decision needed. Starting debate...

   🎀 [Aichan] JWT is better for frontend SPA
   🍜 [Bunta] Session is simpler for backend
   👔 [Hiroshi] Hybrid approach: JWT + refresh tokens

   ✅ Consensus: JWT with refresh token rotation
```

### 2. Parallel Execution for Speed

```
User: ulw fix all TypeScript errors

⚡ Running in parallel:
├─ 😪 [Bo] Fixing src/auth/*.ts (3 errors)
├─ 😪 [Bo] Fixing src/api/*.ts (4 errors)
└─ 😪 [Bo] Fixing src/utils/*.ts (5 errors)

✅ Completed in 2 minutes (vs ~10 minutes sequential)
```

### 3. Work Tracker (JSONL Log)

```
# Every event is logged to .shinchan-docs/work-tracker.jsonl

{"ts":"2026-02-24T06:00:00Z","type":"agent_start","agent":"bo","session":"session-abc1"}
{"ts":"2026-02-24T06:00:05Z","type":"file_change","agent":null,"session":"session-abc1","data":{"file":"src/auth.ts","action":"modify"}}
{"ts":"2026-02-24T06:01:00Z","type":"agent_done","agent":"bo","session":"session-abc1"}

# Query with: /team-shinchan:work-log --last 20 --agent bo
```

### 4. Self-Learning Memory

```
# Week 1
User: Use Zustand for state management
🧠 Learned: "Prefer Zustand over Redux"

# Week 2
User: Add user preferences feature
🎀 [Aichan] Implementing with Zustand (remembered!)
```

---

## The Team (15 Agents)

<table>
<tr>
<td>

### Orchestration
| Agent | Role |
|-------|------|
| **Shinnosuke** | Orchestrator |
| **Himawari** | Atlas (Large Projects) |
| **Midori** | Debate Moderator |

### Execution
| Agent | Role |
|-------|------|
| **Bo** | Code Executor |
| **Kazama** | Deep Worker |

</td>
<td>

### Specialists
| Agent | Role |
|-------|------|
| **Aichan** | Frontend/UI |
| **Bunta** | Backend/API |
| **Masao** | DevOps/Infra |

### Advisors
| Agent | Role |
|-------|------|
| **Hiroshi** | Senior Oracle |
| **Nene** | Strategic Planner |
| **Misae** | Requirements Analyst |
| **Action Kamen** | Code Reviewer |

</td>
<td>

### Utility
| Agent | Role |
|-------|------|
| **Shiro** | Fast Explorer |
| **Masumi** | Documentation |
| **Ume** | Image/PDF Analysis |

</td>
</tr>
</table>

---

## Commands

33 commands across workflow, specialist, and utility categories:

### Workflow Commands
| Command | Description |
|---------|-------------|
| `/team-shinchan:start` | Start integrated workflow |
| `/team-shinchan:resume` | Resume interrupted workflow |
| `/team-shinchan:autopilot` | Autonomous execution |
| `/team-shinchan:ultrawork` | Parallel execution |
| `/team-shinchan:ralph` | Loop until complete |
| `/team-shinchan:orchestrate` | Orchestrate multi-agent task |
| `/team-shinchan:bigproject` | Large project with Himawari |
| `/team-shinchan:status` | Show workflow status |

### Analysis & Planning
| Command | Description |
|---------|-------------|
| `/team-shinchan:debate` | Trigger expert debate (via Midori) |
| `/team-shinchan:plan` | Planning session |
| `/team-shinchan:analyze` | Deep analysis |
| `/team-shinchan:deepsearch` | Codebase search |
| `/team-shinchan:requirements` | Gather and clarify requirements |
| `/team-shinchan:research` | Research a topic |

### Implementation
| Command | Description |
|---------|-------------|
| `/team-shinchan:implement` | Execute code changes |
| `/team-shinchan:frontend` | Frontend/UI development |
| `/team-shinchan:backend` | Backend/API development |
| `/team-shinchan:devops` | Infrastructure & DevOps |
| `/team-shinchan:review` | Code review |
| `/team-shinchan:vision` | Image/PDF analysis |

### Verification
| Command | Description |
|---------|-------------|
| `/team-shinchan:verify-implementation` | Run full verification suite |
| `/team-shinchan:verify-agents` | Verify agent schema |
| `/team-shinchan:verify-skills` | Verify skill files |
| `/team-shinchan:verify-consistency` | Verify cross-references |
| `/team-shinchan:verify-workflow` | Verify workflow state |
| `/team-shinchan:verify-memory` | Verify memory system |
| `/team-shinchan:verify-budget` | Verify token budget |

### Memory & Utility
| Command | Description |
|---------|-------------|
| `/team-shinchan:memories` | View learned memories |
| `/team-shinchan:learn` | Add to memory |
| `/team-shinchan:forget` | Remove memory |
| `/team-shinchan:work-log` | Query work tracker events |
| `/team-shinchan:manage-skills` | Manage plugin skills |
| `/team-shinchan:help` | Show help |

---

## Quick Triggers

No commands needed - just say:

| Say This | Activates |
|----------|-----------|
| "ulw", "fast", "parallel" | Ultrawork (parallel mode) |
| "until done", "complete it" | Ralph (persistence mode) |
| "autopilot", "auto" | Autopilot (autonomous) |
| "debate", "pros and cons" | Debate system |
| "analyze", "debug", "why" | Deep analysis |

---

## How Skills Work

**Skills are not just documentation - they automatically invoke specialist agents.**

```
/team-shinchan:start
       │
       ▼
┌──────────────────────────────────────┐
│  Task(subagent_type="shinnosuke")    │  ← Auto-invoked
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│  Shinnosuke orchestrates:            │
│  ├─ Nene (planning)                  │
│  ├─ Shiro (exploration)              │
│  ├─ Bo/Aichan/Bunta (implementation) │
│  └─ Action Kamen (review)            │
└──────────────────────────────────────┘
```

| Skill | Auto-Invokes |
|-------|--------------|
| `/start` | Shinnosuke → Full workflow |
| `/plan` | Nene → Structured planning |
| `/analyze` | Hiroshi → Deep analysis |
| `/deepsearch` | Shiro → Masumi |
| `/debate` | Midori → Expert panel |
| `/autopilot` | Shinnosuke → Autonomous mode |
| `/ultrawork` | Shinnosuke → Parallel execution |
| `/ralph` | Kazama → Persistent loop |
| `/implement` | Bo → Code execution |
| `/frontend` | Aichan → Frontend/UI |
| `/backend` | Bunta → Backend/API |
| `/devops` | Masao → Infrastructure |
| `/review` | Action Kamen → Code review |
| `/requirements` | Misae → Requirements analysis |
| `/bigproject` | Himawari → Large project orchestration |

**You run the skill, agents do the work.**

---

## Quick Fix Path

For simple fixes (typo, null check, import fix), Team-Shinchan skips the full workflow:

```
User: "Fix the null check in user.ts line 42"

👦 [Shinnosuke] Quick fix detected → Delegating to Bo
😪 [Bo] Added null check: user?.avatar
🦸 [Action Kamen] APPROVED ✅

Done! No REQUESTS.md or PROGRESS.md needed.
```

**Criteria** (ALL must be true): ≤3 files affected, no design decisions, clear unambiguous fix.

---

## Integrated Workflow

Team-Shinchan follows a structured 4-stage workflow for every non-trivial task, ensuring quality and completeness.

### Overview

```
User Request
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│ Stage 1: REQUIREMENTS                                   │
│ Nene + Misae clarify requirements, debate if needed     │
│ Output: .shinchan-docs/{id}/REQUESTS.md                  │
└─────────────────────┬───────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│ Stage 2: PLANNING                                       │
│ Nene breaks into phases, Shiro analyzes impact          │
│ Output: .shinchan-docs/{id}/PROGRESS.md                  │
└─────────────────────┬───────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│ Stage 3: EXECUTION (per phase)                          │
│ Bo/Aichan/Bunta/Masao implement                         │
│ Action Kamen reviews each phase (MANDATORY)             │
│ Output: Phase retrospectives in PROGRESS.md             │
└─────────────────────┬───────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│ Stage 4: COMPLETION                                     │
│ Masumi writes docs, Action Kamen final review           │
│ Output: RETROSPECTIVE.md + IMPLEMENTATION.md            │
└─────────────────────────────────────────────────────────┘
```

**Want more details?** See the [full workflow guide](docs/workflow-guide.md) for stage-by-stage pseudo-code and checklists.

### When Debate Triggers

| Situation | Debate? |
|-----------|---------|
| 2+ valid implementation approaches | ✅ Yes |
| Architecture change | ✅ Yes |
| Breaking existing patterns | ✅ Yes |
| Performance vs Readability tradeoff | ✅ Yes |
| Simple CRUD operation | ❌ No |
| Clear bug fix | ❌ No |

### Document Structure

Every task creates a documentation folder:

```
.shinchan-docs/
└── ISSUE-123/              # or feature-auth-001/
    ├── REQUESTS.md         # What we're building
    ├── PROGRESS.md         # Phase-by-phase progress
    ├── RETROSPECTIVE.md    # What we learned
    └── IMPLEMENTATION.md   # Technical details
```

---

## Self-Learning System

Team-Shinchan gets smarter with every task through automatic retrospection.

### Learning Cycle

```
┌─────────────────────────────────────────────────────────┐
│                   Learning Cycle                         │
└─────────────────────────────────────────────────────────┘

Task Complete ──→ Auto-Retrospective ──→ Save Learning
                         │
                         ↓
                  .shinchan-docs/learnings.md
                         │
                         ↓
New Session ────→ Load Learnings ────→ Apply to Work
```

### What Gets Learned

| Category | Example |
|----------|---------|
| **Preferences** | "User prefers Zustand over Redux" |
| **Patterns** | "Use early returns for validation" |
| **Conventions** | "This project uses pnpm, not npm" |
| **Mistakes** | "Always null-check before .map()" |
| **Decisions** | "JWT with refresh token rotation" |

### Manual Commands

```bash
# View what's been learned
/team-shinchan:memories

# Manually teach something
/team-shinchan:learn "Always use TypeScript strict mode"

# Remove outdated learning
/team-shinchan:forget
```

---

## What's New in v3.12.0

- **Dashboard Removed** — Replaced HTTP dashboard with zero-dependency JSONL work tracker (`write-tracker.sh`).
- **Work Tracker** — All agent events logged to `.shinchan-docs/work-tracker.jsonl` with auto-rotation at 10K lines.
- **Work Log Skill** — `/team-shinchan:work-log` to query events by agent, type, or session.
- **Zero External Dependencies** — No MCP server, no curl, no port discovery. Just a shell script appending to a file.

---

## FAQ

### Does this replace Claude Code?

No. Team-Shinchan is a **plugin** that enhances Claude Code by adding specialized agents and workflows. You still use Claude Code as normal, but now you have a team of experts instead of one generalist.

### Is it free?

Yes, Team-Shinchan is **MIT licensed** and free to use. Agent calls consume your Claude Code API credits (same as any other Claude conversation). The complexity of your task determines the number of calls.

### How many API calls does it make?

**Quick fixes:** ~3 calls (Bo implements → Action Kamen reviews → done)
**Standard tasks:** 10-30 calls (requirements → planning → execution → completion)
**Complex tasks with debates:** 20-50 calls (includes expert panel discussions)

Each call is purposeful and documented in the workflow.

### Can I use individual agents without the full workflow?

Yes. Each skill works standalone:
- `/team-shinchan:analyze` → Just Hiroshi (deep analysis)
- `/team-shinchan:plan` → Just Nene (planning)
- `/team-shinchan:deepsearch` → Just Shiro + Masumi (search)

Or let Shinnosuke orchestrate the full workflow with `/team-shinchan:start`.

### Does it work with other AI tools?

Currently **Claude Code only**. Team-Shinchan is designed specifically for Claude Code's plugin architecture and uses Claude's multi-agent capabilities.

---

## Quality & Testing

Team-Shinchan is validated by 3 tiers of automated testing:

| Tier | Tests | What It Checks |
|------|-------|----------------|
| Static Validators | 17 | Schema, cross-refs, consistency, API contracts, token budget |
| Agent Behavior (promptfoo) | 25 | Individual agent role adherence |
| E2E Workflow | 11 | Full workflow scenarios (5 types) |

```bash
# Run static tests locally (free, no API key)
./run-tests.sh static

# Run all tests (requires ANTHROPIC_API_KEY)
./run-tests.sh all
```

---

## Credits

Inspired by and built upon:
- [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) by Yeachan Heo
- [oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode) by Yeongyu Kim

---

## License

MIT License

---

<div align="center">

**Team-Shinchan** - Shinchan and friends debate, learn, and grow together!

*Built with love for the Claude Code community*

</div>
