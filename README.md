<div align="center">

# 🖍️ Team-Shinchan

<img src="https://i.pinimg.com/1200x/1c/06/b0/1c06b009abbb5c764ba8335b827e3421.jpg" alt="Shinchan" width="600"/>

### *"Stop doing everything yourself. Let the team handle it."*

**15 Shinchan character agents that debate, plan, execute, and learn together.**

[![Version](https://img.shields.io/badge/version-3.0.0--rc1-blue.svg)](https://github.com/seokan-jeong/team-shinchan/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Plugin-purple.svg)](https://claude.ai)
![GitHub stars](https://img.shields.io/github/stars/seokan-jeong/team-shinchan?style=social)

[**Quick Start**](#installation) • [**Commands**](#commands) • [**How It Works**](#how-skills-work) • [**The Team**](#the-team-15-agents)

</div>

---

## Why Team-Shinchan?

| Problem | Solution |
|---------|----------|
| Making architectural decisions alone | **Debate System**: Multiple expert agents discuss and reach consensus |
| Slow sequential task execution | **Parallel Execution**: 5x faster with coordinated agents |
| Forgetting project conventions | **Learning Memory**: Remembers and applies your preferences |
| Incomplete task tracking | **Integrated Workflow**: Requirements → Planning → Execution → Review |

---

## Use Cases

### 1. Debate-Driven Design Decisions

```
User: Add OAuth2 authentication

💭 [Shinnosuke] Design decision needed. Starting debate...

   👩 [Aichan] JWT is better for frontend SPA
   👨 [Bunta] Session is simpler for backend
   🧓 [Hiroshi] Hybrid approach: JWT + refresh tokens

   ✅ Consensus: JWT with refresh token rotation
```

### 2. Parallel Execution for Speed

```
User: ulw fix all TypeScript errors

⚡ Running in parallel:
├─ 🔨 [Bo] Fixing src/auth/*.ts (3 errors)
├─ 🔨 [Bo] Fixing src/api/*.ts (4 errors)
└─ 🔨 [Bo] Fixing src/utils/*.ts (5 errors)

✅ Completed in 2 minutes (vs ~10 minutes sequential)
```

### 3. Self-Learning Memory

```
# Week 1
User: Use Zustand for state management
🧠 Learned: "Prefer Zustand over Redux"

# Week 2
User: Add user preferences feature
🔨 [Aichan] Implementing with Zustand (remembered!)
```

---

## Installation

### From Marketplace (Recommended)

```bash
# Add marketplace and install
/plugin marketplace add seokan-jeong/team-shinchan
/plugin install team-shinchan
```

### One-Click Install

```bash
curl -fsSL https://raw.githubusercontent.com/seokan-jeong/team-shinchan/main/install.sh | bash
```

### Manual Install

```bash
git clone https://github.com/seokan-jeong/team-shinchan.git ~/.claude/plugins/team-shinchan
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
| **Midori** | Debate Guide (Reference) |

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
| `/debate` | Shinnosuke → Expert panel |
| `/autopilot` | Shinnosuke → Autonomous mode |
| `/ultrawork` | Shinnosuke → Parallel execution |
| `/ralph` | Kazama → Persistent loop |

**You run the skill, agents do the work.**

---

## Commands

| Command | Description |
|---------|-------------|
| `/team-shinchan:start` | Start integrated workflow |
| `/team-shinchan:debate` | Trigger expert debate |
| `/team-shinchan:plan` | Planning session |
| `/team-shinchan:analyze` | Deep analysis |
| `/team-shinchan:deepsearch` | Codebase search |
| `/team-shinchan:autopilot` | Autonomous execution |
| `/team-shinchan:ultrawork` | Parallel execution |
| `/team-shinchan:ralph` | Loop until complete |
| `/team-shinchan:memories` | View learned memories |
| `/team-shinchan:learn` | Add to memory |
| `/team-shinchan:forget` | Remove memory |
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

## Quick Fix Path

For simple fixes (typo, null check, import fix), Team-Shinchan skips the full workflow:

```
User: "Fix the null check in user.ts line 42"

👦 [Shinnosuke] Quick fix detected → Delegating to Bo
🔨 [Bo] Added null check: user?.avatar
🦸 [Action Kamen] APPROVED ✅

Done! No REQUESTS.md or PROGRESS.md needed.
```

**Criteria** (ALL must be true): single file change, no design decisions, clear unambiguous fix.

---

## Integrated Workflow

Team-Shinchan follows a 4-stage workflow for every non-trivial task.

### Overview

```
User Request
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│ Stage 1: REQUIREMENTS                                   │
│ "What exactly do we need to build?"                     │
│                                                         │
│ 👧 Nene: Interviews user for clarity                    │
│ 👩 Misae: Discovers hidden requirements                 │
│ 👦 Shinnosuke: Orchestrates debate (if needed)          │
│                                                         │
│ 📄 Output: shinchan-docs/{id}/REQUESTS.md               │
└─────────────────────┬───────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│ Stage 2: PLANNING                                       │
│ "How should we break this down?"                        │
│                                                         │
│ 👧 Nene: Breaks into phases with acceptance criteria    │
│ 🐕 Shiro: Analyzes codebase impact                      │
│                                                         │
│ 📄 Output: shinchan-docs/{id}/PROGRESS.md               │
└─────────────────────┬───────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│ Stage 3: EXECUTION (per phase)                          │
│ "Build it right."                                       │
│                                                         │
│ For each phase:                                         │
│ ├─ 🐕 Shiro: Impact analysis                            │
│ ├─ 👦 Shinnosuke: Orchestrates debate if needed         │
│ ├─ 🔨 Implementation:                                   │
│ │   ├─ 👩 Aichan (Frontend/UI)                          │
│ │   ├─ 👨 Bunta (Backend/API)                           │
│ │   ├─ 👦 Masao (DevOps/Infra)                          │
│ │   └─ 💪 Bo (General code)                             │
│ └─ 🦸 Action Kamen: Code review (MANDATORY)             │
│                                                         │
│ 📄 Output: Phase retrospective in PROGRESS.md           │
└─────────────────────┬───────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│ Stage 4: COMPLETION (automatic)                         │
│ "Document and verify."                                  │
│                                                         │
│ 📚 Masumi: Writes RETROSPECTIVE.md                      │
│ 📚 Masumi: Writes IMPLEMENTATION.md                     │
│ 🦸 Action Kamen: Final verification                     │
│                                                         │
│ 📄 Output: Complete documentation package               │
└─────────────────────────────────────────────────────────┘
```

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
shinchan-docs/
└── ISSUE-123/              # or feature-auth-001/
    ├── REQUESTS.md         # What we're building
    ├── PROGRESS.md         # Phase-by-phase progress
    ├── RETROSPECTIVE.md    # What we learned
    └── IMPLEMENTATION.md   # Technical details
```

### Example: "Add OAuth2 Login"

```
📋 Stage 1: Requirements
   Nene: "Which providers? Google, GitHub?"
   User: "Google only for now"
   Shinnosuke: "JWT vs Session?" → Debate triggered
   → REQUESTS.md created

📋 Stage 2: Planning
   Nene: "3 phases: Backend API, Frontend UI, Integration"
   Shiro: "Impacts: auth/, components/, api/"
   → PROGRESS.md created

📋 Stage 3: Execution
   Phase 1: Bunta implements OAuth API
   Phase 2: Aichan builds login UI
   Phase 3: Bo integrates and tests
   Action Kamen: Reviews each phase

📋 Stage 4: Completion
   Masumi: Documents the implementation
   Action Kamen: Final approval
   → Complete!
```

---

## Self-Learning System

Team-Shinchan gets smarter with every interaction through automatic retrospection.

### How It Works

```
┌─────────────────────────────────────────────────────────┐
│                   Learning Cycle                         │
└─────────────────────────────────────────────────────────┘

Task Complete ──→ Auto-Retrospective ──→ Save Learning
                         │
                         ↓
                  .team-shinchan/learnings.md
                         │
                         ↓
New Session ────→ Load Learnings ────→ Apply to Work
```

### Automatic Learning

After every significant task, Team-Shinchan:
1. **Reflects** on what worked and what didn't
2. **Extracts** patterns, mistakes, and insights
3. **Saves** learnings to `.team-shinchan/learnings.md`
4. **Applies** learnings in future sessions

### Manual Commands

```bash
# View what's been learned
/team-shinchan:memories

# Manually teach something
/team-shinchan:learn "Always use TypeScript strict mode"

# Remove outdated learning
/team-shinchan:forget
```

### What Gets Learned

| Category | Example |
|----------|---------|
| **Preferences** | "User prefers Zustand over Redux" |
| **Patterns** | "Use early returns for validation" |
| **Conventions** | "This project uses pnpm, not npm" |
| **Mistakes** | "Always null-check before .map()" |
| **Decisions** | "JWT with refresh token rotation" |

---

## Quality & Testing

Team-Shinchan is validated by 3 tiers of automated testing:

| Tier | Tests | What It Checks |
|------|-------|----------------|
| Static Validators | 13 | Schema, cross-refs, consistency, API contracts |
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
