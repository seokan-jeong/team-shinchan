#!/bin/bash
# Team-Shinchan Scope Guard — Programmatic PreToolUse Hook
# Warns when modifying files not listed in the current PROGRESS.md.
# Only active during execution stage. Does NOT block — only warns.
#
# Stdin: {"tool_name":"...","tool_input":{...}}
# Stdout: empty (never blocks, only logs warnings to stderr)
set -eo pipefail

INPUT=$(cat)
if [ -z "$INPUT" ]; then
  exit 0
fi

PROJECT_ROOT="${PWD}"
DOCS_DIR="${PROJECT_ROOT}/.shinchan-docs"

# No .shinchan-docs → no workflow → skip
if [ ! -d "$DOCS_DIR" ]; then
  exit 0
fi

# Find most recent active WORKFLOW_STATE.yaml
ACTIVE_YAML=""
for yaml in "$DOCS_DIR"/*/WORKFLOW_STATE.yaml; do
  [ -f "$yaml" ] || continue
  if grep -q "status: active" "$yaml" 2>/dev/null; then
    if [ -z "$ACTIVE_YAML" ] || [ "$yaml" -nt "$ACTIVE_YAML" ]; then
      ACTIVE_YAML="$yaml"
    fi
  fi
done

# No active workflow → skip
if [ -z "$ACTIVE_YAML" ]; then
  exit 0
fi

DOC_DIR=$(dirname "$ACTIVE_YAML")
PROGRESS_MD="${DOC_DIR}/PROGRESS.md"

# No PROGRESS.md → skip (not yet in execution)
if [ ! -f "$PROGRESS_MD" ]; then
  exit 0
fi

echo "$INPUT" | ACTIVE_YAML="$ACTIVE_YAML" PROGRESS_MD="$PROGRESS_MD" node -e "
const fs = require('fs');
const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  let input;
  try { input = JSON.parse(chunks.join('')); } catch(e) { process.exit(0); }

  const toolName = input.tool_name || '';
  const toolInput = input.tool_input || {};

  // Only check Edit and Write
  if (toolName !== 'Edit' && toolName !== 'Write') {
    process.exit(0);
  }

  const filePath = toolInput.file_path || '';
  if (!filePath) process.exit(0);

  // Always allow .shinchan-docs/ writes (workflow docs)
  if (filePath.includes('.shinchan-docs/') || filePath.includes('.shinchan-docs\\\\')) {
    process.exit(0);
  }

  // Only active during execution stage
  let yamlContent;
  try { yamlContent = fs.readFileSync(process.env.ACTIVE_YAML, 'utf-8'); } catch(e) { process.exit(0); }

  const stageMatch = yamlContent.match(/^\\s*stage:\\s*(.+)$/m);
  if (!stageMatch) process.exit(0);
  const stage = stageMatch[1].trim().replace(/[\"']/g, '');

  if (stage !== 'execution') {
    process.exit(0);
  }

  // Extract all file paths from PROGRESS.md (backtick pattern)
  let progressContent;
  try { progressContent = fs.readFileSync(process.env.PROGRESS_MD, 'utf-8'); } catch(e) { process.exit(0); }

  const fileRefs = new Set();
  const backtickPattern = /\x60([^\\x60\\n]+?(?:\\.[a-z]{1,5}|\\.[A-Z]{1,5}))(?::[\\d-]+)?\x60/g;
  let match;
  while ((match = backtickPattern.exec(progressContent)) !== null) {
    const ref = match[1].trim();
    // Only include paths (must contain / or be a root file)
    if (ref.includes('/') || ref.match(/^[a-zA-Z][\\w.-]+\\.[a-z]+$/)) {
      fileRefs.add(ref);
    }
  }

  // Normalize the target file path (relative to project root)
  const projectRoot = process.cwd();
  let relPath = filePath;
  if (filePath.startsWith(projectRoot)) {
    relPath = filePath.slice(projectRoot.length + 1);
  }

  // Check if file is referenced in PROGRESS.md
  let found = false;
  for (const ref of fileRefs) {
    if (relPath === ref || relPath.endsWith(ref) || ref.endsWith(relPath)) {
      found = true;
      break;
    }
  }

  if (!found && fileRefs.size > 0) {
    // WARNING only — write to stderr, do NOT block
    process.stderr.write(
      'SCOPE GUARD WARNING: \"' + relPath + '\" is not listed in PROGRESS.md. ' +
      'If this is a discovered issue outside current workflow scope, ' +
      'record it in WORKFLOW_STATE.yaml discovered_issues (parking lot) instead of fixing directly.\\n'
    );
  }

  process.exit(0);
});
" 2>&1 || true

exit 0
