---
document_type: docs
status: stable
doc_id: "main-068"
phase: 5
source: PLAN.md
---

# HOOKS — Dashboard Integration

This note documents how the Phase 3–5 dashboard (`src/dashboard/`) interacts with the existing `hooks/hooks.json` registry, and why the Phase 5 changes do **not** require new hook entries. AK Stage 2 finding **MEDIUM-3** asked us to verify the hook schema is present and reachable; this note records that verification.

## Hook schema present (MEDIUM-3 resolution)

- File: `hooks/hooks.json` (root-relative, ~9 KB, version `2.0` per its `_meta` block).
- `SessionStart` hook chain (lines 269–301): runs `write-tracker.sh`, `session-init.sh`, `ontology-auto-build.sh` in order.
- `SessionEnd` hook chain (lines 302–314): runs `write-tracker.sh`.
- Both blocks use the `matcher: "*"` wildcard.

The schema is well-formed and resolves at session boundary without manual intervention. No new hook needs to be added in Phase 5 because the dashboard server is **not** auto-started by Claude — the user runs `npm run dashboard` (or `node src/dashboard/index.js`) in a separate terminal whenever they want a live view.

## Dashboard ↔ Claude session isolation (NFR-7)

The dashboard process and the Claude Code session are deliberately **decoupled**:

| Surface | Dashboard | Claude session |
|---------|-----------|-----------------|
| Process | `node src/dashboard/index.js` (foreground or backgrounded by the user) | Claude Code CLI |
| File I/O | Reads `.shinchan-docs/**`, writes ONLY `WORKFLOW_STATE.yaml` via atomic rename | Reads / writes `.shinchan-docs/**`, agents/, src/, etc. |
| IPC | None — no FIFO, no socket to Claude | None — no callback into the dashboard |
| Hook trigger | Never — the dashboard does not emit hook events to Claude | Hook events emitted by Claude pass through `hooks.json` to `hooks/*.sh` |
| State observation | Polls `WORKFLOW_STATE.yaml` via `fs.watch` (with polling fallback) | Reads files directly when an agent issues a `Read` |

Concrete consequence: when the user clicks **pause** in the dashboard, the dashboard rewrites `WORKFLOW_STATE.yaml` via temp-file + rename. Any in-flight Claude `Read` of the same file either sees the OLD inode or the NEW inode — never a partial — because `rename(2)` is atomic on the same filesystem. This is the LOW-1 S3 scenario from `phase-0-decisions.md` § LOW-1 and is exercised by `tests/dashboard/watcher.test.js`.

## What about the dashboard actions (pause/archive/note)?

These actions write only to `WORKFLOW_STATE.yaml`. They do **not** invoke any hook in `hooks.json`. Their result becomes visible to the next Claude agent that reads `WORKFLOW_STATE.yaml` (typically at the next stage transition or via `team-shinchan:resume` / `team-shinchan:status`). This is the desired flow per NFR-7 (Claude session isolated from dashboard side-effects).

Why we deliberately did **not** wire `PostToolUse` to push dashboard updates into the Claude conversation:

1. **Loop avoidance**. A `PostToolUse` hook triggered on every Write would fire dozens of times per phase. Pushing those into the live conversation would interrupt the agent's reasoning context.
2. **Single source of truth**. `WORKFLOW_STATE.yaml` is already the canonical state; any duplication via hook injection would be redundant and would risk drift.
3. **Local-only safety**. The dashboard binds to `127.0.0.1` and never reaches outside the host. Removing the hook bridge keeps the attack surface trivially small (NFR-4).

## What Phase 5 changed in hook-land: nothing

Phase 5 added:

- `src/dashboard/render-md.js` — markdown→HTML renderer with `optionalDependencies` `markdown-it`.
- `src/dashboard/views/file-viewer.js` — iframe-sandboxed viewer for archived `.md`, native `.html`, and text files.
- `src/dashboard/config.js` — `TS_DASHBOARD_MD_RENDER` toggle (`auto` | `iframe` | `pre`).
- CSP `frame-src 'self'` added to `sendText()` in `server.js`.

None of these touch `hooks/hooks.json` or any `hooks/*.sh` script. The dashboard remains a standalone process whose only effect on Claude is through atomic edits of `WORKFLOW_STATE.yaml`.

## Operational checklist for users

| What you do | What happens |
|-------------|--------------|
| `npm run dashboard` in a terminal | Dashboard binds to 127.0.0.1:8765 (falls back 8766 / 8767). No hook event fires. |
| Visit `http://localhost:8765/` | HTML page is served with full CSP (incl. `frame-src 'self'`). |
| Click an archived `.md` file in a card's files list | Browser navigates to `/api/file?path=…&view=html`, server returns iframe-sandboxed viewer. The Claude session is unaffected. |
| Click **pause** on a card | `WORKFLOW_STATE.yaml` is rewritten via temp+rename. The next Claude `Read` of that file sees the new state. No hook fires. |
| Close the dashboard terminal (Ctrl-C) | SIGTERM triggers graceful shutdown (server `.close()` + watcher `.close()`). Claude is unaffected. |
| Claude finishes a `SessionEnd` event | `hooks.json` SessionEnd fires `write-tracker.sh`. Dashboard (if running) sees the resulting `work-tracker.jsonl` append via its tail reader. |

## Reference

- `hooks/hooks.json` — registry (read-only as far as Phase 5 is concerned).
- `src/dashboard/server.js` — atomic write + CSP source.
- `.shinchan-docs/main-068/phase-0-decisions.md` § LOW-1 — concurrency scenarios.
- `.shinchan-docs/main-068/PLAN.md` Phase 5 — full change list.

## Change log

| Date | Author | Note |
|------|--------|------|
| 2026-05-17 | kazama | Created during Phase 5 — confirms `hooks.json` schema exists, documents dashboard ↔ Claude isolation, records that Phase 5 adds no new hooks. |
