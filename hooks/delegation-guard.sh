#!/usr/bin/env bash
# Team-Shinchan Delegation Guard — Programmatic PreToolUse Hook
# Advisory warning when Bo directly edits files in a domain-specialist's territory.
# Always exits 0 (never blocks). Writes recommendation to stderr only.
#
# Stdin: {"tool_name":"Edit"|"Write","tool_input":{"file_path":"...",...}}
# Stdout: empty (never blocks)
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

read -t 1 INPUT_JSON 2>/dev/null || INPUT_JSON="{}"
if [ -z "$INPUT_JSON" ]; then
  exit 0
fi

# --- Step 1: Check tool_name (only proceed for Edit or Write) ---
TOOL_NAME=$(echo "$INPUT_JSON" | grep -o '"tool_name"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"tool_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
if [ "$TOOL_NAME" != "Edit" ] && [ "$TOOL_NAME" != "Write" ]; then
  exit 0
fi

# --- Step 2: Extract file_path ---
FILE_PATH=$(echo "$INPUT_JSON" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# --- Step 3: Check current agent (only warn when agent is "bo") ---
CURRENT_AGENT_FILE="${PWD}/.shinchan-docs/.current-agent"
if [ ! -f "$CURRENT_AGENT_FILE" ]; then
  exit 0
fi
CURRENT_AGENT=$(cat "$CURRENT_AGENT_FILE" 2>/dev/null | tr -d '[:space:]')
if [ "$CURRENT_AGENT" != "bo" ]; then
  exit 0
fi

# --- Step 4: Read domain-router.json and classify the file ---
DOMAIN_ROUTER="${PLUGIN_ROOT}/agents/_shared/domain-router.json"
if [ ! -f "$DOMAIN_ROUTER" ]; then
  exit 0
fi

ROUTER_CONTENT=$(cat "$DOMAIN_ROUTER")

# Extract filename and extension from file path
FILENAME=$(basename "$FILE_PATH")
EXTENSION=".${FILENAME##*.}"
# Handle files with no extension (e.g. "Dockerfile")
if [ "$EXTENSION" = ".$FILENAME" ]; then
  EXTENSION=""
fi

MATCHED_DOMAIN=""
MATCHED_AGENT=""

# --- Check devops: exact filename matches ---
DEVOPS_FILENAMES=$(echo "$ROUTER_CONTENT" | grep -o '"filenames"[[:space:]]*:[[:space:]]*\[[^]]*\]' | sed 's/"filenames"[[:space:]]*:[[:space:]]*\[//' | tr -d '[]"' | tr ',' '\n' | tr -d ' ')
while IFS= read -r fname; do
  fname_trimmed=$(echo "$fname" | tr -d '[:space:]')
  if [ -n "$fname_trimmed" ] && [ "$FILENAME" = "$fname_trimmed" ]; then
    MATCHED_DOMAIN="devops"
    MATCHED_AGENT="Masao(team-shinchan:masao)"
    break
  fi
done <<< "$DEVOPS_FILENAMES"

# --- Check devops: path patterns ---
if [ -z "$MATCHED_DOMAIN" ]; then
  DEVOPS_PATHS=$(echo "$ROUTER_CONTENT" | grep -o '"path_patterns"[[:space:]]*:[[:space:]]*\[[^]]*\]' | sed 's/"path_patterns"[[:space:]]*:[[:space:]]*\[//' | tr -d '[]"' | tr ',' '\n')
  while IFS= read -r ppath; do
    ppath_trimmed=$(echo "$ppath" | tr -d '[:space:]')
    if [ -n "$ppath_trimmed" ] && echo "$FILE_PATH" | grep -qF "$ppath_trimmed"; then
      MATCHED_DOMAIN="devops"
      MATCHED_AGENT="Masao(team-shinchan:masao)"
      break
    fi
  done <<< "$DEVOPS_PATHS"
fi

# --- Check devops: extensions (.tf, .hcl) ---
if [ -z "$MATCHED_DOMAIN" ] && [ -n "$EXTENSION" ]; then
  DEVOPS_EXTS=$(echo "$ROUTER_CONTENT" | grep -A5 '"devops"' | grep '"extensions"' | sed 's/.*"extensions"[[:space:]]*:[[:space:]]*\[//' | tr -d '[]"' | tr ',' '\n')
  while IFS= read -r ext; do
    ext_trimmed=$(echo "$ext" | tr -d '[:space:]')
    if [ -n "$ext_trimmed" ] && [ "$EXTENSION" = "$ext_trimmed" ]; then
      MATCHED_DOMAIN="devops"
      MATCHED_AGENT="Masao(team-shinchan:masao)"
      break
    fi
  done <<< "$DEVOPS_EXTS"
fi

# --- Check backend: extensions ---
if [ -z "$MATCHED_DOMAIN" ] && [ -n "$EXTENSION" ]; then
  BACKEND_EXTS=$(echo "$ROUTER_CONTENT" | grep -A5 '"backend"' | grep '"extensions"' | sed 's/.*"extensions"[[:space:]]*:[[:space:]]*\[//' | tr -d '[]"' | tr ',' '\n')
  while IFS= read -r ext; do
    ext_trimmed=$(echo "$ext" | tr -d '[:space:]')
    if [ -n "$ext_trimmed" ] && [ "$EXTENSION" = "$ext_trimmed" ]; then
      MATCHED_DOMAIN="backend"
      MATCHED_AGENT="Bunta(team-shinchan:bunta)"
      break
    fi
  done <<< "$BACKEND_EXTS"
fi

# --- Check frontend: extensions ---
if [ -z "$MATCHED_DOMAIN" ] && [ -n "$EXTENSION" ]; then
  FRONTEND_EXTS=$(echo "$ROUTER_CONTENT" | grep -A5 '"frontend"' | grep '"extensions"' | sed 's/.*"extensions"[[:space:]]*:[[:space:]]*\[//' | tr -d '[]"' | tr ',' '\n')
  while IFS= read -r ext; do
    ext_trimmed=$(echo "$ext" | tr -d '[:space:]')
    if [ -n "$ext_trimmed" ] && [ "$EXTENSION" = "$ext_trimmed" ]; then
      MATCHED_DOMAIN="frontend"
      MATCHED_AGENT="Aichan(team-shinchan:aichan)"
      break
    fi
  done <<< "$FRONTEND_EXTS"
fi

# --- No domain match → general → no warning ---
if [ -z "$MATCHED_DOMAIN" ]; then
  exit 0
fi

# --- Emit advisory warning to stderr ---
echo "WARNING DELEGATION GUARD: Bo is editing \"${FILE_PATH}\" (${MATCHED_DOMAIN} domain)." >&2
echo "Recommendation: Consider delegating to ${MATCHED_AGENT}." >&2
echo "(This is a warning and does not block the current operation)" >&2

exit 0
