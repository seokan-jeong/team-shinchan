#!/bin/bash
# Team-Shinchan Intent Gate — UserPromptSubmit Hook
# Classifies request complexity → .shinchan-docs/.intent-complexity
#
# Complexity (FR-P1-4.2):
#   high:   architecture keywords → Opus recommended
#   low:    single-file + short prompt (< 200 chars) → Sonnet (NOT Haiku, HR-1)
#   medium: all others → keep current model
#
# Non-blocking: always exits 0 (FR-P1-4.4)
set -eo pipefail

PROJECT_ROOT="${PWD}"
DOCS_DIR="${PROJECT_ROOT}/.shinchan-docs"

# Graceful: no docs dir means plugin not initialized
if [ ! -d "$DOCS_DIR" ]; then
  exit 0
fi

# Read stdin with timeout fallback
INPUT=""
if [ ! -t 0 ]; then
  INPUT=$(cat 2>/dev/null || echo "")
fi
if [ -z "$INPUT" ]; then
  exit 0
fi

# Run classification in node (FR-P1-4.4: failure must not block request)
COMPLEXITY=$(echo "$INPUT" | node -e "
const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  let input;
  try { input = JSON.parse(chunks.join('')); } catch(e) { console.log('medium'); return; }

  const prompt = (input.prompt || '').toLowerCase();
  const promptLen = (input.prompt || '').length;

  // High complexity indicators
  const archKeywords = ['architecture', 'design', 'refactor', 'migration', 'redesign', 'restructure', 'overhaul', 'refactoring', '아키텍처', '리팩토링', '재설계', '마이그레이션'];
  const multiFileIndicators = ['multiple files', 'all files', 'across', 'entire', 'whole', 'system', '전체', '모든', '시스템'];

  const hasArchKeyword = archKeywords.some(k => prompt.includes(k));
  const hasMultiFile = multiFileIndicators.some(k => prompt.includes(k));

  if (hasArchKeyword) {
    console.log('high');
    return;
  }

  // Low complexity indicators (HR-1: Sonnet only, not Haiku)
  const singleFilePattern = /\\b(this file|one file|single file|하나|이 파일)\\b/;
  if (promptLen < 200 && singleFilePattern.test(prompt)) {
    console.log('low');
    return;
  }

  console.log('medium');
});
" 2>/dev/null || echo "medium")

# Write to .intent-complexity (FR-P1-4.3)
COMPLEXITY="${COMPLEXITY:-medium}"
echo "${COMPLEXITY}" > "${DOCS_DIR}/.intent-complexity" 2>/dev/null || true

# Log non-medium to work-tracker (HR-1: track overrides)
if [ "$COMPLEXITY" != "medium" ] && [ -d "$DOCS_DIR" ]; then
  TRACKER_FILE="${DOCS_DIR}/work-tracker.jsonl"
  TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  LINE="{\"ts\":\"${TS}\",\"type\":\"intent_gate\",\"agent\":null,\"session\":null,\"data\":{\"complexity\":\"${COMPLEXITY}\"}}"
  echo "$LINE" >> "$TRACKER_FILE" 2>/dev/null || true
fi

# Keyword match logging (non-blocking, isolated)
# Matches user prompt against intent keyword table and logs to work-tracker.jsonl
(
  PROMPT_TEXT=$(echo "$INPUT" | node -e "
const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  try { const j = JSON.parse(chunks.join('')); console.log((j.prompt || '').toLowerCase()); }
  catch(e) { console.log(''); }
});
" 2>/dev/null || echo "")

  if [ -n "$PROMPT_TEXT" ]; then
    KEYWORD_SKILL=""
    case "$PROMPT_TEXT" in
      *fix*|*debug*|*error*|*버그*|*디버그*) KEYWORD_SKILL="systematic-debugging" ;;
      *plan*|*design*|*계획*|*설계*)         KEYWORD_SKILL="plan" ;;
      *implement*|*add*|*feature*|*구현*|*추가*) KEYWORD_SKILL="implement" ;;
      *review*|*check*|*리뷰*|*검토*)        KEYWORD_SKILL="review" ;;
      *test*|*테스트*)                        KEYWORD_SKILL="test-driven-development" ;;
      *release*|*릴리스*)                    KEYWORD_SKILL="release" ;;
      *analyze*|*understand*|*분석*|*이해*)  KEYWORD_SKILL="analyze" ;;
    esac

    if [ -n "$KEYWORD_SKILL" ] && [ -d "$DOCS_DIR" ]; then
      TRACKER_FILE="${DOCS_DIR}/work-tracker.jsonl"
      TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
      LINE="{\"ts\":\"${TS}\",\"type\":\"keyword_match\",\"agent\":null,\"session\":null,\"data\":{\"skill\":\"${KEYWORD_SKILL}\"}}"
      echo "$LINE" >> "$TRACKER_FILE" 2>/dev/null || true
    fi
  fi
) 2>/dev/null || true

exit 0
