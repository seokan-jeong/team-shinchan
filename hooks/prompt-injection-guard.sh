#!/usr/bin/env bash
# prompt-injection-guard.sh — Scan files for prompt injection patterns
# Hook: PreToolUse (Read only)
# Inspired by: hermes-agent prompt_builder.py

set -euo pipefail

TOOL_NAME="${CLAUDE_TOOL_NAME:-}"
[[ "$TOOL_NAME" != "Read" ]] && exit 0

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
[[ -z "$FILE_PATH" || ! -f "$FILE_PATH" ]] && exit 0

# Skip plugin files and shinchan-docs
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-}"
[[ -n "$PLUGIN_ROOT" && "$FILE_PATH" == "$PLUGIN_ROOT"* ]] && exit 0
[[ "$FILE_PATH" == *".shinchan-docs/"* ]] && exit 0

# Skip binary files
file "$FILE_PATH" 2>/dev/null | grep -qv text && exit 0

# Size guard: skip files > 1MB
FILE_SIZE=$(wc -c < "$FILE_PATH" 2>/dev/null || echo 0)
(( FILE_SIZE > 1048576 )) && exit 0

WARNINGS=()

# 1. Invisible Unicode characters
if LC_ALL=C grep -Pq '[\x{200b}-\x{200f}\x{202a}-\x{202e}\x{2060}\x{feff}]' "$FILE_PATH" 2>/dev/null; then
  WARNINGS+=("invisible-unicode")
fi

# 2. Prompt injection threat patterns
while IFS= read -r pattern; do
  if grep -iq "$pattern" "$FILE_PATH" 2>/dev/null; then
    WARNINGS+=("threat:${pattern}")
    break  # One threat match is enough
  fi
done <<'PATTERNS'
ignore previous instructions
ignore all previous
system prompt override
you are now
new instructions:
disregard above
forget everything
override safety
do not follow
bypass security
PATTERNS

# 3. Credential exfiltration attempts
if grep -Pq 'curl\s.*\$[A-Z_]{3,}' "$FILE_PATH" 2>/dev/null || \
   grep -Pq 'wget\s.*\$[A-Z_]{3,}' "$FILE_PATH" 2>/dev/null; then
  WARNINGS+=("credential-exfiltration")
fi

# 4. Hidden HTML content
if grep -Piq 'display:\s*none|visibility:\s*hidden' "$FILE_PATH" 2>/dev/null; then
  WARNINGS+=("hidden-html")
fi

if [[ ${#WARNINGS[@]} -gt 0 ]]; then
  WARN_LIST=$(IFS=', '; echo "${WARNINGS[*]}")
  echo "⚠️ [Prompt Injection Guard] Suspicious patterns in $(basename "$FILE_PATH"): ${WARN_LIST}. Review content carefully." >&2
fi

exit 0
