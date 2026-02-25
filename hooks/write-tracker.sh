#!/bin/bash
# Team-Shinchan Work Tracker — JSONL Event Logger
# Replaces send-event.sh (HTTP dashboard) with local JSONL file logging.
#
# Usage: echo '{"agent_type":"team-shinchan:bo"}' | HOOK_EVENT=SubagentStart bash write-tracker.sh
#
# Environment:
#   HOOK_EVENT  - Event type injected by hooks.json
#
# Output: ${PWD}/.shinchan-docs/work-tracker.jsonl (one JSON object per line)

set -euo pipefail

HOOK_EVENT="${HOOK_EVENT:-unknown}"

# ── Paths ──────────────────────────────────────────────────────────────────────
DOCS_DIR="${PWD}/.shinchan-docs"
TRACKER_FILE="${DOCS_DIR}/work-tracker.jsonl"
SESSION_ID_FILE="${DOCS_DIR}/.session-id"
TRACE_ID_FILE="${DOCS_DIR}/.trace-id"
MAX_LINES=10000

# Ensure .shinchan-docs directory exists
mkdir -p "$DOCS_DIR"

# ── Read stdin ─────────────────────────────────────────────────────────────────
INPUT=$(cat)
if [ -z "$INPUT" ]; then
  exit 0
fi

# ── Rotation check ─────────────────────────────────────────────────────────────
# If tracker file exceeds MAX_LINES, archive it
if [ -f "$TRACKER_FILE" ]; then
  LINE_COUNT=$(wc -l < "$TRACKER_FILE" | tr -d ' ')
  if [ "$LINE_COUNT" -gt "$MAX_LINES" ]; then
    ARCHIVE_NAME="work-tracker.$(date +%Y%m%dT%H%M%S).jsonl"
    mv "$TRACKER_FILE" "${DOCS_DIR}/${ARCHIVE_NAME}"
    # Compress in background (non-blocking)
    gzip "${DOCS_DIR}/${ARCHIVE_NAME}" &
  fi
fi

# ── Transform & Append ─────────────────────────────────────────────────────────
if command -v node &>/dev/null; then
  LINE=$(echo "$INPUT" | HOOK_EVENT="$HOOK_EVENT" SESSION_ID_FILE="$SESSION_ID_FILE" TRACE_ID_FILE="$TRACE_ID_FILE" node -e "
    const chunks = [];
    process.stdin.on('data', c => chunks.push(c));
    process.stdin.on('end', () => {
      const fs = require('fs');
      let input;
      try {
        input = JSON.parse(chunks.join(''));
      } catch (e) {
        input = {};
      }

      const event = process.env.HOOK_EVENT || 'unknown';
      const sessionIdFile = process.env.SESSION_ID_FILE || '';
      const traceIdFile = process.env.TRACE_ID_FILE || '';

      // Read session ID
      let sessionId = null;
      if (sessionIdFile) {
        try { sessionId = fs.readFileSync(sessionIdFile, 'utf-8').trim(); } catch(e) {}
      }

      // Read trace ID (optional — backward compatible)
      let traceId = null;
      if (traceIdFile) {
        try { traceId = fs.readFileSync(traceIdFile, 'utf-8').trim(); } catch(e) {}
      }

      // Extract agent name from agent_type (e.g. 'team-shinchan:bo' -> 'bo')
      const extractAgent = (t) => (t ? t.split(':').pop() : null);

      let type = event.toLowerCase();
      let agent = null;
      let data = {};

      switch (event) {
        case 'SubagentStart':
          type = 'agent_start';
          agent = extractAgent(input.agent_type);
          break;

        case 'SubagentStop':
          type = 'agent_done';
          agent = extractAgent(input.agent_type);
          data.content = (input.last_assistant_message || '').slice(0, 500);
          break;

        case 'PostToolUse':
          if (input.tool_name === 'Task' && input.tool_input && input.tool_input.subagent_type) {
            type = 'delegation';
            agent = 'shinnosuke';
            data.to = extractAgent(input.tool_input.subagent_type);
            data.content = (input.tool_input.prompt || '').slice(0, 200);
          } else if (input.tool_name === 'Edit' || input.tool_name === 'Write') {
            type = 'file_change';
            data.file = (input.tool_input.file_path || '').slice(0, 300);
            data.action = input.tool_name === 'Write' ? 'create' : 'modify';
          } else {
            type = 'tool_use';
            data.tool = input.tool_name || 'unknown';
          }
          break;

        case 'UserPromptSubmit':
          type = 'user_prompt';
          data.content = (input.prompt || '').slice(0, 500);
          break;

        case 'Stop':
          type = 'stop';
          data.content = (input.last_assistant_message || '').slice(0, 500);
          break;

        case 'SessionStart': {
          type = 'session_start';
          // Generate new session ID
          const newId = 'session-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
          if (sessionIdFile) {
            try { fs.writeFileSync(sessionIdFile, newId); } catch(e) {}
          }
          sessionId = newId;
          data.model = input.model || 'unknown';
          break;
        }

        case 'SessionEnd': {
          type = 'session_end';
          // Read session ID then delete file
          if (sessionIdFile) {
            try { sessionId = fs.readFileSync(sessionIdFile, 'utf-8').trim(); } catch(e) {}
            try { fs.unlinkSync(sessionIdFile); } catch(e) {}
          }
          data.reason = input.reason || 'unknown';
          break;
        }

        default:
          data.raw = JSON.stringify(input).slice(0, 200);
      }

      const obj = {
        ts: new Date().toISOString(),
        type,
        agent,
        session: sessionId,
        data: Object.keys(data).length > 0 ? data : undefined
      };
      if (traceId) obj.trace = traceId;
      const line = JSON.stringify(obj);
      console.log(line);
    });
  " 2>/dev/null)
else
  # Fallback: no node available — write minimal event
  TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  LINE="{\"ts\":\"${TS}\",\"type\":\"${HOOK_EVENT}\",\"agent\":null,\"session\":null}"
fi

# Append line to tracker file (atomic-ish via >>)
if [ -n "$LINE" ]; then
  echo "$LINE" >> "$TRACKER_FILE"
fi

exit 0
