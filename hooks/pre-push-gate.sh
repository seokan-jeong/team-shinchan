#!/bin/bash
# Team-Shinchan Pre-Push Doc Gate — Programmatic PreToolUse Hook (Bash matcher)
# Enforces FR-1.3: block `git push` / `gh pr create` when an active workflow
# has no IMPLEMENTATION.md. No bypass mechanism (Turn 6 decision).
#
# Stdin:  {"tool_name":"Bash","tool_input":{"command":"git push origin main"}}
# Stdout: {"decision":"block","reason":"..."} when blocking, else empty
# Exit:   always 0 (fail-open on internal errors)
set -eo pipefail

INPUT=$(cat)
[ -z "$INPUT" ] && exit 0

# Fast path 1: only proceed for Bash tool calls
case "$INPUT" in
  *'"tool_name":"Bash"'*) ;;
  *) exit 0 ;;
esac

# Fast path 2: only proceed when command contains git push or gh pr create
case "$INPUT" in
  *'git push'*|*'gh pr create'*) ;;
  *) exit 0 ;;
esac

# Fast path 3: skip if no .shinchan-docs/ (NFR-3 non-shinchan no-op)
[ -d "${PWD}/.shinchan-docs" ] || exit 0

# Fast path 4: skip when CLAUDE_PLUGIN_ROOT is unset (HR-2 CI-safe)
[ -n "${CLAUDE_PLUGIN_ROOT:-}" ] || exit 0

# Slow path: find active workflows and verify IMPLEMENTATION.md for each
MISSING=""
for yaml in "${PWD}/.shinchan-docs"/*/WORKFLOW_STATE.yaml; do
  [ -f "$yaml" ] || continue
  # current.status: active sits at 2-space indent (ak_gate.*.status is 6-space)
  grep -qE '^  status: active$' "$yaml" || continue
  DOC_ID=$(basename "$(dirname "$yaml")")
  IMPL="${PWD}/.shinchan-docs/${DOC_ID}/IMPLEMENTATION.md"
  [ -f "$IMPL" ] && continue
  MISSING="${MISSING}${MISSING:+, }${DOC_ID}"
done

[ -z "$MISSING" ] && exit 0

# Emit block decision JSON
REASON="[pre-push-gate] BLOCKED: .shinchan-docs/${MISSING}/IMPLEMENTATION.md not found. Create the implementation document before pushing. Stage 4 required."
printf '{"decision":"block","reason":%s}\n' "$(printf '%s' "$REASON" | python3 -c 'import json,sys;print(json.dumps(sys.stdin.read()))' 2>/dev/null || printf '"%s"' "${REASON//\"/\\\"}")"
exit 0
