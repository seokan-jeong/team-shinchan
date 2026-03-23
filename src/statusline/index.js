#!/usr/bin/env node
/**
 * Team-Shinchan Statusline HUD
 *
 * A 2-line HUD for Claude Code's native statusLine API.
 * Reads stdin JSON (model, context, cost) and local .shinchan-docs/ data
 * to render a compact status display.
 *
 * Line 1: [Model] DOC_ID stage | agent | Todo X/Y
 * Line 2: Context ████░░░░░░ PCT% | $COST | TIMEm
 *
 * Zero npm dependencies — Node.js built-in only (fs, path).
 * Silent failure: all errors caught, fallback output on any crash.
 * Graceful degradation: works without .shinchan-docs/ (shows idle state).
 * Performance target: <100ms total execution.
 */
'use strict';
const fs = require('fs');
const path = require('path');

// ─── Constants ──────────────────────────────────────────────────────
const TAIL_LINES = 200;      // for transcript Todo parsing (HR-3)
const BAR_WIDTH = 10;         // ████░░░░░░ width

/**
 * Resolve .shinchan-docs directory from stdin cwd or process.cwd() fallback.
 * Claude Code may execute the statusline script from a different cwd than the project.
 */
let DOCS_DIR = path.join(process.cwd(), '.shinchan-docs');

function resolveDocsDir(stdinCwd) {
  if (stdinCwd) {
    DOCS_DIR = path.join(stdinCwd, '.shinchan-docs');
  }
}

// ANSI color codes
const RESET = '\x1b[0m';

// ─── Section A: Stdin Reader ────────────────────────────────────────

/**
 * Read and parse JSON from stdin asynchronously.
 * Returns parsed JSON or null on any error.
 */
function readStdin() {
  return new Promise((resolve) => {
    // No stdin available (interactive terminal)
    if (process.stdin.isTTY) {
      resolve(null);
      return;
    }

    let data = '';
    process.stdin.setEncoding('utf-8');

    process.stdin.on('data', (chunk) => {
      data += chunk;
    });

    process.stdin.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve(null);
      }
    });

    process.stdin.on('error', () => {
      resolve(null);
    });
  });
}

// ─── Section B: File Readers ────────────────────────────────────────

/**
 * Read the current agent name from .shinchan-docs/.current-agent.
 * Returns string | null.
 */
function readCurrentAgent() {
  try {
    return fs.readFileSync(path.join(DOCS_DIR, '.current-agent'), 'utf-8').trim();
  } catch {
    return null;
  }
}

/**
 * Read the most recently active WORKFLOW_STATE.yaml from .shinchan-docs/ subdirs.
 * Returns { docId, stage, phase, owner, status } | null.
 */
