---
name: team-shinchan:writing-skills
description: Use when creating or improving a skill using TDD process with trigger scenarios and pressure validation.
user-invocable: true
---

# Writing Skills: TDD Process for Skill Development

> Good skills are written like good tests: define the trigger scenario first, specify expected behavior, then implement.

## Step 1: Define Trigger Scenarios

Before writing any skill content, write 3+ trigger scenarios:

```
Trigger Scenario Format:
  When: [specific user utterance or context]
  Context: [what state the system is in]
  Expected: [what the skill should do / output]
```

If you cannot write a concrete trigger scenario, the skill is not ready. Stop and clarify.

## Step 2: Define Expected Behavior

For each trigger scenario, define:
- **Output format**: what does the skill output?
- **Side effects**: what files are modified?
- **Failure conditions**: when does the skill fail?
- **Boundaries**: what is explicitly OUT of scope?

## Step 3: Implement the Skill

**Frontmatter requirements:**
```yaml
---
name: team-shinchan:{skill-name}
description: Use when {trigger condition, max 20 words}
user-invocable: true|false
---
```

**Content rules:**
- Organize into ## Step N sections
- All Task() calls must specify: subagent_type, model, prompt
- No ambiguous instructions — write the actual logic
- Every claim needs a verification step

**Anti-patterns:**
- `// implement the logic here` — write actual logic
- "Update as needed" — specify exactly what
- "Add error handling" — specify what errors

## Step 4: Pressure Scenario Validation

Before publishing, run against these scenarios:

### P1: Ambiguous Input
Input: empty args or whitespace. Expected: asks for clarification, does NOT crash.

### P2: Invalid Input
Input: path traversal like `../../etc/passwd`. Expected: rejects with clear error.

### P3: Missing Prerequisites
Input: skill invoked when required state doesn't exist. Expected: actionable error message.

### Validation Checklist
- [ ] All 3+ trigger scenarios produce expected behavior
- [ ] Empty input does NOT crash
- [ ] Missing prerequisites produce actionable errors
- [ ] `node tests/validate/skill-schema.js` passes
- [ ] `node tests/validate/skill-format.js` passes
- [ ] KNOWN_SKILLS in cross-refs.js updated
