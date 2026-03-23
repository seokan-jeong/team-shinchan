---
description: Team-Shinchan 4-Stage Workflow rules for structured development
globs: "**/*"
alwaysApply: true
---

# Team-Shinchan Workflow Rules for Cursor

## Rule 1: 4-Stage Workflow

All non-trivial tasks follow a 4-stage process:

| Stage | Name | Purpose | Output |
|-------|------|---------|--------|
| 1 | Requirements | Define what to build and why | REQUESTS.md |
| 2 | Planning | Design implementation phases | PROGRESS.md |
| 3 | Execution | Implement phase by phase | Code changes |
| 4 | Completion | Verify, document, retrospect | RETROSPECTIVE.md |

**Non-trivial** = changes 3+ files, involves design decisions, or affects multiple domains.

## Rule 2: Requirements Stage — No Code Changes

During Stage 1, you MUST NOT write or modify source code. Create REQUESTS.md with:
- Problem Statement, Functional Requirements (FR-01, FR-02...), Scope (In/Out), Acceptance Criteria, Risks

## Rule 3: Planning Stage — Plan Before Implementing

Create PROGRESS.md with phases broken into 2-5 minute tasks, exact file paths, verification commands, and dependencies.

## Rule 4: Execution — One Phase at a Time

Execute phases in dependency order. After each: run verification, confirm AC checkboxes. Fix failures before proceeding.

## Rule 5: Completion — Always Run Final Review

Before declaring done: verify all AC met, run full test suite, write RETROSPECTIVE.md and IMPLEMENTATION.md.

## Rule 6: Agent Routing

| Domain | Keywords | Recommended model |
|--------|----------|-------------------|
| Frontend/UI | React, CSS, component | Any |
| Backend/API | REST, database, ORM | Any |
| DevOps/CI | Docker, CI/CD, pipeline | Any |
| Complex/Cross-domain | 5+ files, architecture | Larger model |

## Rule 7: Model Selection

Score 0-30 (simple) → cheapest model. Score 31-60 (moderate) → standard model. Score 61-100 (complex) → most capable model.