function readWorkflowState() {
  try {
    const entries = fs.readdirSync(DOCS_DIR, { withFileTypes: true });
    const candidates = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const yamlPath = path.join(DOCS_DIR, entry.name, 'WORKFLOW_STATE.yaml');
      try {
        const stat = fs.statSync(yamlPath);
        const content = fs.readFileSync(yamlPath, 'utf-8');
        // Only include files containing "status: active"
        if (content.includes('status: active') || content.includes('status:active')) {
          candidates.push({ path: yamlPath, content, mtime: stat.mtimeMs });
        }
      } catch {
        // Skip subdirectories without WORKFLOW_STATE.yaml
      }
    }

    if (candidates.length === 0) return null;

    // Sort by modification time descending (most recent first)
    candidates.sort((a, b) => b.mtime - a.mtime);
    const raw = candidates[0].content;

    // Filter out comment lines before regex parsing
    const lines = raw.split('\n').filter((l) => !l.trimStart().startsWith('#'));
    const cleaned = lines.join('\n');

    // Parse YAML fields with regex
    const docIdMatch = cleaned.match(/^doc_id:\s*["']?([^"'\n#]+)/m);
    const stageMatch = cleaned.match(/^\s+stage:\s*["']?([^"'\n#]+)/m);
    const phaseMatch = cleaned.match(/^\s+phase:\s*["']?([^"'\n#]+)/m);
    const ownerMatch = cleaned.match(/^\s+owner:\s*["']?([^"'\n#]+)/m);
    const statusMatch = cleaned.match(/^\s+status:\s*["']?([^"'\n#]+)/m);

    const docId = docIdMatch ? docIdMatch[1].trim() : null;
    if (!docId) return null;

    return {
      docId,
      stage: stageMatch ? stageMatch[1].trim() : null,
      phase: phaseMatch ? phaseMatch[1].trim() : null,
      owner: ownerMatch ? ownerMatch[1].trim() : null,
      status: statusMatch ? statusMatch[1].trim() : null,
    };
  } catch {
    return null;
  }
}

/**
 * Read last N lines of a file efficiently.
 * Uses reverse-scan to avoid loading entire file into memory for large files.
 * (Same pattern as agent-context.js lines 33-66)
 */
function readLastLines(filePath, n) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size === 0) return [];

    // For small files, read all at once
    if (stat.size < 512 * 1024) { // < 512KB
      const raw = fs.readFileSync(filePath, 'utf-8');
      const lines = raw.split('\n').filter((l) => l.trim());
      return lines.slice(-n);
    }

    // For large files: read from end in chunks
    const CHUNK = 64 * 1024; // 64KB chunks
    const fd = fs.openSync(filePath, 'r');
    let pos = stat.size;
    let collected = '';
    let lines = [];

    while (pos > 0 && lines.length < n + 1) {
      const size = Math.min(CHUNK, pos);
      pos -= size;
      const buf = Buffer.alloc(size);
      fs.readSync(fd, buf, 0, size, pos);
      collected = buf.toString('utf-8') + collected;
      lines = collected.split('\n').filter((l) => l.trim());
    }

    fs.closeSync(fd);
    return lines.slice(-n);
  } catch {
    return [];
  }
}

/**
 * Parse transcript JSONL for TaskCreate/TaskUpdate tool calls.
 * Returns { completed, total } where completed = count(status === 'completed').
 */
function readTranscriptTodos(transcriptPath) {
  if (!transcriptPath) return { completed: 0, total: 0 };

  try {
    const lines = readLastLines(transcriptPath, TAIL_LINES);
    const tasks = new Map(); // taskId -> status

    for (const line of lines) {
      let parsed;
      try {
        parsed = JSON.parse(line);
      } catch {
        continue;
      }

      if (parsed.type !== 'assistant') continue;
      if (!Array.isArray(parsed.content)) continue;

      for (const item of parsed.content) {
        if (item.type !== 'tool_use') continue;

        if (item.name === 'TaskCreate' && item.input) {
          // Generate a synthetic ID for tracking
          const id = item.input.subject || item.input.description || `task_${tasks.size}`;
          tasks.set(id, 'pending');
        } else if (item.name === 'TaskUpdate' && item.input) {
          const { taskId, status } = item.input;
          if (taskId && status) {
            tasks.set(taskId, status);
          }
        }
      }
    }

    let completed = 0;
    let total = 0;
    for (const status of tasks.values()) {
      if (status !== 'deleted') {
        total++;
        if (status === 'completed') completed++;
      }
    }

    return { completed, total };
  } catch {
    return { completed: 0, total: 0 };
  }
}

/**
 * Read the current git branch name from .git/HEAD in process.cwd().
 * File-read only — no subprocess, no execSync (NFR-6, HR-3).
 *
 * Cases handled:
 *   Normal branch : "ref: refs/heads/main\n"  → "main"
 *   Detached HEAD : raw 40-char SHA            → null
 *   Worktree      : .git is a file "gitdir: …" → null (graceful)
 *   Missing .git  : ENOENT                     → null
 *
 * Returns string | null. Never throws (R-7).
 */
function readGitBranch() {
  try {
    const gitPath = path.join(process.cwd(), '.git');

    // Detect whether .git is a file (worktree) or a directory (normal repo)
    let stat;
    try {
      stat = fs.statSync(gitPath);
    } catch {
      // .git does not exist
      return null;
    }

    let headPath;
    if (stat.isDirectory()) {
      headPath = path.join(gitPath, 'HEAD');
    } else {
      // .git is a file → worktree; HEAD is at the gitdir target, skip for safety
      return null;
    }

    const content = fs.readFileSync(headPath, 'utf-8').trim();

    // Normal branch reference: "ref: refs/heads/<branch>"
    const refMatch = content.match(/^ref:\s*refs\/heads\/(.+)$/);
    if (refMatch) {
      return refMatch[1].trim() || null;
    }

    // Detached HEAD: raw SHA (40 hex chars) → return null per spec
    return null;
  } catch {
    return null;
  }
}

/**
 * Check whether the project has a test directory.
 * Looks for any of: tests/, test/, __tests__/, spec/ relative to process.cwd().
 * Returns true if at least one exists, false otherwise. Never throws (R-7).
 */
function readTestStatus() {
  try {
    const root = process.cwd();
    const candidates = ['tests', 'test', '__tests__', 'spec'];
    for (const dir of candidates) {
      if (fs.existsSync(path.join(root, dir))) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

// ─── Section C: Rendering Helpers ───────────────────────────────────

/**
 * Render a progress bar: ████░░░░░░
 */
function renderBar(pct) {
  const clamped = Math.max(0, Math.min(100, pct));
  const filled = Math.floor(clamped * BAR_WIDTH / 100);
  const empty = BAR_WIDTH - filled;
  return '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
}

/**
 * Get ANSI color code for context percentage.
 * Green (<70%), Yellow (70-89%), Red (90%+)
 */
function getBarColor(pct) {
  if (pct < 70) return '\x1b[32m';   // green
  if (pct < 90) return '\x1b[33m';   // yellow
  return '\x1b[31m';                   // red
}

/**
 * Format USD cost: $0.38
 */
function formatCost(usd) {
  return '$' + (usd || 0).toFixed(2);
}

/**
 * Format duration from milliseconds: <1m, 12m, 1h 30m
 */
function formatDuration(ms) {
  const mins = Math.floor((ms || 0) / 60000);
  if (mins < 1) return '<1m';
  if (mins < 60) return mins + 'm';
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return hours + 'h ' + remainingMins + 'm';
}

/**
 * Shorten model display name: "Claude Opus 4.6" -> "Opus"
 */
function formatModel(displayName) {
  if (!displayName) return 'Unknown';
  const match = displayName.match(/Claude\s+(Opus|Sonnet|Haiku)/i);
  return match ? match[1] : displayName;
}

// ─── Section D: Line Builders ───────────────────────────────────────

/**
 * Build Line 1: [Model] DOC_ID stage | agent | Todo X/Y | branch:NAME | T:ok
 *
 * New segments (FR-7, AC-7):
 *   branch:NAME  — current git branch, or "branch:--" when unresolvable
 *   T:ok         — test directory detected; "T:--" otherwise
 */
function buildLine1(stdin, agentName, workflowState, todos, gitBranch, hasTests) {
  const model = formatModel(stdin?.model?.display_name || 'Unknown');
  const modelStr = '[' + model + ']';

  const branchStr = 'branch:' + (gitBranch || '--');
  const testStr   = hasTests ? 'T:ok' : 'T:--';

  if (workflowState) {
    const parts = [modelStr, workflowState.docId, workflowState.stage];
    if (agentName) parts.push('| ' + agentName);
    if (todos.total > 0) parts.push('| Todo ' + todos.completed + '/' + todos.total);
    parts.push('| ' + branchStr);
    parts.push(testStr);
    return parts.join(' ');
  }

  // Idle state — no active workflow
  return modelStr + ' team-shinchan | idle | ' + branchStr + ' ' + testStr;
}

/**
 * Build Line 2: Context ████░░░░░░ PCT% | $COST | TIMEm
 */
function buildLine2(stdin) {
  const pct = Math.floor(stdin?.context_window?.used_percentage || 0);
  const cost = stdin?.cost?.total_cost_usd || 0;
  const durationMs = stdin?.cost?.total_duration_ms || 0;
  const barColor = getBarColor(pct);
  const bar = renderBar(pct);
  return barColor + 'Context ' + bar + RESET + ' ' + pct + '% | ' + formatCost(cost) + ' | ' + formatDuration(durationMs);
}

// ─── Section E: Main ────────────────────────────────────────────────

/**
 * Render fallback output on any unrecoverable error.
 */
function renderFallback() {
  console.log('[?] team-shinchan | idle');
  console.log('Context ' + '\u2591'.repeat(BAR_WIDTH) + ' 0% | $0.00 | 0m');
}

async function main() {
  try {
    // Read stdin (async)
    const stdin = await readStdin();

    // Resolve docs dir from stdin cwd (Claude Code may run script from different cwd)
    resolveDocsDir(stdin?.cwd);

    // Parallel sync reads
    const agentName = readCurrentAgent();
    const workflowState = readWorkflowState();
    const todos = readTranscriptTodos(stdin?.transcript_path);
    const gitBranch = readGitBranch();
    const hasTests  = readTestStatus();

    // Fallback: use workflowState.owner when .current-agent file is missing
    const displayAgent = agentName || (workflowState && workflowState.owner) || null;

    // Render output
    console.log(buildLine1(stdin, displayAgent, workflowState, todos, gitBranch, hasTests));
    console.log(buildLine2(stdin));
  } catch {
    renderFallback();
  }
}

// Handle isTTY case at top level to avoid hanging
if (process.stdin.isTTY) {
  try {
    const agentName = readCurrentAgent();
    const workflowState = readWorkflowState();
    const displayAgent = agentName || (workflowState && workflowState.owner) || null;
    const todos = { completed: 0, total: 0 };
    const gitBranch = readGitBranch();
    const hasTests  = readTestStatus();
    console.log(buildLine1(null, displayAgent, workflowState, todos, gitBranch, hasTests));
    console.log(buildLine2(null));
  } catch {
    renderFallback();
  }
} else {
  main();
}
