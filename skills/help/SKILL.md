---
name: team-shinchan:help
description: Guide for using Team-Shinchan plugin's agents, skills, and memory system. Use when you need help.
user-invocable: true
---

# Help Skill

## Agent Team

### Orchestration

| Character | Role | Description |
|-----------|------|-------------|
| Shinnosuke | Orchestrator | Task analysis and delegation |
| Himawari | Atlas | Complex task decomposition |

### Execution

| Character | Role | Description |
|-----------|------|-------------|
| Bo | Executor | Code writing/modification |
| Kazama | Hephaestus | Complex implementation |

### Specialists

| Character | Role | Description |
|-----------|------|-------------|
| Aichan | Frontend | UI/UX development |
| Bunta | Backend | Server/API development |
| Masao | DevOps | Infrastructure/deployment |

### Advisors (Read-only)

| Character | Role | Description |
|-----------|------|-------------|
| Hiroshi | Oracle | Architecture advice |
| Nene | Planner | Strategic planning |
| Misae | Metis | Requirements analysis |
| Action Kamen | Reviewer | Code review |
| Midori | Debate Moderator | Structured debate facilitation |

### Exploration (Read-only)

| Character | Role | Description |
|-----------|------|-------------|
| Shiro | Explorer | Fast code search |
| Masumi | Librarian | Documentation search |
| Ume | Multimodal | Image analysis |

## Skills List

### Workflow

| Skill | Trigger | Description |
|-------|---------|-------------|
| `/start` | start, begin | Start integrated workflow |
| `/resume` | resume, continue | Resume interrupted workflow |
| `/orchestrate` | orchestrate | Invoke Shinnosuke for full workflow orchestration |
| `/autopilot` | auto, automatically | Autonomous execution |
| `/ralph` | until done, complete | Loop until complete |
| `/ultrawork` | fast, parallel, ulw | Parallel execution |

### Analysis & Planning

| Skill | Trigger | Description |
|-------|---------|-------------|
| `/plan` | plan, design | Planning |
| `/analyze` | analyze, debug | Deep analysis |
| `/deepsearch` | find, search | Code search |
| `/debate` | debate, opinion, compare | Agent debate |
| `/requirements` | what am I missing, risks, edge cases | Hidden requirements analysis |

### Implementation

| Skill | Trigger | Description |
|-------|---------|-------------|
| `/implement` | implement, code this, fix | Quick code implementation |
| `/frontend` | UI, component, React, CSS | Frontend development |
| `/backend` | API, database, server, endpoint | Backend development |
| `/devops` | CI/CD, Docker, deploy, pipeline | DevOps and infrastructure |
| `/bigproject` | big project, multi-phase | Large-scale project orchestration |

### Review & Quality

| Skill | Trigger | Description |
|-------|---------|-------------|
| `/review` | review, check my code | Code review and verification |
| `/verify-implementation` | verify all | Run all validators sequentially |
| `/verify-agents` | - | Validate agent schema compliance |
| `/verify-skills` | - | Validate skill schema and format |
| `/verify-consistency` | - | Validate cross-references and config |
| `/verify-workflow` | - | Validate workflow state and error handling |
| `/verify-memory` | - | Validate memory system configuration |
| `/verify-budget` | - | Validate token budget compliance |
| `/manage-skills` | - | Maintain verification pipeline integrity |

### Utility

| Skill | Trigger | Description |
|-------|---------|-------------|
| `/research` | research, lookup | External research |
| `/vision` | analyze image, read PDF, screenshot | Image and PDF analysis |
| `/status` | status, progress | Show workflow status |
| `/help` | help | This guide |

### Memory

| Skill | Trigger | Description |
|-------|---------|-------------|
| `/memories` | - | View memories |
| `/learn` | - | Add learning |
| `/forget` | - | Delete memory |

## Memory System

Team-Shinchan gets smarter with use:
- Automatically learns patterns, preferences, mistakes
- Applies learnings to future tasks
- `/memories` to view learnings
- `/learn` to manually add learnings
