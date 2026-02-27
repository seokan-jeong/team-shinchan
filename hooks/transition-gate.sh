#!/bin/bash
# Team-Shinchan Transition Gate — Programmatic PreToolUse Hook
# Validates stage transition prerequisites before WORKFLOW_STATE.yaml writes.
# Blocks advancement if required artifacts are missing.
#
# Stdin: {"tool_name":"...","tool_input":{...}}
# Stdout: {"decision":"block","reason":"..."} or empty (allow)
set -euo pipefail

INPUT=$(cat)
if [ -z "$INPUT" ]; then
  exit 0
fi

PROJECT_ROOT="${PWD}"
DOCS_DIR="${PROJECT_ROOT}/.shinchan-docs"

if [ ! -d "$DOCS_DIR" ]; then
  exit 0
fi

RESULT=$(echo "$INPUT" | DOCS_DIR="$DOCS_DIR" node -e "
const fs = require('fs');
const path = require('path');
const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  let input;
  try { input = JSON.parse(chunks.join('')); } catch(e) { process.exit(0); }

  const toolName = input.tool_name || '';
  const toolInput = input.tool_input || {};
  const filePath = toolInput.file_path || '';
  const newContent = toolInput.content || toolInput.new_string || '';

  // Only intercept Write/Edit to WORKFLOW_STATE.yaml
  if (!filePath.includes('WORKFLOW_STATE.yaml')) {
    process.exit(0);
  }

  // Detect stage change in new content
  const stageMatch = newContent.match(/stage:\\s*([\\w]+)/);
  if (!stageMatch) {
    process.exit(0); // No stage change detected
  }
  const newStage = stageMatch[1].trim();

  // Read current WORKFLOW_STATE.yaml to get current stage
  let currentStage = '';
  try {
    const current = fs.readFileSync(filePath, 'utf-8');
    const cm = current.match(/^\\s*stage:\\s*(\\w+)/m);
    if (cm) currentStage = cm[1].trim();
  } catch(e) {
    // File doesn't exist yet (new workflow) — allow
    process.exit(0);
  }

  // If stage isn't changing, allow
  if (currentStage === newStage) {
    process.exit(0);
  }

  // Get doc directory
  const docDir = path.dirname(filePath);

  // Stage transition gate checks
  const stageOrder = ['requirements', 'planning', 'execution', 'completion'];
  const currentIdx = stageOrder.indexOf(currentStage);
  const newIdx = stageOrder.indexOf(newStage);

  // Only check forward transitions
  if (newIdx <= currentIdx || currentIdx === -1 || newIdx === -1) {
    process.exit(0);
  }

  const missing = [];

  // Gate: requirements -> planning
  if (currentStage === 'requirements' && newStage === 'planning') {
    const reqFile = path.join(docDir, 'REQUESTS.md');
    if (!fs.existsSync(reqFile)) {
      missing.push('REQUESTS.md does not exist');
    } else {
      const content = fs.readFileSync(reqFile, 'utf-8');
      if (!content.match(/problem|목표|objective/i)) {
        missing.push('REQUESTS.md missing Problem Statement / Objective');
      }
      if (!content.match(/requirement|요구사항|기능/i)) {
        missing.push('REQUESTS.md missing Requirements section');
      }
    }
  }

  // Gate: planning -> execution
  if (currentStage === 'planning' && newStage === 'execution') {
    const reqFile = path.join(docDir, 'REQUESTS.md');
    const progFile = path.join(docDir, 'PROGRESS.md');
    if (!fs.existsSync(reqFile)) {
      missing.push('REQUESTS.md does not exist');
    }
    if (!fs.existsSync(progFile)) {
      missing.push('PROGRESS.md does not exist');
    } else {
      const content = fs.readFileSync(progFile, 'utf-8');
      if (!content.match(/phase|단계/i)) {
        missing.push('PROGRESS.md missing Phase definitions');
      }
    }
  }

  // Gate: execution -> completion
  if (currentStage === 'execution' && newStage === 'completion') {
    const progFile = path.join(docDir, 'PROGRESS.md');
    if (!fs.existsSync(progFile)) {
      missing.push('PROGRESS.md does not exist');
    }
    // Check WORKFLOW_STATE.yaml history for action_kamen review
    try {
      const yaml = fs.readFileSync(filePath, 'utf-8');
      if (!yaml.includes('action_kamen') && !yaml.includes('verify_implementation')) {
        missing.push('No Action Kamen review recorded in workflow history');
      }
    } catch(e) {}
  }

  if (missing.length > 0) {
    console.log(JSON.stringify({
      decision: 'block',
      reason: 'TRANSITION GATE: Cannot advance from \"' + currentStage + '\" to \"' + newStage + '\". Missing prerequisites:\\n- ' + missing.join('\\n- ')
    }));
    return;
  }

  process.exit(0);
});
" 2>/dev/null || true)

if [ -n "$RESULT" ]; then
  echo "$RESULT"
fi

exit 0
