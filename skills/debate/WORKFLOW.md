# Debate Workflow Details

## Phase 1: Problem Definition and Panel Assembly

Midori(Moderator) analyzes the topic and summons appropriate experts.

**Tasks:**
1. Clarify discussion topic
2. Auto-select participants based on keywords
3. Announce discussion rules

## Phase 2: Opinion Collection

Each agent independently presents their opinion.

**Parallel Execution Example:**
```
Task(subagent_type="team-shinchan:aichan", prompt="Topic: [topic]\nPlease provide your expert opinion.")
Task(subagent_type="team-shinchan:bunta", prompt="Topic: [topic]\nPlease provide your expert opinion.")
```

**Opinion Contents:**
- Core opinion
- Pros
- Cons
- Recommendations

## Phase 3: Discussion Rounds

Share collected opinions and provide mutual feedback.

**Round Progression:**
1. Round 1: Rebuttals/agreements on initial opinions
2. Round 2: Consolidate issues and adjust positions
3. Round 3: Finalize positions

**Early Termination Conditions:**
- All participants reach consensus
- Major issues resolved

## Phase 4: Consensus Building

Hiroshi(Oracle) synthesizes all opinions.

**Synthesis Contents:**
- Summary of each opinion
- Analysis of commonalities and differences
- Optimal solution proposal
- Trade-off explanation

## Phase 5: Verification

Action Kamen(Reviewer) reviews the consensus.

**Verification Criteria:**
- All requirements met
- Technical feasibility
- Potential risks

**Results:**
- ✅ Approved: Consensus finalized
- ❌ Revision needed: Feedback applied and re-debate

## Output Format

```markdown
## Discussion Result

### Topic
[Discussion topic]

### Participants
- Agent A (Role)
- Agent B (Role)

### Opinion Summary
| Agent | Core Opinion | Pros | Cons |
|-------|--------------|------|------|
| A | ... | ... | ... |
| B | ... | ... | ... |

### Discussion Highlights
- Round 1: ...
- Round 2: ...

### Consensus
[Final agreed solution]

### Rationale
- Reason 1
- Reason 2

### Verification Result
✅ Approved / ❌ Revision needed
```
