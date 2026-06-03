---
description: Code review and verification with Action Kamen (correctness, security, quality)
---

# Review Command

Thorough code review covering correctness, security, performance, code quality, and test coverage.

See `skills/review/SKILL.md` for full documentation.

## Usage

```
/team-shinchan:review [code, file paths, or description of what to review]
```

## Examples

```
/team-shinchan:review "src/auth/login.ts"
/team-shinchan:review "Review my recent changes to the payment module"
/team-shinchan:review "Check the new API endpoints for security issues"
```

## Two tiers

This command is **Tier 1** — one thorough Action Kamen pass, cheap and delegatable. For high-stakes scope (pre-release, security/payment/auth boundary, data-loss path), escalate to **Tier 2 — `/team-shinchan:fierce-review`**, a deterministic Workflow with independent per-dimension agents, per-finding adversarial verification, a completeness critic, and a schema-validated rubric judge.
