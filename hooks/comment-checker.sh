#!/bin/bash
# Team-Shinchan Comment Checker — PostToolUse Hook (Edit/Write)
# Detects AI slop comment patterns and warns (does not block).
# Stdin: {"tool_name":"Edit|Write","tool_input":{...},"tool_output":{...}}
# Stdout: {"decision":"warn","message":"..."} or empty (allow)
set -eo pipefail

INPUT=$(cat)
if [ -z "$INPUT" ]; then
  exit 0
fi

RESULT=$(echo "$INPUT" | node -e "
const fs = require('fs');
const path = require('path');
const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  let input;
  try { input = JSON.parse(chunks.join('')); } catch(e) { process.exit(0); }

  const toolInput = input.tool_input || {};
  const filePath = toolInput.file_path || '';
  const content = toolInput.content || toolInput.new_string || '';

  if (!filePath || !content) process.exit(0);

  // Skip non-code files
  if (/\.(md|yaml|yml|json|txt)$/i.test(filePath)) process.exit(0);

  // AI Slop patterns (FR-5.2) — only very clear patterns
  const slopPatterns = [
    { regex: /\/\/\s*TODO:\s*implement\s*(this|here)?$/im, name: '// TODO: implement' },
    { regex: /\/\/\s*FIXME:\s*$/im, name: '// FIXME: (empty)' },
    { regex: /\/\/\s*\.\.\.\s*(rest of |remaining )?implementation/im, name: '// ... implementation' },
    { regex: /#\s*Add error handling\s*(here)?$/im, name: '# Add error handling' },
    { regex: /\/\*\s*placeholder\s*\*\//im, name: '/* placeholder */' }
  ];

  const lines = content.split('\n');
  const detected = [];
  for (let i = 0; i < lines.length; i++) {
    for (const pattern of slopPatterns) {
      if (pattern.regex.test(lines[i])) {
        detected.push({ line: i + 1, pattern: pattern.name });
      }
    }
  }

  if (detected.length > 0) {
    const msg = 'AI slop comment detected in ' + path.basename(filePath) + ': ' +
                detected.map(d => 'L' + d.line + ' ' + d.pattern).join(', ') +
                ' (may be false positive)';
    console.log(JSON.stringify({ decision: 'warn', message: msg }));
  }

  process.exit(0);
});
" 2>/dev/null || true)

if [ -n "$RESULT" ]; then
  echo "$RESULT"
fi

exit 0
