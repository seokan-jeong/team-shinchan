---
name: tool-cache
description: Compress large tool outputs and cache full content to tool-cache/
event: PostToolUse
---

# Tool Output Compression

When a tool output exceeds **2000 characters**, compress it to preserve context window budget.

## When to Trigger

- Any tool output visible in context that exceeds 2000 characters
- Applicable tools: Read, Bash, Glob, Grep (when output is large)
- **Skip if**: `.shinchan-docs/.no-tool-cache` file exists (opt-out)

## Process

### 1. Detect Oversized Output

After any tool use, check if the output exceeds 2000 characters.

### 2. Determine Cache Path

- Find the active doc_id from `.shinchan-docs/*/WORKFLOW_STATE.yaml` with `status: active`
- If found: `.shinchan-docs/{doc_id}/tool-cache/{YYYYMMDD-HHMMSS}-{tool_slug}-{N}.txt`
- If no active workflow: `.shinchan-docs/tool-cache/{YYYYMMDD-HHMMSS}-{tool_slug}-{N}.txt`

Where `{tool_slug}` is the tool name (e.g., `bash`, `read`, `glob`) and `{N}` is a per-session counter.

### 3. Cache Full Content

Write the full tool output to the cache file using the Write tool.

### 4. Show Truncated Preview

Replace the full output in your working context with:

```
[Tool output truncated — {total_chars} chars]
[Cached: .shinchan-docs/{doc_id}/tool-cache/{filename}.txt]
[Preview:]
{first 500 characters of output}
...
```

### 5. Retrieve on Demand

If the full content is needed later, use the Read tool on the cached file path.

## Graceful Degradation

- If the Write tool fails (disk full, permissions): keep the full output in context and skip caching. Log: `[tool-cache] Write failed — keeping full output in context`
- If no `.shinchan-docs/` directory exists: skip caching entirely
- If `.shinchan-docs/.no-tool-cache` sentinel file exists: skip compression entirely

## Rules

- Cache files are stored under `.shinchan-docs/` (already in `.gitignore`)
- Cache files are NOT loaded at session start — they are on-demand only
- Expired cache files are cleaned up by the session-wrap hook (7-day TTL)
- Do not cache Write or Edit tool outputs (only read/query outputs)
