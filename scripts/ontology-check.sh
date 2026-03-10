#!/bin/bash
# ontology-check.sh — CI용 ontology auto-scan --check 래퍼
# exit 0: 변경 없음 (최신 상태)
# exit 1: 새 엔티티 후보 발견됨 (리포트만, 수정 없음)
#
# Usage: bash scripts/ontology-check.sh

set -eo pipefail
PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)"
ENGINE="${PLUGIN_ROOT}/src/ontology-engine.js"

if ! command -v node &>/dev/null; then
  echo "node not found — skipping ontology check"
  exit 0
fi

if [ ! -f "$ENGINE" ]; then
  echo "ontology-engine.js not found — skipping"
  exit 0
fi

RESULT=$(node "$ENGINE" auto-scan --check 2>&1)
echo "$RESULT"

# exit 1 only if new entities found (line starts with "  [")
if echo "$RESULT" | grep -q "^\s*\["; then
  echo ""
  echo "Ontology check: new entities detected. Run 'node src/ontology-engine.js auto-scan --write' to merge."
  exit 1
fi

exit 0
