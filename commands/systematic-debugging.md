---
description: 4-phase systematic debugging with root-cause analysis
---

# Systematic Debugging Command

4-phase root-cause debugging process: investigate, analyze, hypothesize, implement.

See `skills/systematic-debugging/SKILL.md` for full documentation.

## Usage

```
/team-shinchan:systematic-debugging [bug description or failing test]
```

## Examples

```
/team-shinchan:systematic-debugging "Tests in auth module failing after refactor"
/team-shinchan:systematic-debugging "API returns 500 on POST /users with valid payload"
/team-shinchan:systematic-debugging "Race condition in background job processor"
```
