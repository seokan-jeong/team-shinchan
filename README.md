# 🎭 Team-Shinchan v2.2

**Shinchan character-based multi-agent orchestration system**

A Claude Code plugin with a self-learning system that gets smarter with use.

## ✨ v2.2 New Features

- **🌍 Japanese Character Names**: All characters now use their original Japanese names
- **📝 English Documentation**: All skill documents now in English

### v2.1 Features

- **🗣️ Debate System**: Multiple expert agents debate to find optimal solutions
- **🎭 Midori Agent**: Discussion Moderator for facilitating debates
- **📋 Workflow Checklists**: Copy-paste checklists for each skill
- **📚 Skill Best Practices**: Documentation improved following Claude Skill guidelines

### v2.0 Features

- **🧠 Self-Learning**: Auto-learns patterns, preferences, mistakes from work results
- **🔄 Reflection System**: Auto-reflection and improvement after task completion
- **💾 Memory Management**: Persistent storage and utilization of learnings
- **🚀 Bootstrap**: Automatic analysis on first project run

---

## 🚀 Installation

### Marketplace Installation (Recommended)

```bash
# 1. Add marketplace
claude plugin marketplace add seokan-jeong/team-shinchan

# 2. Install plugin
claude plugin install team-shinchan

# 3. Restart Claude Code
```

### One-Click Script Installation

```bash
curl -fsSL https://raw.githubusercontent.com/seokan-jeong/team-shinchan/main/install.sh | bash
```

### Manual Installation

```bash
# 1. Clone to plugin directory
git clone https://github.com/seokan-jeong/team-shinchan.git ~/.claude/plugins/team-shinchan

# 2. Install dependencies and build
cd ~/.claude/plugins/team-shinchan
npm install && npx tsc --outDir dist

# 3. Restart Claude Code
```

### Update

```bash
# Marketplace method
claude plugin update team-shinchan

# Manual method
cd ~/.claude/plugins/team-shinchan
git pull origin main && npm install && npx tsc --outDir dist
```

---

## 🎭 Agent Team (15 Members)

### Orchestration
| Character | Role | Model | Description |
|-----------|------|-------|-------------|
| **Shinnosuke** | Orchestrator | Opus | Task analysis and delegation |
| **Himawari** | Atlas | Opus | Complex task decomposition |
| **Midori** | Moderator | Opus | Discussion facilitation |

### Execution
| Character | Role | Model | Description |
|-----------|------|-------|-------------|
| **Bo** | Executor | Sonnet | Code writing/modification |
| **Kazama** | Hephaestus | Opus | Complex implementation |

### Specialists
| Character | Role | Model | Description |
|-----------|------|-------|-------------|
| **Aichan** | Frontend | Sonnet | UI/UX development |
| **Bunta** | Backend | Sonnet | Server/API development |
| **Masao** | DevOps | Sonnet | Infrastructure/deployment |

### Advisors (Read-only)
| Character | Role | Model | Description |
|-----------|------|-------|-------------|
| **Hiroshi** | Oracle | Opus | Architecture advice |
| **Nene** | Planner | Opus | Strategic planning |
| **Misae** | Metis | Sonnet | Requirements analysis |
| **Action Kamen** | Reviewer | Opus | Code review |

### Exploration (Read-only)
| Character | Role | Model | Description |
|-----------|------|-------|-------------|
| **Shiro** | Explorer | Haiku | Fast code search |
| **Masumi** | Librarian | Sonnet | Documentation search |
| **Ume** | Multimodal | Sonnet | Image/visual analysis |

---

## 🗣️ Debate System (v2.1)

Multiple expert agents debate to find optimal solutions.

### Discussion Patterns
| Pattern | Description |
|---------|-------------|
| Round Table | Sequential opinions with mutual feedback |
| Dialectic | Thesis ↔ Antithesis → Synthesis |
| Expert Panel | Domain-specific perspectives |

### Automatic Participant Selection
| Topic | Summoned Agents |
|-------|-----------------|
| UI, Frontend | Aichan, Hiroshi |
| API, Backend, DB | Bunta, Hiroshi |
| Deploy, Infrastructure | Masao, Hiroshi |
| Architecture, Design | Hiroshi, Nene, Misae |

### Usage Examples
```
Debate: Should we use React or Vue?
Compare pros and cons: REST API vs GraphQL
Gather opinions: Microservices architecture adoption
```

---

## 🧠 Memory System (v2.0)

### Auto-Learning
The plugin automatically learns:
- **Preferences**: User's coding style, naming conventions
- **Patterns**: Frequently used code patterns
- **Mistakes**: Recurring mistakes and solutions
- **Decisions**: Architecture decisions
- **Conventions**: Project conventions

### Memory Commands
```bash
/memories          # View learned memories
/memories search   # Search memories
/learn "content"   # Manually add learning
/forget <id>       # Delete specific memory
```

### Storage Locations
- **Global**: `~/.team-shinchan/memories/` (shared across all projects)
- **Project**: `.team-shinchan/memories/` (project-specific)

---

## 💡 Skills Usage

| Skill | Trigger | Description |
|-------|---------|-------------|
| `ultrawork` | "ulw", "parallel", "fast" | Parallel execution mode |
| `ralph` | "until done", "complete" | Loop until complete |
| `autopilot` | "auto", "automatically" | Autonomous execution |
| `plan` | "plan", "design" | Planning session |
| `analyze` | "analyze", "debug" | Deep analysis |
| `deepsearch` | "find", "search" | Deep search |
| `debate` | "debate", "opinion", "compare" | Agent debate |

### Examples

```
# Ultrawork mode for fast execution
ulw implement this feature

# Ralph mode until completion
complete it: finish all TODOs

# Autopilot for autonomous execution
autopilot: create REST API

# Debate for optimal solution
debate: state management library selection
```

---

## ⚙️ Configuration

`~/.config/team-shinchan/config.json` or `.team-shinchan/config.json` in project root:

```json
{
  "defaultModel": "sonnet",
  "maxConcurrentAgents": 5,
  "maxRetries": 3,
  "contextWarningThreshold": 50,
  "enableRalphLoop": true,
  "enableTodoEnforcer": true,
  "enableIntentGate": true,
  "enableReviewerCheck": true,
  "language": "en"
}
```

---

## 🏗️ Project Structure

```
team-shinchan/
├── src/
│   ├── agents/              # 15 agents
│   ├── hooks/               # Hook system
│   ├── tools/               # Tools
│   ├── features/
│   │   ├── memory/          # Memory system
│   │   ├── learning/        # Learning engine
│   │   ├── reflection/      # Reflection engine
│   │   ├── context/         # Context injection
│   │   ├── bootstrap/       # Bootstrap
│   │   └── builtin-skills/  # Skills
│   ├── config/              # Configuration
│   ├── shared/              # Shared utilities
│   └── types/               # Type definitions
├── skills/                  # Skill documents
│   ├── debate/              # Debate skill
│   └── ...
├── CLAUDE.md                # System prompt
├── plugin.json              # Plugin manifest
├── install.sh               # Installation script
└── package.json
```

---

## 🤝 Inspiration

This project was inspired by:

- [oh-my-claudecode](https://github.com/anthropics/claude-code) - Claude Code plugin

---

## 📄 License

MIT License

---

**Team-Shinchan v2.2** - Shinchan and friends debate, learn, and grow! 🖍️
