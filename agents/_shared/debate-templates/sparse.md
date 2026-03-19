# Sparse Debate Template

## Topic Structure
- **Category**: sparse
- **Typical Trigger**: Simple 2-domain tradeoff, quick decision, panel size ≤ 3

## Constraints
| Constraint | Value |
|-----------|-------|
| **Max Agents** | 2 (exactly 2 — no more, no less) |
| **Max Rounds** | 2 |
| **Time Budget** | Minimal — resolve within 2 exchanges |

## When to Use
| Condition | Use Sparse? |
|-----------|------------|
| 2-domain tradeoff (e.g., frontend vs backend approach) | ✅ Yes |
| Quick decision with clear alternatives | ✅ Yes |
| Panel size ≤ 3 agents | ✅ Yes |
| 3+ domains involved | ❌ No — use Round Table |
| Architecture change affecting full system | ❌ No — use Expert Panel |
| Security vs performance tradeoff | ❌ No — use Dialectic |

## Recommended Panel Selection
Select the 2 most relevant domain experts:
| Domain Combination | Agent A | Agent B |
|-------------------|---------|---------|
| Frontend vs Backend | Aichan | Bunta |
| Backend vs DevOps | Bunta | Masao |
| Frontend vs DevOps | Aichan | Masao |
| Implementation approach | Hiroshi | Nene |
| Quality vs Speed | Action Kamen | Bo |

## Flow

### Round 1: Position Statement
- **Agent A**: State position with rationale (3-5 sentences)
- **Agent B**: State counter-position with rationale (3-5 sentences)

### Round 2: Rebuttal & Resolution (optional — skip if Round 1 reaches agreement)
- **Agent A**: Brief rebuttal addressing Agent B's points (2-3 sentences)
- **Agent B**: Brief rebuttal addressing Agent A's points (2-3 sentences)
- **Hiroshi**: Synthesis if disagreement persists (final authority)

## Evaluation Criteria
| Criterion | Weight | Description |
|-----------|--------|-------------|
| Simplicity | High | Prefer the simpler solution when tradeoffs are close |
| Domain Fit | High | Does the approach align with the domain's best practices? |
| Risk | Medium | What could go wrong with each approach? |
| Effort | Medium | Implementation effort comparison |

## Output Format
Decision summary (2-3 sentences):
1. Chosen approach and rationale
2. Key tradeoff accepted
3. Any conditions or caveats
