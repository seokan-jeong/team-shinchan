# ISSUE-xxx: Work Progress Record

## Work Overview
- **Title**: [From REQUESTS.md]
- **Start Date**: [Today's date]
- **Completion Date**: -
- **Current Status**: In Progress

## Phase Progress

| Phase | Title | Status | Completion Date |
|-------|-------|--------|-----------------|
| 1 | [Phase 1 title] | Pending | - |
| 2 | [Phase 2 title] | Pending | - |
| 3 | [Phase 3 title] | Pending | - |

---

## Phase N: [Title]

**Status**: Completed
**Work Period**: YYYY-MM-DD HH:mm ~ HH:mm
**Duration**: X hours Y minutes

### Impact Analysis (Before Phase Start)

**Risk Level**: LOW / MEDIUM / HIGH

| Type | File | Planned Changes |
|------|------|-----------------|
| Direct edit | `src/.../xxx.ts` | [Change description] |
| Reference | `src/.../yyy.ts` | [Reference type, needs update?] |
| Test | `test/.../xxx.test.ts` | [Test update needed?] |

**Search Commands Used:**
```bash
grep -r "ClassName" src/ --include="*.ts"
grep -r "methodName" src/ --include="*.ts"
```

### Work Items
- [Work item 1]
- [Work item 2]

### Modified Files
- `src/...`

### Impact Verification
- [ ] All files in impact table updated
- [ ] All references verified and fixed
- [ ] No broken references to deleted/changed symbols

### Code Review Results

**Review Scope**:
- Reviewed files: X / Changed files: Y
- Review areas: N of 8

**Area Results**:
| # | Area | Result |
|---|------|--------|
| 1 | Architecture | PASS |
| 2 | Code Quality | PASS |
| 3 | State Management | PASS |
| 4 | Error Handling | MEDIUM 1 |
| 5 | Performance | PASS |
| 6 | Security | PASS |
| 7 | Naming Conventions | PASS |
| 8 | Testing | PASS |

**Issue Summary**:
| Severity | Count | Action |
|----------|-------|--------|
| CRITICAL | 0 | - |
| HIGH | 0 | - |
| MEDIUM | 1 | Registered as tech debt |
| LOW | 0 | - |

**Verification**:
- Build: Passed (0 errors)
- Tests: Passed
- Impact verification: Completed

### Phase Retrospective
**What went well**: ...
**Challenges**: ...
**Learnings**: ...

---

## Tech Debt (From Code Review)

> MEDIUM/LOW issues are not fixed immediately, but tracked here for later.

| Phase | Severity | Issue Summary | File:Line | Status |
|-------|----------|---------------|-----------|--------|
| 1 | MEDIUM | Missing error handling | service.ts:12 | Backlog |
| 2 | LOW | Naming inconsistency | xxx.ts | Backlog |

**Status Legend**:
- Backlog: Registered, not addressed
- In Progress: Being fixed
- Resolved: Fixed
- Ignored: Intentionally not fixing (with reason)
