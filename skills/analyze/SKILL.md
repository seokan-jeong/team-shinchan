---
name: team-shinchan:analyze
description: Use when you need deep analysis of code, bugs, performance, or architecture issues.
user-invocable: false
---

# EXECUTE IMMEDIATELY

## Step 1: Validate Input

```
If args is empty or only whitespace:
  Ask user: "What would you like to analyze?"
  STOP and wait for user response

If args length > 2000 characters:
  Truncate to 2000 characters
  Warn user: "Request was truncated to 2000 characters"
```

## Step 1c: Single-pass opt-out

If `args` contains the flag `--single`, skip the panel and run the **Fallback** single-Hiroshi Task at the bottom. Otherwise run the diverse-lens panel. (Match the literal flag only — do NOT substring-match words like "quick", which legitimately appear in targets such as "analyze the quicksort path".)

## Step 2: Diverse-lens analysis panel (default)

Quality-first: a single analyzer sees one frame and systematically misses what that frame can't see (a structural pass overlooks the auth edge case; a correctness pass overlooks the architectural smell). Launch independent **read-only** lenses in PARALLEL, then synthesize.

```typescript
// Lens 1 — architecture / root-cause
Task(subagent_type="team-shinchan:hiroshi", model="opus",
  prompt=`/team-shinchan:analyze (architecture & root-cause lens). READ-ONLY: do not modify any file.
Analyze: ${args}
Focus: structure, dependencies, design seams; if a bug, the most likely root cause with evidence.
Return concrete, file:line-anchored findings + recommended direction.`)

// Lens 2 — correctness / security / failure-mode
Task(subagent_type="team-shinchan:actionkamen", model="opus",
  prompt=`/team-shinchan:analyze (correctness, security & failure-mode lens). READ-ONLY: do not modify any file.
Analyze: ${args}
Focus: logic errors, edge cases, injection/authz, data-loss and failure paths.
Return concrete, file:line-anchored findings.`)

// Lens 3 — hidden requirements / edge cases / implicit assumptions
Task(subagent_type="team-shinchan:misae", model="opus",
  prompt=`/team-shinchan:analyze (hidden-requirements & edge-case lens). READ-ONLY CONTRACT: analysis only — do NOT write any file, do NOT touch WORKFLOW_STATE.yaml / REQUESTS.md, do NOT treat this as Stage 1, do NOT spawn Tasks.
Analyze: ${args}
Focus: unstated requirements, implicit assumptions, edge/empty/error states the happy path ignores.
Return concrete findings.`)
```

If the target is a **bug or incident**, ALSO launch a code-flow trace in parallel:
```typescript
Task(subagent_type="team-shinchan:shiro", model="sonnet",
  prompt=`/team-shinchan:analyze (code-flow trace). READ-ONLY.
Trace the call path relevant to: ${args}. Return the execution path file:line by file:line.`)
```

## Step 3: Synthesize

One Hiroshi pass reconciles the lenses (resolve disagreements — do not just concatenate):

```typescript
Task(subagent_type="team-shinchan:hiroshi", model="opus",
  prompt=`/team-shinchan:analyze synthesis. Reconcile these independent lens analyses into ONE report and explicitly resolve any DISAGREEMENTS between lenses.
Lens findings:
${lens_outputs}
Produce: | Current state | Issues discovered (ranked) | Recommended solutions | File/line references |.`)
```

## Fallback: single-pass analysis (`--single` / delegated)

```typescript
Task(
  subagent_type="team-shinchan:hiroshi",
  model="opus",
  prompt=`/team-shinchan:analyze has been invoked.

## Deep Analysis Request

Perform the following types of analysis:

| Type | Analysis Content |
|------|----------|
| Code Analysis | Structure, dependencies, complexity |
| Bug Analysis | Error cause, stack trace, reproduction conditions |
| Performance Analysis | Bottlenecks, memory, optimization strategies |
| Architecture Analysis | Overall structure, improvements, tradeoffs |

## Result Requirements

- Current state summary
- Issues discovered
- Recommended solutions
- Related file and line references

User request: ${args || '(Please describe what to analyze)'}
`
)
```
