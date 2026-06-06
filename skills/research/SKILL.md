---
name: team-shinchan:research
description: Use when you need web research, documentation lookup, or knowledge gathering.
user-invocable: false
---

# EXECUTE IMMEDIATELY

## Step 1: Validate Input

```
If args is empty or only whitespace:
  Ask user: "What would you like to research?"
  STOP and wait for user response

If args length > 2000 characters:
  Truncate to 2000 characters
  Warn user: "Request was truncated to 2000 characters"
```

## Step 1b: Detect Mode

Parse mode from args:
- If args starts with `youtube ` or `article ` or `auto `: extract mode as first word, remainder is the URL/query.
- If no mode keyword: mode = `auto` for URLs (args starts with `http`), else mode = `search` (standard web search).

Set `target` = the URL/query: the remainder after the mode keyword, or the whole `args` when there is no mode keyword. (`target` is referenced by the Step 2A prompt for every mode.)

Modes `youtube`, `article`, `auto` require a URL. If mode detected but no URL found, ask: "Please provide a URL for {mode} extraction."

## Step 1c: Narrow vs Breadth

- **Narrow** (single source): mode `youtube` / `article` / `auto` (one URL), OR a `search` for a single specific fact/definition ("what is X", "X's default port", one API detail).
- **Breadth** (multi-source): a `search` that is comparative or survey-shaped — triggers include "compare", "vs", "survey", "which … should we", "options for", "best practices for", "investigate", "pros and cons", or anything that benefits from several independent sources.

Route: narrow → **Step 2A** (single Masumi). breadth → **Step 2B** (orchestrator-worker fan-out).

## Step 2A: Narrow research (single Masumi)

```typescript
Task(
  subagent_type="team-shinchan:masumi",
  model="sonnet",
  prompt=`/team-shinchan:research has been invoked.

## Research Request

Mode: ${mode}  <!-- youtube | article | auto | search -->
URL/Query: ${target}

Conduct thorough research and provide:

| Section | Content |
|---------|---------|
| Key Findings | Main discoveries with sources |
| Documentation | Relevant docs and reference links |
| Best Practices | Recommended approaches |
| Caveats | Potential concerns or limitations |

User request: ${args || '(Please describe what to research)'}
`
)
```

## Step 2B: Breadth research — orchestrator-worker fan-out (default)

A single Sonnet pass under-covers a multi-part question. Anthropic's orchestrator-worker Research beat single-agent by 90.2% because each parallel worker spends a full, isolated context on one facet. The SKILL's main loop owns the orchestration (Masumi has no Task tool):

1. **Decompose** `${args}` into 3–5 independent sub-questions, sized to complexity (a 2-way comparison → 2–3; a broad survey → 5).
2. **Fan out** one Masumi worker per sub-question, in PARALLEL:
   ```typescript
   Task(subagent_type="team-shinchan:masumi", model="sonnet",
     prompt=`/team-shinchan:research worker. Parent question: ${args}
   Sub-question (yours only): ${subq}
   Use WebSearch + WebFetch. Return a tight cited brief: Key Findings (with source URLs) | Best Practices | Caveats. Flag low-confidence or conflicting claims explicitly.`)
   ```
3. **Synthesize** with one Masumi pass over the worker briefs:
   ```typescript
   Task(subagent_type="team-shinchan:masumi", model="sonnet",
     prompt=`/team-shinchan:research synthesis. Original question: ${args}
   Worker briefs:
   ${worker_briefs}
   Produce ONE cited report — | Key Findings | Documentation | Best Practices | Caveats | — reconciling conflicts across workers and marking any single-source claim as low-confidence.`)
   ```

Launch workers in parallel (cap ~5, matching the 3–5 subagent guidance).

## Step 2C: Claim-critical → offer native /deep-research (opt-in)

If the breadth research is **claim-critical** (security best practices, a hard-to-reverse vendor/architecture choice, anything feeding an irreversible Stage-2 decision), after Step 2B narrate a one-line opt-in: *"This looks claim-critical — want me to run the native `/deep-research` for adversarial per-claim verification across more sources?"* Do NOT auto-fire it; the user launches `/deep-research`. (Don't reimplement adversarial claim verification here — native deep-research already does it.)
