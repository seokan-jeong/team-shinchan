---
description: Large-scale project orchestration with Himawari (Atlas)
---

# Bigproject Command

Large-scale project orchestration for complex, multi-phase efforts spanning 3+ domains or 20+ files.

See `skills/bigproject/SKILL.md` for full documentation.

## Usage

```
/team-shinchan:bigproject [project description]
```

## When to Use

Use this command when the project meets any of these criteria:
- 3+ phases required
- 20+ files affected
- 3+ domains (frontend + backend + infra)
- Multi-session effort

For smaller tasks, use `/team-shinchan:start` instead.

## Examples

```
/team-shinchan:bigproject "Build a full e-commerce platform with auth, catalog, cart, and payments"
/team-shinchan:bigproject "Migrate monolith to microservices architecture"
/team-shinchan:bigproject "Implement multi-tenant SaaS platform from scratch"
```
