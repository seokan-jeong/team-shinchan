---
document_type: progress
status: draft
stage: 2
created: "{{CREATED_DATE}}"
doc_id: "{{DOC_ID}}"
source: REQUESTS.md
---

# PROGRESS.md — {{FEATURE_TITLE}}

## Overview

{{OVERVIEW_DESCRIPTION}}

### Architecture Diagram

```mermaid
flowchart TD
    {{DIAGRAM_CONTENT}}
```

---

### Wave Execution Summary

| Wave | Phases | Parallel | Artifact Dependency |
|------|--------|----------|---------------------|
| Wave 1 | {{WAVE_1_PHASES}} | {{WAVE_1_PARALLEL}} | {{WAVE_1_DEPENDENCY}} |

---

## Phase N: {{PHASE_TITLE}} ({{AC_REF}})

**Agent**: {{AGENT_NAME}}
**Wave**: {{WAVE_NUMBER}} | **Parallel**: {{IS_PARALLEL}}
**Depends on**: {{PHASE_DEPENDENCY}}
**artifact_dependency**: {{ARTIFACT_DEPENDENCY}}

### Rationale

{{RATIONALE_DESCRIPTION}}

Alternative rejected: {{ALTERNATIVE_REJECTED}}

### 목표

- {{GOAL_1}}
- {{GOAL_2}}

### 변경 사항

| Action | File | Reason |
|--------|------|--------|
| Create | `{{NEW_FILE_PATH}}` | {{CREATE_REASON}} |
| Modify | `{{EXISTING_FILE_PATH}}` | {{MODIFY_REASON}} |

Cross-reference check:
- {{CROSS_REF_ITEM_1}}

### 성공 기준

- [ ] AC-Na: {{AC_CRITERION_1}}
- [ ] AC-Nb: {{AC_CRITERION_2}}

### Change Log

| Date | Author | Note |
|------|--------|------|
| {{CREATED_DATE}} | {{AUTHOR}} | Phase defined |

---

## Risk Register

| ID | Phase | Risk | Severity | Mitigation |
|----|-------|------|----------|------------|
| R-1 | {{RISK_PHASE}} | {{RISK_DESCRIPTION}} | {{RISK_SEVERITY}} | {{RISK_MITIGATION}} |

---

## Effort Estimates

| Phase | FR | Files Changed | Effort | Agent |
|-------|----|---------------|--------|-------|
| Phase N | {{FR_REF}} | {{FILES_COUNT}} | {{EFFORT_SIZE}} | {{AGENT_NAME}} |

---

## Validation Checklist

- [ ] All FR items assigned to phases
- [ ] All NFR items addressed
- [ ] All HR items addressed
- [ ] All risks have mitigations
- [ ] All AC items covered by phase success criteria
- [ ] File conflict analysis complete
- [ ] Wave grouping validated — no file conflicts within same wave
- [ ] artifact_dependency set where required
- [ ] User approval pending
