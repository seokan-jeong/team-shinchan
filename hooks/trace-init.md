---
name: trace-init
description: Generate a new trace ID for each user prompt to enable request-level tracing
event: UserPromptSubmit
---

# Trace Init Hook

**Generate a unique trace ID at the start of each user prompt.**

## Process

1. Generate a trace ID with format: `trace-{timestamp}-{random4hex}`
   - `{timestamp}`: current Unix timestamp in milliseconds (e.g. `1709312400000`)
   - `{random4hex}`: 4 random hex characters (e.g. `a3f1`)

2. Write the trace ID to `.shinchan-docs/.trace-id` (overwrite any existing value)

3. This trace ID will be automatically attached to all JSONL events emitted during this prompt's execution by `write-tracker.sh`

## Example

```
trace-1709312400000-a3f1
```

## Rules

- Generate a NEW trace ID on every user prompt (do not reuse)
- Ensure `.shinchan-docs/` directory exists before writing
- This hook runs silently — do not output anything to the user
