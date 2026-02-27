#!/bin/bash
# Team-Shinchan Security Check — Programmatic PreToolUse Hook
# Blocks: secrets staging, destructive git, sensitive file writes
#
# Stdin: {"tool_name":"...","tool_input":{...}}
# Stdout: {"decision":"block","reason":"..."} or empty (allow)
set -euo pipefail

INPUT=$(cat)
if [ -z "$INPUT" ]; then
  exit 0
fi

# Parse tool_name and tool_input using node
RESULT=$(echo "$INPUT" | node -e "
const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  let input;
  try { input = JSON.parse(chunks.join('')); } catch(e) { process.exit(0); }

  const toolName = input.tool_name || '';
  const toolInput = input.tool_input || {};
  const command = toolInput.command || '';
  const filePath = toolInput.file_path || '';

  // ── Rule 1: Secrets Detection ──
  if (toolName === 'Bash' && /git\s+(add|commit)/.test(command)) {
    const secretPatterns = [
      /\.env(\.\w+)?(\s|$|\"|\')/, /credentials\.\w+/, /\.pem(\s|$|\"|\')/, /\.key(\s|$|\"|\')/,
      /id_rsa/, /\.p12(\s|$|\"|\')/,  /\.pfx(\s|$|\"|\')/,  /secret/i
    ];
    for (const pat of secretPatterns) {
      if (pat.test(command)) {
        console.log(JSON.stringify({
          decision: 'block',
          reason: 'SECURITY BLOCK: Attempted to stage/commit sensitive file(s). Files matching secret patterns (.env, credentials, .pem, .key, id_rsa, .p12, .pfx) must never be committed.'
        }));
        return;
      }
    }
  }

  // ── Rule 2: Destructive Git Commands ──
  if (toolName === 'Bash') {
    const destructivePatterns = [
      { pat: /push\s+(-f|--force)\b/, desc: 'push --force' },
      { pat: /reset\s+--hard\b/, desc: 'reset --hard' },
      { pat: /clean\s+-f/, desc: 'clean -f' },
      { pat: /branch\s+-D\s+(main|master)\b/, desc: 'branch -D main/master' }
    ];
    for (const { pat, desc } of destructivePatterns) {
      if (pat.test(command)) {
        console.log(JSON.stringify({
          decision: 'block',
          reason: 'SECURITY BLOCK: Destructive git operation detected (' + desc + '). This could cause irreversible data loss.'
        }));
        return;
      }
    }
  }

  // ── Rule 3: Sensitive File Write ──
  if ((toolName === 'Edit' || toolName === 'Write') && filePath) {
    const sensitivePatterns = [
      /\.env(\.\w+)?$/, /credentials/i, /secret/i, /\.pem$/, /\.key$/
    ];
    for (const pat of sensitivePatterns) {
      if (pat.test(filePath)) {
        console.log(JSON.stringify({
          decision: 'block',
          reason: 'SECURITY BLOCK: Attempted to write to sensitive file (' + filePath + '). Use environment variables or a secrets manager instead.'
        }));
        return;
      }
    }
  }

  // ── Rule 4: Large File Staging (warn only) ──
  if (toolName === 'Bash' && /git\s+add/.test(command)) {
    // Extract file paths after 'git add' (skip flags)
    const parts = command.replace(/git\s+add\s*/, '').split(/\s+/).filter(p => p && !p.startsWith('-'));
    for (const p of parts) {
      try {
        const resolved = require('path').resolve(p);
        const stat = require('fs').statSync(resolved);
        if (stat.size > 10 * 1024 * 1024) { // 10MB
          console.log(JSON.stringify({
            decision: 'block',
            reason: 'SECURITY BLOCK: File \"' + p + '\" is ' + Math.round(stat.size / 1048576) + 'MB (>10MB). Large files should not be committed to git. Use .gitignore or Git LFS.'
          }));
          return;
        }
      } catch(e) {
        // File doesn't exist or can't stat — skip
      }
    }
  }

  // All checks passed — allow
  process.exit(0);
});
" 2>/dev/null || true)

if [ -n "$RESULT" ]; then
  echo "$RESULT"
fi

exit 0
