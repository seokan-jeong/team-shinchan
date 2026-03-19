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

set -eo pipefail

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
    command -v gzip &>/dev/null && gzip "${DOCS_DIR}/${ARCHIVE_NAME}" 2>/dev/null &
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
      let stepType = null;

      switch (event) {
        case 'SubagentStart':
          type = 'agent_start';
          agent = extractAgent(input.agent_type);
          // Write current agent for layer-guard.sh
          if (agent) {
            try { fs.writeFileSync(process.cwd() + '/.shinchan-docs/.current-agent', agent); } catch(e) {}
          }
          break;

        case 'SubagentStop':
          type = 'agent_done';
          agent = extractAgent(input.agent_type);
          data.content = (input.last_assistant_message || '').slice(0, 500);
          // Clear current agent to restore parent (orchestrator) context
          try { fs.unlinkSync(process.cwd() + '/.shinchan-docs/.current-agent'); } catch(e) {}
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
          // step_type support (BM-3: ReACT structured logging)
          // Only add step_type if input provides it (optional field for backward compat)
          if (input.step_type && ['thought','action','observation','answer'].includes(input.step_type)) {
            stepType = input.step_type;
          }
          break;

        case 'UserPromptSubmit':
          type = 'user_prompt';
          data.content = (input.prompt || '').slice(0, 500);
          break;

        case 'Stop':
          type = 'stop';
          data.content = (input.last_assistant_message || '').slice(0, 500);
          // FR-P1-1.2: Session cumulative tokens — graceful null if not in payload (HR-2)
          data.total_tokens = (typeof input.total_tokens === 'number') ? input.total_tokens : null;
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
          // FR-P1-1.1: Token fields — graceful null if payload lacks these fields (HR-2)
          data.input_tokens = (typeof input.input_tokens === 'number') ? input.input_tokens : null;
          data.output_tokens = (typeof input.output_tokens === 'number') ? input.output_tokens : null;
          data.cache_read_tokens = (typeof input.cache_read_tokens === 'number') ? input.cache_read_tokens : null;
          data.cache_write_tokens = (typeof input.cache_write_tokens === 'number') ? input.cache_write_tokens : null;
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
      if (stepType) obj.step_type = stepType;  // BM-3: optional ReACT step field
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
