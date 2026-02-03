---
description: Start a new task with the integrated workflow
---

# Start Command

Explicitly start the Team-Shinchan integrated workflow for a new task.

## Usage

```bash
/team-shinchan:start                    # Auto-generate ID from branch
/team-shinchan:start ISSUE-123          # Use specific issue ID
/team-shinchan:start "Add user auth"    # Start with description
```

## What Happens

```
🚀 [Shinnosuke] Starting new task...

📁 Created: shinchan-docs/{DOC_ID}/

📋 Stage 1: Requirements
├─ Nene: Interview for requirements
├─ Midori: Debate if design decision needed
└─ Create REQUESTS.md

📋 Stage 2: Planning
├─ Nene: Break into phases
├─ Shiro: Impact analysis
└─ Create PROGRESS.md

📋 Stage 3: Execution (per phase)
├─ Shiro: Phase impact analysis
├─ Bo/Aichan/Bunta/Masao: Implementation
└─ Action Kamen: Review

📋 Stage 4: Completion (auto)
├─ Masumi: RETROSPECTIVE.md
├─ Masumi: IMPLEMENTATION.md
└─ Action Kamen: Final verification
```

## Document ID Generation

| Input | Folder Created |
|-------|----------------|
| `ISSUE-123` | `shinchan-docs/ISSUE-123/` |
| No ID (branch: feature-x) | `shinchan-docs/feature-x-001/` |
| No ID (branch: main) | `shinchan-docs/main-001/` |

## Example

```bash
/team-shinchan:start ISSUE-789

🚀 [Shinnosuke] Starting new task...
📁 Created: shinchan-docs/ISSUE-789/
📋 Nene will now gather requirements.

❓ What problem are you trying to solve?
```
