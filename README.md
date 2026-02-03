# Team-Shinchan

<div align="center">

<img src="https://i.pinimg.com/1200x/1c/06/b0/1c06b009abbb5c764ba8335b827e3421.jpg" alt="Shinchan" width="400"/>

**15 Shinchan character agents that debate, plan, execute, and learn.**

*Stop doing everything yourself - orchestrate a team.*

[![Version](https://img.shields.io/badge/version-2.7.0-blue.svg)](https://github.com/seokan-jeong/team-shinchan/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Plugin-purple.svg)](https://claude.ai)

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

💭 [Midori] Design decision needed. Starting debate...

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

## Integrated Workflow

When you start a task, Team-Shinchan follows this workflow:

```
┌─────────────────────────────────────┐
│  Stage 1: Requirements              │
│  └─ Nene interviews, Midori debates │
└─────────────────┬───────────────────┘
                  ↓
┌─────────────────────────────────────┐
│  Stage 2: Planning                  │
│  └─ Nene plans, Shiro analyzes      │
└─────────────────┬───────────────────┘
                  ↓
┌─────────────────────────────────────┐
│  Stage 3: Execution                 │
│  └─ Bo/Aichan/Bunta + Action Kamen  │
└─────────────────┬───────────────────┘
                  ↓
┌─────────────────────────────────────┐
│  Stage 4: Completion                │
│  └─ Masumi documents, final review  │
└─────────────────────────────────────┘
```

All documentation saved to `shinchan-docs/{task-id}/`

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

## License

MIT License

---

<div align="center">

**Team-Shinchan** - Shinchan and friends debate, learn, and grow together!

*Built with love for the Claude Code community*

</div>
