#!/bin/bash
# Team-Shinchan Workflow Guard — Programmatic PreToolUse Hook
# Enforces stage-tool matrix: blocks Edit/Write/Bash/TodoWrite during requirements/planning.
#
# Stdin: {"tool_name":"...","tool_input":{...}}
# Stdout: {"decision":"block","reason":"..."} or empty (allow)
set -eo pipefail

INPUT=$(cat)
if [ -z "$INPUT" ]; then
  exit 0
fi

PROJECT_ROOT="${PWD}"
DOCS_DIR="${PROJECT_ROOT}/.shinchan-docs"

# No .shinchan-docs → no workflow → allow everything
if [ ! -d "$DOCS_DIR" ]; then
  exit 0
fi

# Find most recent WORKFLOW_STATE.yaml with status: active
ACTIVE_YAML=""
LATEST_TS=""
for yaml in "$DOCS_DIR"/*/WORKFLOW_STATE.yaml; do
  [ -f "$yaml" ] || continue
  if grep -q "status: active" "$yaml" 2>/dev/null; then
    # Use file modification time for recency
    if [ -z "$ACTIVE_YAML" ]; then
      ACTIVE_YAML="$yaml"
    else
      # Compare modification times
      if [ "$yaml" -nt "$ACTIVE_YAML" ]; then
        ACTIVE_YAML="$yaml"
      fi
    fi
  fi
done

# No active workflow → allow
if [ -z "$ACTIVE_YAML" ]; then
  exit 0
fi

# Parse stage and check against tool
RESULT=$(echo "$INPUT" | ACTIVE_YAML="$ACTIVE_YAML" node -e "
const fs = require('fs');
const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  let input;
  try { input = JSON.parse(chunks.join('')); } catch(e) { process.exit(0); }

  const toolName = input.tool_name || '';
  const toolInput = input.tool_input || {};
  const filePath = toolInput.file_path || '';

  // Read WORKFLOW_STATE.yaml
  let yamlContent;
  try { yamlContent = fs.readFileSync(process.env.ACTIVE_YAML, 'utf-8'); } catch(e) { process.exit(0); }

  // Parse stage (regex-based, no YAML parser needed)
  const stageMatch = yamlContent.match(/^\\s*stage:\\s*(.+)$/m);
  if (!stageMatch) { process.exit(0); }
  const stage = stageMatch[1].trim().replace(/[\"']/g, '');

  // Stage-Tool Matrix
  // requirements/planning: BLOCK Edit, Write, TodoWrite; Bash only for read-only commands
  // execution: ALLOW all
  // completion: BLOCK Edit, TodoWrite; Bash only for read-only; Write only for docs
  const blockedInReqPlan = ['Edit', 'Write', 'TodoWrite'];
  const blockedInCompletion = ['Edit', 'TodoWrite'];

  if (stage === 'requirements' || stage === 'planning') {
    // Bash: block destructive commands, allow read-only
    if (toolName === 'Bash') {
      const cmd = toolInput.command || '';
      // Exception: mkdir for .shinchan-docs is always allowed
      if (/^mkdir\\s+(-p\\s+)?(\\.shinchan-docs|.*\\.shinchan-docs)/.test(cmd.trim())) {
        process.exit(0);
      }
      const destructive = /\\b(rm|mv|cp|mkdir|chmod|chown|git\\s+(commit|push|add|reset|merge|rebase|checkout)|echo\\s.*>|sed\\s+-i|npm\\s+(install|publish|run\\s+build)|npx|yarn\\s+add)\\b/;
      if (destructive.test(cmd)) {
        console.log(JSON.stringify({
          decision: 'block',
          reason: 'WORKFLOW GUARD: Stage \"' + stage + '\" does not allow destructive Bash commands. Only read-only commands (git log, git status, ls, cat, etc.) are permitted.'
        }));
        return;
      }
      process.exit(0); // Read-only Bash is allowed
    }
    if (blockedInReqPlan.includes(toolName)) {
      // Exception: Write to WORKFLOW_STATE.yaml is allowed in requirements
      if (toolName === 'Write' && stage === 'requirements' && filePath.includes('WORKFLOW_STATE.yaml')) {
        process.exit(0);
      }
      // Exception: Write to .shinchan-docs/ is allowed (interview docs)
      if (toolName === 'Write' && filePath.includes('.shinchan-docs/')) {
        process.exit(0);
      }
      console.log(JSON.stringify({
        decision: 'block',
        reason: 'WORKFLOW GUARD: Stage \"' + stage + '\" does not allow ' + toolName + '. Complete ' + stage + ' phase first before writing code. Use Read/Glob/Grep/Task only.'
      }));
      return;
    }
  }

  if (stage === 'completion') {
    // Bash in completion: block destructive, allow read-only
    if (toolName === 'Bash') {
      const cmd = toolInput.command || '';
      const destructive = /\\b(rm|mv|cp|mkdir|chmod|chown|git\\s+(commit|push|add|reset|merge|rebase|checkout)|echo\\s.*>|sed\\s+-i|npm\\s+(install|publish|run\\s+build)|npx|yarn\\s+add)\\b/;
      if (destructive.test(cmd)) {
        console.log(JSON.stringify({
          decision: 'block',
          reason: 'WORKFLOW GUARD: Stage \"completion\" does not allow destructive Bash commands. Only read-only commands are permitted.'
        }));
        return;
      }
      process.exit(0);
    }
    if (blockedInCompletion.includes(toolName)) {
      console.log(JSON.stringify({
        decision: 'block',
        reason: 'WORKFLOW GUARD: Stage \"completion\" does not allow ' + toolName + '. Only documentation writes (.shinchan-docs/ or *.md) are permitted.'
      }));
      return;
    }
    // Write in completion: only .shinchan-docs/ or .md files
    if (toolName === 'Write') {
      if (!filePath.includes('.shinchan-docs/') && !filePath.endsWith('.md')) {
        console.log(JSON.stringify({
          decision: 'block',
          reason: 'WORKFLOW GUARD: Stage \"completion\" only allows Write to documentation files (.shinchan-docs/ or *.md). Cannot write to: ' + filePath
        }));
        return;
      }
    }
  }

  // execution or unknown stage → allow
  process.exit(0);
});
" 2>/dev/null || true)

if [ -n "$RESULT" ]; then
  echo "$RESULT"
fi

exit 0
