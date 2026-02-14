# Debate Workflow Details

> **Authoritative source**: The debate process is fully defined in [agents/midori.md](/agents/midori.md).
> This file provides a summary reference only.

## Debate Patterns (from midori.md)

| Pattern | Use Case | Rounds |
|---------|----------|--------|
| Lightweight | Simple 2-option debates | 1 round |
| Round Table (default) | Standard debates | 2-3 rounds |
| Dialectic | Deep 2-option exploration | 2 rounds + synthesis |
| Expert Panel | Complex multi-stakeholder | 2+ rounds |

## Process Summary

1. **Panel Assembly**: Select experts based on topic keywords
2. **Opinion Collection**: Parallel Task calls to panel members (3-5 sentences each)
3. **Discussion**: If disagreement, additional rounds (max 3 total)
4. **Synthesis**: Hiroshi synthesizes all opinions via Task
5. **Decision**: Report final decision with rationale

## Key Rules

- All opinions MUST come from actual Task calls (never simulated)
- Maximum 3 rounds (usually 2 sufficient)
- Debate valid with minimum 2 panelists
- Record decision in agents/_shared/debate-decisions.md

> For full panel selection criteria, debate templates, and error handling, see [agents/midori.md](/agents/midori.md).
