#!/bin/bash
# Team-Shinchan Transition Gate — Programmatic PreToolUse Hook
# Validates stage transition prerequisites before WORKFLOW_STATE.yaml writes.
# Blocks advancement if required artifacts are missing.
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

  // Only intercept Write/Edit to WORKFLOW_STATE.yaml
  if (!filePath.includes('WORKFLOW_STATE.yaml')) {
    process.exit(0);
  }

  // For Write: check content; for Edit: check both old_string and new_string
  const newContent = toolInput.content || toolInput.new_string || '';

  // Detect stage change in new content
  let stageMatch = newContent.match(/stage:\\s*([\\w]+)/);

  // For Edit: if new_string is just the stage name (partial replace), check old_string for context
  if (!stageMatch && toolName === 'Edit' && toolInput.old_string && toolInput.new_string) {
    const oldHasStage = /stage:\\s*\\w+/.test(toolInput.old_string) || /^\\s*(requirements|planning|execution|completion)\\s*$/.test(toolInput.old_string);
    const newIsStage = /^\\s*(requirements|planning|execution|completion)\\s*$/.test(toolInput.new_string.trim());
    if (oldHasStage && newIsStage) {
      stageMatch = [null, toolInput.new_string.trim()];
    }
  }

  // Detect status change (completed/done)
  let statusMatch = newContent.match(/status:\\s*([\\w]+)/);
  if (!statusMatch && toolName === 'Edit' && toolInput.old_string && toolInput.new_string) {
    const oldHasStatus = /status:\\s*\\w+/.test(toolInput.old_string);
    const newIsStatus = /^\\s*(active|paused|completed|done|blocked)\\s*$/.test(toolInput.new_string.trim());
    if (oldHasStatus && newIsStatus) {
      statusMatch = [null, toolInput.new_string.trim()];
    }
  }
  const newStatus = statusMatch ? statusMatch[1].trim() : '';

  if (!stageMatch && !['completed', 'done'].includes(newStatus)) {
    process.exit(0); // No stage change or completion status detected
  }

  const newStage = stageMatch ? stageMatch[1].trim() : '';

  // Get doc directory
  const docDir = path.dirname(filePath);
  const missing = [];

  // Read current stage from disk (shared by stage transition gate + status completion gate)
  let currentStage = '';
  try {
    const current = fs.readFileSync(filePath, 'utf-8');
    const cm = current.match(/^\\s*stage:\\s*(\\w+)/m);
    if (cm) currentStage = cm[1].trim();
  } catch(e) {}

  // === Stage transition gates ===
  if (stageMatch && newStage) {
    if (currentStage !== newStage) {
      const stageOrder = ['requirements', 'planning', 'execution', 'completion'];
      const currentIdx = stageOrder.indexOf(currentStage);
      const newIdx = stageOrder.indexOf(newStage);

      if (newIdx > currentIdx && currentIdx !== -1 && newIdx !== -1) {
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
          try {
            const yaml = fs.readFileSync(filePath, 'utf-8');
            if (!yaml.includes('action_kamen') && !yaml.includes('verify_implementation')) {
              missing.push('No Action Kamen review recorded in workflow history');
            }
          } catch(e) {}
        }
      }
    }
  }

  // === Status completion gate ===
  // Block status: completed/done unless RETROSPECTIVE.md + IMPLEMENTATION.md exist
  if (['completed', 'done'].includes(newStatus)) {
    if (currentStage !== 'completion') {
      missing.push('current.stage is \"' + currentStage + '\" — must be \"completion\" before marking workflow as completed. Transition to Stage 4 (completion) first.');
    }
    const retroFile = path.join(docDir, 'RETROSPECTIVE.md');
    const implFile = path.join(docDir, 'IMPLEMENTATION.md');
    if (!fs.existsSync(retroFile)) {
      missing.push('RETROSPECTIVE.md does not exist — required before marking workflow as completed');
    }
    if (!fs.existsSync(implFile)) {
      missing.push('IMPLEMENTATION.md does not exist — required before marking workflow as completed');
    }
  }

  if (missing.length > 0) {
    console.log(JSON.stringify({
      decision: 'block',
      reason: 'TRANSITION GATE: Blocked. Missing prerequisites:\\n- ' + missing.join('\\n- ')
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
