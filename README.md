<div align="center">

# Team-Shinchan

<img src="https://i.pinimg.com/1200x/1c/06/b0/1c06b009abbb5c764ba8335b827e3421.jpg" alt="Shinchan" width="600"/>

### The Agent Harness for Claude Code

**Guardrails, Observability, Ontology, and Quality Gates for AI-Powered Development**

15 specialist agents with structured workflows, project ontology, budget controls, analytics, and self-learning.

[![Version](https://img.shields.io/badge/version-4.4.0-blue.svg)](https://github.com/seokan-jeong/team-shinchan/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Plugin-purple.svg)](https://claude.ai)
![GitHub stars](https://img.shields.io/github/stars/seokan-jeong/team-shinchan?style=social)

[**Try It**](#try-it-in-2-minutes) | [**Features**](#harness-engineering) | [**Commands**](#commands) | [**The Team**](#15-specialized-agents)

</div>

---

## Why an Agent Harness?

AI agents are powerful but unpredictable. Without constraints, they hallucinate architecture, skip reviews, blow through token budgets, and forget past decisions. An **Agent Harness** solves this by wrapping agents in guardrails, quality gates, and feedback loops -- the same way a test harness wraps code in assertions.

Team-Shinchan turns Claude Code into a **harnessed multi-agent system** where 15 specialists debate, plan, execute, and learn -- all within well-defined boundaries.

| Without a Harness | With Team-Shinchan |
|---|---|
| Agent starts blind, re-reads the whole codebase | Project Ontology auto-builds a knowledge graph on first session |
| Agents skip stages, jump to code | Workflow Guard enforces stage-tool matrix |
| No visibility into agent behavior | Analytics with trace IDs track every action |
| Unlimited token burn | Budget Guard caps spend per session |
| No quality signal on the harness itself | Harness Lint checks plugin integrity |
| Past decisions forgotten | Memory + Ontology + session bridging persist context |
| Code reviewed ad-hoc (or not at all) | Action Kamen reviews every phase (mandatory) |

---

## Harness Engineering

Team-Shinchan is built on 5 Harness Engineering principles:

### 1. Context Engineering

Load the right knowledge at the right time.

- **load-kb** hook injects project knowledge base at session start
- **Project Ontology** auto-builds a knowledge graph of your codebase (entities, relations, dependencies)
- **AGENTS.md** auto-generated map of all 15 agents with roles and capabilities
- **Session bridging** via `session-wrap` and `resume` for cross-session continuity
- **Self-learning memory** accumulates project conventions over time

### 2. Architectural Constraints

Hard boundaries that prevent structural drift.

- **Workflow Guard** -- stage-tool matrix blocks code edits during planning (PreToolUse hook)
- **Layer Enforcement** -- validator ensures agents stay in their architectural layer
- **Rules System** -- 54 rules across coding (14), security (14), testing (13), git (13)
- **Stage-tool matrix** -- 6 tools x 4 stages, enforced automatically

### 3. Guardrails and Quality Gates

Automated checks that prevent bad outcomes.

- **Security Hook** -- blocks secrets, destructive git, sensitive files, large files
- **Budget Guard** -- token budget enforcement with alerts at 80% and hard stop at 100%
- **Deny List** -- 15 pattern rules blocking dangerous operations
- **Self-Check** -- completion checklist all execution agents must pass
- **Action Kamen** -- mandatory code review at every phase boundary

### 4. Feedback Loops

Observability and continuous improvement.

- **Analytics** -- trace IDs, event tracking, agent performance metrics (`src/analytics.js`)
- **Harness Lint** -- static analysis of the harness itself (`src/harness-lint.js`)
- **Eval** -- schema validation and regression detection (`src/eval-schema.js`, `src/regression-detect.js`)
- **Auto-Retrospective** -- extracts learnings after every completed task
- **Garbage Collection** -- lint detects orphaned skills, broken refs, stale configs

### 5. State Management

Durable state across sessions and workflows.

- **WORKFLOW_STATE.yaml** -- structured state file with stage, phase, and progress
- **Trace IDs** -- every agent action tagged for end-to-end traceability
- **Session Wrap** -- auto-summary on session end, persisted to work tracker
- **Resume** -- interrupted workflows resume from last checkpoint
- **Work Tracker** -- JSONL event log with auto-rotation at 10K lines

---

## What's New in v4.3

### v4.3.2 — Hooks Finally Work (Critical Fix)

The root cause of hooks never loading in marketplace installs was found and fixed:

- **`prompt_file` → `prompt`**: Claude Code expects `"prompt"` field for prompt-type hooks, not `"prompt_file"`. This schema mismatch caused ALL 32 hooks to be silently rejected.
- **Duplicate hooks file**: Removed explicit `"hooks"` field from plugin.json — auto-discovery handles `hooks/hooks.json` natively, and the duplicate caused a fatal load error.

### v4.3.0–4.3.1 — Hook Execution Reliability

- **Node.js hook runner** (`scripts/run.cjs`): Cross-platform wrapper for reliable hook execution — stdin piping, env var injection, exit code 2 propagation
- **Commit lint hook**: Enforces conventional commit format (`type(scope): description`, 72-char limit)
- **Branch naming rule**: Enforces `{type}/{description}` branch convention
- **Dependency pinning check**: Blocks `"*"` and `"latest"` in package.json
- **Agent memory expansion**: 10/15 agents now have persistent project memory
- **109-assertion hook test suite**: Automated validation of all hook scripts
- **BASH_SOURCE fallback**, **stdin timeout tuning**, **gzip/openssl checks**

### Earlier Highlights

- **v4.2.0**: 18 enforcement gaps closed — budget hard stop, stage transition gates, read-only agent enforcement, deny-list expansion
- **v4.1.0**: Project Ontology — auto-build knowledge graph at session start, impact analysis, 6 agents enhanced
- **v4.0.0**: Harness foundation — analytics, trace IDs, budget guard, harness lint, eval system, 5-layer architecture

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

If you see the help menu, you are ready to go.

### What's Next?

- Read the [Getting Started Guide](docs/getting-started.md)
- Try `/team-shinchan:start {your task}` to see the full workflow
- Use `/team-shinchan:debate` for design decisions

---

## 15 Specialized Agents

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

41 commands across workflow, specialist, and utility categories:

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

### Analysis and Planning
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
| `/team-shinchan:devops` | Infrastructure and DevOps |
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

### Harness and Ontology
| Command | Description |
|---------|-------------|
| `/team-shinchan:ontology` | Query, manage, and visualize project ontology |
| `/team-shinchan:impact-analysis` | Cascade dependency analysis with risk assessment |
| `/team-shinchan:analytics` | View agent analytics and trace data |
| `/team-shinchan:budget` | Check token budget status |
| `/team-shinchan:lint-harness` | Lint the harness for structural issues |
| `/team-shinchan:eval` | Run eval checks and regression detection |

### Memory and Utility
| Command | Description |
|---------|-------------|
| `/team-shinchan:memories` | View learned memories |
| `/team-shinchan:learn` | Add to memory |
| `/team-shinchan:forget` | Remove memory |
| `/team-shinchan:work-log` | Query work tracker events |
| `/team-shinchan:session-summary` | View session summary |
| `/team-shinchan:manage-skills` | Manage plugin skills |
| `/team-shinchan:help` | Show help |

---

## Quick Triggers

No commands needed -- just say:

| Say This | Activates |
|----------|-----------|
| "ulw", "fast", "parallel" | Ultrawork (parallel mode) |
| "until done", "complete it" | Ralph (persistence mode) |
| "autopilot", "auto" | Autopilot (autonomous) |
| "debate", "pros and cons" | Debate system |
| "analyze", "debug", "why" | Deep analysis |

---

## How Skills Work

**Skills are not just documentation -- they automatically invoke specialist agents.**

```
/team-shinchan:start
       |
       v
+--------------------------------------+
|  Task(subagent_type="shinnosuke")    |  <- Auto-invoked
+------------------+-------------------+
                   v
+--------------------------------------+
|  Shinnosuke orchestrates:            |
|  +-- Nene (planning)                 |
|  +-- Shiro (exploration)             |
|  +-- Bo/Aichan/Bunta (implementation)|
|  +-- Action Kamen (review)           |
+--------------------------------------+
```

| Skill | Auto-Invokes |
|-------|--------------|
| `/start` | Shinnosuke -> Full workflow |
| `/plan` | Nene -> Structured planning |
| `/analyze` | Hiroshi -> Deep analysis |
| `/deepsearch` | Shiro -> Masumi |
| `/debate` | Midori -> Expert panel |
| `/autopilot` | Shinnosuke -> Autonomous mode |
| `/ultrawork` | Shinnosuke -> Parallel execution |
| `/ralph` | Kazama -> Persistent loop |
| `/implement` | Bo -> Code execution |
| `/frontend` | Aichan -> Frontend/UI |
| `/backend` | Bunta -> Backend/API |
| `/devops` | Masao -> Infrastructure |
| `/review` | Action Kamen -> Code review |
| `/requirements` | Misae -> Requirements analysis |
| `/bigproject` | Himawari -> Large project orchestration |
| `/ontology` | Ontology engine -> Knowledge graph |
| `/impact-analysis` | Ontology engine -> Dependency cascade |

**You run the skill, agents do the work.**

---

## Plugin Inventory

| Component | Count | Location |
|-----------|-------|----------|
| Agents | 15 | `agents/` |
| Skills | 41 | `skills/` |
| Commands | 41 | `commands/` |
| Hooks | 32 entries (13 shell + 15 prompt) | `hooks/` |
| Validators | 23 | `tests/validate/` |
| Rules | 4 categories (54 rules) | `rules/` |
| Src Scripts | 9 | `src/` |

---

## Quality and Testing

Team-Shinchan is validated by 3 tiers of automated testing:

| Tier | Tests | What It Checks |
|------|-------|----------------|
| Static Validators | 23 | Schema, cross-refs, consistency, API contracts, token budget, layer enforcement, agents-map, ontology integrity, hook execution |
| Agent Behavior (promptfoo) | 25 | Individual agent role adherence |
| E2E Workflow | 11 | Full workflow scenarios (5 types) |

```bash
# Run static tests locally (free, no API key)
./run-tests.sh static

# Run all tests (requires ANTHROPIC_API_KEY)
./run-tests.sh all
```

---

## FAQ

### Does this replace Claude Code?

No. Team-Shinchan is a **plugin** that enhances Claude Code by adding specialized agents, guardrails, and observability. You still use Claude Code as normal, but now with harnessed agents instead of one generalist.

### Is it free?

Yes, Team-Shinchan is **MIT licensed** and free to use. Agent calls consume your Claude Code API credits (same as any other Claude conversation). The Budget Guard helps you control spend.

### How many API calls does it make?

**Quick fixes:** ~3 calls (Bo implements -> Action Kamen reviews -> done)
**Standard tasks:** 10-30 calls (requirements -> planning -> execution -> completion)
**Complex tasks with debates:** 20-50 calls (includes expert panel discussions)

Each call is purposeful, traced, and documented in the workflow.

### Can I use individual agents without the full workflow?

Yes. Each skill works standalone:
- `/team-shinchan:analyze` -> Just Hiroshi (deep analysis)
- `/team-shinchan:plan` -> Just Nene (planning)
- `/team-shinchan:deepsearch` -> Just Shiro + Masumi (search)

Or let Shinnosuke orchestrate the full workflow with `/team-shinchan:start`.

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

**Team-Shinchan** -- The Agent Harness for Claude Code

*Guardrails, Observability, and Quality Gates for AI-Powered Development*

</div>
