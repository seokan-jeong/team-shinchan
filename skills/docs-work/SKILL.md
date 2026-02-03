---
name: docs-work
description: Issue-based work workflow with docs folder. Invoke with "/docs-work ISSUE-xxx". Phase-based work, review, retrospective, auto-generates RETROSPECTIVE.md + IMPLEMENTATION.md on completion.
user-invocable: true
---

# Docs-Work Skill

**docs-work manages the complete lifecycle of an issue from start to finish.**

---

## Core Principles (CRITICAL)

### 1. Definition of Done

> **Code complete != Work complete**

```
Work complete = Code + RETROSPECTIVE.md + IMPLEMENTATION.md
```

### 2. Completion Checklist

Mandatory checks before closing any issue:
- [ ] PROGRESS.md - All Phases "completed"
- [ ] RETROSPECTIVE.md - Final retrospective written
- [ ] IMPLEMENTATION.md - Implementation doc written
- [ ] Build/tests pass
- [ ] PROGRESS.md header shows "Status: completed"

### 3. Session Continuity Principle

```
PROHIBITED:
Last Phase done -> "Run retrospective?" -> Wait for response -> Session ends

REQUIRED:
Last Phase done -> Immediately start retrospective -> Write docs -> Final report
```

---

## Workflow Overview

```
1. Requirements Gathering (REQUESTS.md)
   - If exists: Read and ask clarifying questions
   - If not: Co-create with user through interview
      |
2. Initialize PROGRESS.md + Phase planning
      |
3. Phase 1~N work (Code -> Review -> Verify -> Phase retrospective)
      | (Don't stop after last Phase)
4. Final retrospective -> Auto-generate RETROSPECTIVE.md
      | (Don't stop)
5. Implementation doc -> Auto-generate IMPLEMENTATION.md
      |
6. Final report + Suggest PR creation
```

---

## Agent Assignments

| Phase | Agent | Role |
|-------|-------|------|
| Requirements analysis | Nene (Planner) | Clarify requirements, plan Phases |
| Impact analysis | Shiro (Explorer) | Find affected files, references |
| Code work | Bo (Executor) | Implement code changes |
| Code review | Action Kamen (Reviewer) | Review each Phase |
| Documentation | Masumi (Librarian) | Generate final documents |
| Final verification | Action Kamen (Reviewer) | Approve completion |

---

## Requirements Gathering (Step 1)

### Case A: REQUESTS.md Exists

1. Read REQUESTS.md thoroughly
2. **Ask clarifying questions** using AskUserQuestion:
   - Ambiguous requirements
   - Missing acceptance criteria
   - Edge cases not covered
   - Priority/scope clarification
3. Update REQUESTS.md with clarified information
4. Confirm final requirements with user before proceeding

### Case B: REQUESTS.md Does Not Exist

**Co-create with user through interview (Nene/Planner leads):**

1. Ask about the goal/problem to solve
2. Ask about expected behavior/outcomes
3. Ask about constraints/limitations
4. Ask about priority and scope
5. Generate REQUESTS.md from interview
6. Present to user for review/approval

### Requirements Interview Questions (Examples)

```
- What problem are you trying to solve?
- What should the end result look like?
- Are there any constraints (tech stack, performance, etc.)?
- What's the priority? (Must-have vs Nice-to-have)
- Any related issues or dependencies?
- How will we verify this is complete?
```

### REQUESTS.md Quality Checklist

Before proceeding to Phase planning:
- [ ] Clear problem statement
- [ ] Defined acceptance criteria
- [ ] Scope boundaries set (what's NOT included)
- [ ] Edge cases identified
- [ ] User has approved the requirements

---

## Invocation

```bash
/docs-work ISSUE-xxx       # Direct invocation
"Work on ISSUE-234"        # Natural language
"Continue to next Phase"   # During work
```

Without arguments: Extract issue ID from git branch or ask

---

## Phase Work Process

### Step 0: Impact Analysis (Required before Phase start)

**Mandatory exploration:**
1. List files to be directly modified
2. Search for references (use Shiro/Explorer)
3. Identify all usages when changing shared models/services
4. Create impact table before proceeding

**Impact Table:**
| Type | File | Planned Changes |
|------|------|-----------------|
| Direct edit | src/.../xxx.ts | [Change description] |
| Reference | src/.../yyy.ts | [Reference type, needs update?] |
| Test | test/.../xxx.test.ts | [Test update needed?] |

**Risk Assessment:**
- HIGH: 5+ files affected
- MEDIUM: 2-4 files affected
- LOW: 1 file affected

---

### Step 1: Execute Work
- Implement Phase requirements from REQUESTS.md
- Track progress with TodoWrite
- Verify all files in impact table are updated

### Step 2: Verification
```bash
# Run appropriate build/test commands
npm run build  # or equivalent
npm test       # or equivalent
```

### Step 3: Code Review (Action Kamen)

**Review timing**: After each Phase completion

**Severity handling:**

| Severity | Action | Record Location |
|----------|--------|-----------------|
| CRITICAL | Fix immediately (within Phase) | PROGRESS.md "Fixes" |
| HIGH | Fix immediately (within Phase) | PROGRESS.md "Fixes" |
| MEDIUM | Register as tech debt | PROGRESS.md "Tech Debt" section |
| LOW | Register as tech debt | PROGRESS.md "Tech Debt" section |

### Step 4: Phase Retrospective (Brief)
- What went well / Challenges / Learnings
- Record in PROGRESS.md

### Step 5: User Checkpoint
```
Phase N complete. Start next Phase?
```

---

## Completion Stage (MANDATORY - Auto-proceed)

After last Phase, **proceed immediately without user confirmation**:

### 1. Final Retrospective -> RETROSPECTIVE.md
- Template: `templates/RETROSPECTIVE_TEMPLATE.md`
- Work stats, goal achievement, good/bad points, key learnings
- Delegate to Masumi (Librarian)

### 2. Implementation Doc -> IMPLEMENTATION.md
- Template: `templates/IMPLEMENTATION_TEMPLATE.md`
- Implementation overview, architecture changes, Phase summaries, file list
- Delegate to Masumi (Librarian)

### 3. Final Report
```
ISSUE-xxx Work Complete!

Generated Documents:
- PROGRESS.md
- RETROSPECTIVE.md
- IMPLEMENTATION.md

-> Create PR?
```

---

## User Response Handling

| Response | Action |
|----------|--------|
| "yes", "ok", "continue" | Execute next step immediately |
| "fix this" | Fix and re-report |
| "stop", "later" | Save PROGRESS.md and exit |

**On positive response: Always execute actual work with tools (Read, Edit, Bash, etc.)**

---

## Document Structure

```
shinchan-docs/ISSUE-xxx/
├── REQUESTS.md        # Requirements (co-created with user or reviewed)
├── PROGRESS.md        # Progress record (AI updates)
├── RETROSPECTIVE.md   # Final retrospective (generated on completion)
└── IMPLEMENTATION.md  # Implementation doc (generated on completion)
```

Templates location: `skills/docs-work/templates/`

---

## Error Handling

| Situation | Action |
|-----------|--------|
| shinchan-docs folder missing | Guide folder creation |
| REQUESTS.md missing | Provide template |
| Build/test fails | Fix and re-verify |

---

## Version History

### v1.0 (2026-02-03)
- Initial team-shinchan adaptation
- Integrated with Nene, Shiro, Bo, Action Kamen, Masumi agents
- "Code complete != Work complete" principle
- Mandatory auto-proceed for completion stage
