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

  // === Scope-Invariant Gate (main-075 adoption) — HARD BLOCK ===
  // The plan may declare scope.forbidden_paths (e.g. a read-only research deliverable that must
  // NEVER touch src/). main-075 violated its own 'do not touch src/' invariant and the transition
  // gate certified it clean because nothing compared edits to a declared do-not-touch list. Enforce
  // it in real time: an Edit/Write to a forbidden path is blocked the moment it is attempted.
  // Absent forbidden_paths ⇒ no-op (full backward compatibility with legacy workflows).
  const forbidden = (() => {
    const out = [];
    const m = yamlContent.match(/forbidden_paths:\\s*\\n((?:\\s*-\\s*.+\\n?)+)/);
    if (m) {
      for (const line of m[1].split('\\n')) {
        const lm = line.match(/^\\s*-\\s*['\"]?([^'\"\\n]+?)['\"]?\\s*\$/);
        if (lm) out.push(lm[1].trim());
      }
    }
    return out;
  })();
  if (forbidden.length > 0) {
    const projectRoot0 = process.cwd();
    let rel0 = filePath;
    if (filePath.startsWith(projectRoot0)) rel0 = filePath.slice(projectRoot0.length + 1);
    // Segment-based matching (tolerant of an absolute path prefix — avoids the macOS
    // /var vs /private/var symlink trap where cwd-stripping silently fails).
    const isForbidden = (rel) => forbidden.some(g => {
      g = (g || '').trim();
      if (!g) return false;
      if (g.startsWith('*.')) return rel.endsWith(g.slice(1));   // suffix glob, e.g. *.lock
      let base = g;
      if (base.endsWith('/**')) base = base.slice(0, -3);
      else if (base.endsWith('/*')) base = base.slice(0, -2);
      else if (base.endsWith('/')) base = base.slice(0, -1);
      else if (base.includes('*')) { const p = base.split('*'); return rel.includes(p[0]) && rel.endsWith(p[p.length - 1]); }
      // directory / exact: match `base` as a leading path segment, anywhere in an absolute path
      return rel === base || rel.endsWith('/' + base) || rel.startsWith(base + '/') || rel.includes('/' + base + '/');
    });
    if (isForbidden(rel0)) {
      console.log(JSON.stringify({
        decision: 'block',
        reason: 'SCOPE-INVARIANT GATE: \"' + rel0 + '\" matches a plan-declared forbidden path (scope.forbidden_paths in WORKFLOW_STATE.yaml). This workflow declared it must NOT modify this path. If the scope genuinely must change, update scope.forbidden_paths in the plan WITH justification — do not edit around the invariant.'
      }));
      return;
    }
  }

  const stageMatch = yamlContent.match(/^\\s*stage:\\s*(.+)\$/m);
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
