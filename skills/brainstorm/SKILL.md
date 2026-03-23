---
name: team-shinchan:brainstorm
description: Use when you need structured problem exploration before writing requirements.
user-invocable: true
---

# EXECUTE IMMEDIATELY

## Step 1: Validate Input

If args is empty or only whitespace:
  Ask user: "What problem or feature would you like to brainstorm? Describe the goal, not the solution."
  STOP and wait for user response

If args length > 2000 characters:
  Truncate to 2000 characters
  Warn user: "Request was truncated to 2000 characters"

## Step 2: Check for Prior Brainstorm Output

Check if `.shinchan-docs/*/brainstorm-output.md` exists for the current session.
If found: read it and include a note in the Hiroshi prompt: "A prior brainstorm exists. Extend or revise it rather than starting fresh."

## Step 3: Invoke Hiroshi for Problem Exploration

Task(
  subagent_type="team-shinchan:hiroshi",
  model="opus",
  prompt=`/team-shinchan:brainstorm has been invoked.

## Brainstorm Request

Problem/Goal to explore: ${args}

## Your Mission

You are doing structured problem exploration BEFORE requirements. The user may have arrived
with a solution in mind ("add X feature"). Your job is to help them see the problem clearly
before committing to a solution direction.

## Output Format (REQUIRED — use these exact headers)

## Problem Reframe
State the underlying problem in 2-3 sentences. Strip away solution framing.
Example: "The user wants faster search" → "Users cannot find relevant items within their
session window, causing abandonment."

## Alternative Approaches
Present 2-4 alternative approaches to address the problem. For each:

**Option A: [Title]**
- What it is: [1 sentence]
- Pros: [2-3 bullets]
- Cons: [2-3 bullets]
- Complexity: Low / Medium / High
- Best for: [when this option wins]

**Option B: [Title]**
[same structure]

[Option C, D if relevant]

## Recommendation
State which option you recommend and why. Include:
- Primary rationale (1-2 sentences)
- Key assumption that must hold for this recommendation to be correct
- What to validate first before committing

## Rules
- Be concrete. No "it depends" without specifying what it depends on.
- Pros and cons must be specific to this context, not generic.
- Complexity estimates must reference actual implementation effort (lines of code, new dependencies, migration risk).
- If the user's stated solution is one of the options, include it — but also include at least one alternative they may not have considered.

User request: ${args}
`)

## Step 4: Save Brainstorm Output

After Hiroshi completes, if an active WORKFLOW_STATE.yaml exists:
  Save Hiroshi's output to `.shinchan-docs/{DOC_ID}/brainstorm-output.md`
  This allows /team-shinchan:requirements to reference it in Step 1.

## Step 5: Present and Confirm

Present the brainstorm output to the user. Then ask:
  "Ready to proceed with /team-shinchan:requirements? (This will start the full requirements interview based on the recommended path.)"

If user confirms: suggest running /team-shinchan:requirements with the recommended approach as context.
