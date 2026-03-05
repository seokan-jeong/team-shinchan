---
description: Structured problem exploration before requirements (Problem Reframe, Alternatives, Recommendation)
---

# Brainstorm Command

Explores a problem or goal by reframing it, surfacing 2-4 alternative approaches with pros/cons,
and recommending a path. Run this BEFORE /team-shinchan:requirements for better requirements coverage.

See `skills/brainstorm/SKILL.md` for full documentation.

## Usage

/team-shinchan:brainstorm [problem or goal to explore]

## Examples

/team-shinchan:brainstorm "Make the search feature faster"
/team-shinchan:brainstorm "Users are abandoning the checkout flow"
/team-shinchan:brainstorm "We need to support multiple languages"

## Recommended Workflow

1. /team-shinchan:brainstorm "your problem"     ← explore problem space
2. /team-shinchan:requirements "chosen approach" ← collect requirements
3. /team-shinchan:start                           ← begin full workflow
