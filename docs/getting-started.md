# Getting Started with Team-Shinchan

Welcome! This guide walks you through your first experience with Team-Shinchan in under 5 minutes.

## Prerequisites

- [Claude Code](https://claude.ai/code) installed and running
- A project directory open in Claude Code

## Step 1: Install

### From Marketplace (Recommended)

**Method 1: Via Claude Code UI**
1. Open Claude Code
2. Go to Settings → Plugins
3. Search for "team-shinchan"
4. Click Install

**Method 2: Via Command Line**
```bash
claude plugin install team-shinchan
```

**Method 3: Manual Installation**
```bash
git clone https://github.com/seokan-jeong/team-shinchan.git
cd team-shinchan
claude plugin install .
```

### Verify Installation

Run: `/team-shinchan:help`

You should see a list of available commands.

## Step 2: Your First Task

### Option A: Quick Fix (Simplest)

Just describe a simple fix in natural language:
```
Fix the typo on line 42 of auth.ts
```

Team-Shinchan detects it as a quick fix → Bo implements → Action Kamen reviews → Done.

### Option B: Full Workflow (Recommended)

Try the structured workflow:
```
/team-shinchan:start "Add input validation to the login form"
```

What happens:
1. **Stage 1 - Requirements**: Nene interviews you to clarify exactly what's needed
2. **Stage 2 - Planning**: Nene breaks it into phases with acceptance criteria
3. **Stage 3 - Execution**: Bo/specialists implement each phase, Action Kamen reviews each one
4. **Stage 4 - Completion**: Masumi documents everything, final review

You approve transitions between stages.

### Option C: Quick Commands

No workflow needed - just use individual skills:
```
/team-shinchan:analyze "Why is this function slow?"    # Deep analysis
/team-shinchan:debate "REST vs GraphQL for our API"   # Expert debate
/team-shinchan:plan "Refactor the auth module"         # Structured plan
/team-shinchan:deepsearch "Where is rate limiting?"    # Codebase search
```

## Step 3: Understanding the Output

When agents work, you'll see announcements like:
```
🐶 [Shiro] Exploring codebase...
📋 [Nene] Creating plan with 3 phases...
😪 [Bo] Implementing Phase 1...
🦸 [Action Kamen] Reviewing... APPROVED ✅
```

Each agent has a signature emoji and reports progress in real-time.

## Step 4: Teaching Team-Shinchan

Team-Shinchan learns from your preferences:
```
/team-shinchan:learn "Always use TypeScript strict mode"
/team-shinchan:learn "Prefer Zustand over Redux"
/team-shinchan:memories    # See what it remembers
```

These are saved locally and auto-loaded in every session.

## Quick Reference

| Want to... | Use |
|------------|-----|
| Start a structured task | `/team-shinchan:start "description"` |
| Get a quick analysis | `/team-shinchan:analyze "question"` |
| Debate a design decision | `/team-shinchan:debate "topic"` |
| Search the codebase | `/team-shinchan:deepsearch "query"` |
| Run fast in parallel | `/team-shinchan:ultrawork "task"` |
| Keep going until done | `/team-shinchan:ralph "task"` |
| Check workflow status | `/team-shinchan:status` |
| Resume interrupted work | `/team-shinchan:resume` |

## Troubleshooting

### "Plugin not found"

- Check the plugin is installed: look in `~/.claude/plugins/team-shinchan/`
- Restart Claude Code after installation

### "No agents responding"

- Ensure CLAUDE.md is loaded (it should auto-load from the plugin)
- Try `/team-shinchan:help` to verify the plugin is active

### "Stage blocked"

- Team-Shinchan enforces a 4-stage workflow
- You can't write code during the Requirements stage
- Follow the stage prompts to progress naturally

## Next Steps

- Read the full [README](../README.md) for all features
- Check `/team-shinchan:help` for the complete command list
- Try a real task on your project!
