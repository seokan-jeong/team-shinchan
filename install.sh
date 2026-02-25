#!/bin/bash

# Team-Shinchan Plugin Installation Script
# Usage: curl -fsSL https://raw.githubusercontent.com/seokan-jeong/team-shinchan/main/install.sh | bash

set -e

PLUGIN_NAME="team-shinchan"
PLUGIN_DIR="$HOME/.claude/plugins/$PLUGIN_NAME"
REPO_URL="https://github.com/seokan-jeong/team-shinchan.git"

echo "================================================"
echo "  Team-Shinchan - Agent Harness for Claude Code"
echo "  Guardrails, Observability, Quality Gates"
echo "  15 Specialist Agents"
echo "================================================"
echo ""

# Check git
if ! command -v git &> /dev/null; then
    echo "Error: git is not installed."
    exit 1
fi

# Create plugin directory
mkdir -p "$HOME/.claude/plugins"

if [ -d "$PLUGIN_DIR" ]; then
    echo "Updating existing installation..."
    cd "$PLUGIN_DIR"
    git pull origin main
else
    echo "Downloading plugin..."
    git clone "$REPO_URL" "$PLUGIN_DIR"
fi

echo ""

# Verify installation
if [ ! -f "$PLUGIN_DIR/.claude-plugin/plugin.json" ]; then
    echo "Error: Plugin files not found. Installation may have failed."
    exit 1
fi

VERSION=$(grep -m1 '"version"' "$PLUGIN_DIR/.claude-plugin/plugin.json" | cut -d'"' -f4)

# Post-install verification
echo "Verifying installation..."
VERIFY_FAILED=0

check_path() {
    if [ ! -e "$PLUGIN_DIR/$1" ]; then
        echo "  MISSING: $1"
        VERIFY_FAILED=1
    fi
}

check_path "CLAUDE.md"
check_path "agents"
check_path "skills"
check_path "commands"
check_path "hooks/hooks.json"
check_path ".claude-plugin/plugin.json"

if [ "$VERIFY_FAILED" -eq 1 ]; then
    echo "Warning: Some expected files are missing. The plugin may not work correctly."
fi

# Count installed components
AGENT_COUNT=$(find "$PLUGIN_DIR/agents" -maxdepth 1 -name "*.md" ! -name "_*" 2>/dev/null | wc -l | tr -d ' ')
SKILL_COUNT=$(find "$PLUGIN_DIR/skills" -maxdepth 2 -name "SKILL.md" 2>/dev/null | wc -l | tr -d ' ')
COMMAND_COUNT=$(find "$PLUGIN_DIR/commands" -maxdepth 1 -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
HOOK_COUNT=$(find "$PLUGIN_DIR/hooks" -maxdepth 1 -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
VALIDATOR_COUNT=$(find "$PLUGIN_DIR/tests/validate" -maxdepth 1 -name "*.js" ! -name "index.js" ! -name "performance-profile.js" 2>/dev/null | wc -l | tr -d ' ')

echo ""
echo "================================================"
echo "Installation complete! (v$VERSION)"
echo ""
echo "Location: $PLUGIN_DIR"
echo ""
echo "Installed:"
echo "  Agents:     $AGENT_COUNT"
echo "  Skills:     $SKILL_COUNT"
echo "  Commands:   $COMMAND_COUNT"
echo "  Hooks:      $HOOK_COUNT"
echo "  Validators: $VALIDATOR_COUNT"
echo ""
echo "Next steps:"
echo "  1. Restart Claude Code"
echo "  2. The plugin will load automatically"
echo ""
echo "Available commands:"
echo "  /team-shinchan:start     - Start workflow"
echo "  /team-shinchan:debate    - Expert debate"
echo "  /team-shinchan:memories  - View memories"
echo "  /team-shinchan:help      - Show help"
echo "================================================"
