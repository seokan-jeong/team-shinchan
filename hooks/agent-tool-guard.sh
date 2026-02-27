#!/bin/bash
# Team-Shinchan Agent Tool Guard — Programmatic PreToolUse Hook
# Enforces per-agent tool restrictions (e.g., read-only agents cannot use destructive Bash).
# Uses .current-agent from write-tracker.sh to identify the active agent.
#
# Stdin: {"tool_name":"...","tool_input":{...}}
# Stdout: {"decision":"block","reason":"..."} or empty (allow)
set -euo pipefail

INPUT=$(cat)
if [ -z "$INPUT" ]; then
  exit 0
fi

PROJECT_ROOT="${PWD}"
CURRENT_AGENT_FILE="${PROJECT_ROOT}/.shinchan-docs/.current-agent"

# No current agent tracked — allow (non-subagent context)
if [ ! -f "$CURRENT_AGENT_FILE" ]; then
  exit 0
fi

RESULT=$(echo "$INPUT" | CURRENT_AGENT_FILE="$CURRENT_AGENT_FILE" node -e "
const fs = require('fs');
const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  let input;
  try { input = JSON.parse(chunks.join('')); } catch(e) { process.exit(0); }

  const toolName = input.tool_name || '';
  const toolInput = input.tool_input || {};
  const command = toolInput.command || '';

  let currentAgent;
  try { currentAgent = fs.readFileSync(process.env.CURRENT_AGENT_FILE, 'utf-8').trim(); } catch(e) { process.exit(0); }
  if (!currentAgent) process.exit(0);

  // Read-only agents: can only use Bash for non-destructive commands
  const readOnlyAgents = ['actionkamen', 'hiroshi', 'misae', 'shiro', 'masumi', 'ume', 'nene'];

  if (!readOnlyAgents.includes(currentAgent)) {
    process.exit(0); // Not a read-only agent
  }

  // For read-only agents: block Edit/Write (they should only use Read/Glob/Grep/Task)
  if (toolName === 'Edit' || toolName === 'Write') {
    // Exception: Write to .shinchan-docs/ is allowed (state/docs)
    const filePath = toolInput.file_path || '';
    if (filePath.includes('.shinchan-docs/')) {
      process.exit(0);
    }
    console.log(JSON.stringify({
      decision: 'block',
      reason: 'AGENT TOOL GUARD: Agent \"' + currentAgent + '\" is read-only and cannot use ' + toolName + '. Only orchestration/execution agents may modify code files.'
    }));
    return;
  }

  // For read-only agents: block destructive Bash commands
  if (toolName === 'Bash') {
    const destructivePatterns = [
      { pat: /\\brm\\s/, desc: 'rm (file deletion)' },
      { pat: /\\bmv\\s/, desc: 'mv (file move/rename)' },
      { pat: /\\bcp\\s/, desc: 'cp (file copy)' },
      { pat: /\\becho\\s.*>/, desc: 'echo > (file overwrite)' },
      { pat: /\\bsed\\s+-i/, desc: 'sed -i (in-place edit)' },
      { pat: /\\bgit\\s+commit/, desc: 'git commit' },
      { pat: /\\bgit\\s+push/, desc: 'git push' },
      { pat: /\\bgit\\s+add/, desc: 'git add' },
      { pat: /\\bgit\\s+checkout\\s/, desc: 'git checkout' },
      { pat: /\\bgit\\s+reset/, desc: 'git reset' },
      { pat: /\\bgit\\s+merge/, desc: 'git merge' },
      { pat: /\\bgit\\s+rebase/, desc: 'git rebase' },
      { pat: /\\bmkdir\\s/, desc: 'mkdir (directory creation)' },
      { pat: /\\bchmod\\s/, desc: 'chmod (permission change)' },
      { pat: /\\bchown\\s/, desc: 'chown (ownership change)' }
    ];

    for (const { pat, desc } of destructivePatterns) {
      if (pat.test(command)) {
        // Exception: actionkamen can run test/lint commands even with mkdir
        if (currentAgent === 'actionkamen' && /\\b(npm\\s+test|npm\\s+run\\s+lint|npx|jest|vitest|mocha)\\b/.test(command)) {
          process.exit(0);
        }
        console.log(JSON.stringify({
          decision: 'block',
          reason: 'AGENT TOOL GUARD: Agent \"' + currentAgent + '\" is read-only and cannot run destructive Bash command (' + desc + '). Only read-only commands (git log, git status, git diff, npm list, etc.) are allowed.'
        }));
        return;
      }
    }
  }

  process.exit(0);
});
" 2>/dev/null || true)

if [ -n "$RESULT" ]; then
  echo "$RESULT"
fi

exit 0
