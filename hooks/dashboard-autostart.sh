#!/bin/bash
# Team-Shinchan Dashboard Autostart — SessionStart sibling.
# Delegates to src/dashboard/autostart.js. NFR-1.5: never block other hooks.
set -eo pipefail
PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)"
node "${PLUGIN_ROOT}/src/dashboard/autostart.js" 2>>"${HOME}/.shinchan/dashboard.log" || true
exit 0
