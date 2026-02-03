#!/bin/bash

# Team-Shinchan Plugin Installation Script
# Usage: curl -fsSL https://raw.githubusercontent.com/seokan-jeong/team-shinchan/main/install.sh | bash

set -e

PLUGIN_NAME="team-shinchan"
PLUGIN_DIR="$HOME/.claude/plugins/$PLUGIN_NAME"
REPO_URL="https://github.com/seokan-jeong/team-shinchan.git"

echo "================================================"
echo "  Team-Shinchan - Multi-Agent Orchestration"
echo "  15 Shinchan character agents"
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
echo "================================================"
echo "Installation complete!"
echo ""
echo "Location: $PLUGIN_DIR"
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
