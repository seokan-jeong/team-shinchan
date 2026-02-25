---
name: team-shinchan:eval
description: View agent evaluation history and detect performance regressions.
user-invocable: true
---

# Eval Skill

**View agent evaluations, detect regressions, and compare performance.**

## Usage

```bash
/team-shinchan:eval                     # All agents summary
/team-shinchan:eval --agent bo          # Single agent detail
/team-shinchan:eval --regression        # Regression report only
/team-shinchan:eval --compare           # Side-by-side comparison
```

## Arguments

| Arg | Default | Description |
|-----|---------|-------------|
| `--agent {name}` | (all) | Show evaluation for a specific agent |
| `--regression` | false | Show only agents with detected regressions |
| `--compare` | false | Side-by-side comparison of all agents |

## Process

### Step 1: Run Regression Detection

Execute `node src/regression-detect.js .shinchan-docs/eval-history.jsonl --format table`

If `--agent` is provided, add `--agent {name}`.

If file does not exist or is empty:
```
No evaluation history found.
Evaluations are recorded automatically during auto-retrospective.
```

### Step 2: Display Results

**Default (all agents):**
```
Evaluation Summary
  Agent       | Evals | Correctness | Efficiency | Compliance | Quality
  bo          |    12 |     4.2     |    4.5     |    4.0     |   4.3
  aichan      |     8 |     4.0     |    3.8     |    4.2     |   4.1
  ...
```

**--agent (single):**
Show full history with trend arrows and latest notes.

**--regression:**
Filter to only agents where `has_regression` is true.
Show dimension, latest score, moving average, and delta.

**--compare:**
```
Agent Comparison (last 5 evaluations)
  Dimension    | bo   | aichan | bunta | masao
  correctness  | 4.2  | 4.0    | 3.8   | 4.5
  efficiency   | 4.5  | 3.8    | 4.2   | 4.0
  compliance   | 4.0  | 4.2    | 4.0   | 3.9
  quality      | 4.3  | 4.1    | 4.3   | 4.2
```

### Step 3: Warnings

If any regressions detected, display:
```
!! Regression detected for {agent} in {dimension}
   Latest: {score} | Avg: {avg} | Delta: {delta}
   Action: Review recent {agent} outputs and adjust prompts.
```

## Important

- Eval history: `.shinchan-docs/eval-history.jsonl`
- Detection script: `src/regression-detect.js`
- Dimensions: correctness, efficiency, compliance, quality (1-5 scale)
- Moving average window: last 5 evaluations per agent
