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
  # Skip archived workflows — archived path pattern: .shinchan-docs/archived/YYYY-MM/doc-id/
  # The one-level glob above won't reach archived/ subfolders, but guard explicitly here
  # in case of path changes. Also handles any direct reference.
  case "$yaml" in
    */archived/*) continue ;;
  esac
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
  //
  // EXCEPTION: .shinchan-docs/ files are workflow metadata, not source code.
  // Edit/Write to .shinchan-docs/ is always allowed in ALL stages to prevent deadlocks.
  const blockedInReqPlan = ['Edit', 'Write', 'TodoWrite'];
  const blockedInCompletion = ['Edit', 'TodoWrite'];

  // Global exception: .shinchan-docs/ paths are workflow management files (WORKFLOW_STATE.yaml,
  // PROGRESS.md, REQUESTS.md, RETROSPECTIVE.md, IMPLEMENTATION.md, etc.)
  // These must be writable in ALL stages to avoid planning/execution deadlocks.
  if ((toolName === 'Edit' || toolName === 'Write') && filePath.includes('.shinchan-docs/')) {
    process.exit(0);
  }

  // Global exception: .claude-plugin/ paths are release metadata files (plugin.json, marketplace.json).
  // These must be writable in completion stage for version bumps during the release process.
  if ((toolName === 'Edit' || toolName === 'Write') && filePath.includes('.claude-plugin/')) {
    if (stage === 'completion') {
      process.exit(0);
    }
  }

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
      console.log(JSON.stringify({
        decision: 'block',
        reason: 'WORKFLOW GUARD: Stage \"' + stage + '\" does not allow ' + toolName + '. Complete ' + stage + ' phase first before writing code. Use Read/Glob/Grep/Task only.'
      }));
      return;
    }
  }

  // execution: block git commit/push (deferred to completion stage after review)
  if (stage === 'execution') {
    if (toolName === 'Bash') {
      const cmd = toolInput.command || '';
      if (/\\bgit\\s+(commit|push)\\b/.test(cmd)) {
        console.log(JSON.stringify({
          decision: 'block',
          reason: 'WORKFLOW GUARD: Git commits are deferred to Stage 4 (Completion) after Action Kamen review. Current stage: execution. Continue with implementation and review first.'
        }));
        return;
      }
    }
  }

  if (stage === 'completion') {
    // Bash in completion: block destructive, but allow git commit/push
    if (toolName === 'Bash') {
      const cmd = toolInput.command || '';
      // Allow git add/commit/push in completion stage (post-review)
      if (/\\bgit\\s+(add|commit|push)\\b/.test(cmd)) {
        process.exit(0);
      }
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
      // Edit exception: allow .claude-plugin/ files (release metadata) in completion
      if (toolName === 'Edit' && filePath.includes('.claude-plugin/')) {
        process.exit(0);
      }
      console.log(JSON.stringify({
        decision: 'block',
        reason: 'WORKFLOW GUARD: Stage \"completion\" does not allow ' + toolName + '. Only documentation writes (.shinchan-docs/, *.md, or .claude-plugin/) are permitted.'
      }));
      return;
    }
    // Write in completion: only .shinchan-docs/, .md files, or .claude-plugin/ (release metadata)
    if (toolName === 'Write') {
      if (!filePath.includes('.shinchan-docs/') && !filePath.endsWith('.md') && !filePath.includes('.claude-plugin/')) {
        console.log(JSON.stringify({
          decision: 'block',
          reason: 'WORKFLOW GUARD: Stage \"completion\" only allows Write to documentation or release metadata files (.shinchan-docs/, *.md, or .claude-plugin/). Cannot write to: ' + filePath
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

# Path-Scoped Rules Advisory Check
# Runs after stage/tool matrix. Edit or Write only. Non-blocking (exit 0 always).
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-}"
PATH_RULES_FILE=""
if [ -n "$PLUGIN_ROOT" ] && [ -f "$PLUGIN_ROOT/rules/path-rules.json" ]; then
  PATH_RULES_FILE="$PLUGIN_ROOT/rules/path-rules.json"
fi

if [ -n "$PATH_RULES_FILE" ] && [ -f "$PATH_RULES_FILE" ]; then
  echo "$INPUT" | PATH_RULES_FILE="$PATH_RULES_FILE" node -e "
const fs = require('fs');
const path = require('path');
const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  let input;
  try { input = JSON.parse(chunks.join('')); } catch(e) { process.exit(0); }

  const toolName = input.tool_name || '';
  if (toolName !== 'Edit' && toolName !== 'Write') { process.exit(0); }

  const filePath = (input.tool_input || {}).file_path || '';
  if (!filePath) { process.exit(0); }

  let rulesData;
  try { rulesData = JSON.parse(fs.readFileSync(process.env.PATH_RULES_FILE, 'utf-8')); } catch(e) { process.exit(0); }

  const entries = (rulesData && Array.isArray(rulesData.rules)) ? rulesData.rules : [];

  // Minimal globToRegex: supports **, *, ?, leading ./ normalisation (≤15 lines core logic)
  function globToRegex(glob) {
    // Normalise leading ./ from both glob and path
    const g = glob.replace(/^\\.\\//,'');
    let re = '';
    let i = 0;
    while (i < g.length) {
      if (g[i] === '*' && g[i+1] === '*') {
        re += '.*';
        i += 2;
        if (g[i] === '/') i++; // skip trailing slash after **
      } else if (g[i] === '*') {
        re += '[^/]*';
        i++;
      } else if (g[i] === '?') {
        re += '[^/]';
        i++;
      } else {
        re += g[i].replace(/[.+^${}()|[\\]\\\\]/g, '\\\\$&');
        i++;
      }
    }
    return new RegExp('^' + re + '$');
  }

  // Normalise filePath: strip leading ./ and any absolute prefix up to project root
  const normPath = filePath.replace(/^\\.\\//,'').replace(/^\\/.*?\\/(?=[a-z])/,'');

  const matched = [];
  for (const entry of entries) {
    if (!entry.pattern || !Array.isArray(entry.rules)) continue;
    try {
      const rx = globToRegex(entry.pattern);
      if (rx.test(normPath) || rx.test(path.basename(normPath))) {
        matched.push({ pattern: entry.pattern, rules: entry.rules });
      }
    } catch(e) { /* skip malformed pattern */ }
  }

  if (matched.length === 0) { process.exit(0); }

  const lines = ['[path-rules] Advisory rules for: ' + filePath];
  for (const m of matched) {
    lines.push('  Pattern: ' + m.pattern);
    for (const r of m.rules) {
      lines.push('    - ' + r);
    }
  }
  process.stdout.write(lines.join('\\n') + '\\n');
  process.exit(0);
});
" 2>/dev/null || true
fi

exit 0
