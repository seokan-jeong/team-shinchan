---
description: Configure Claude Code's statusLine to display the Team-Shinchan HUD
---

# Setup HUD Command

Configures the Team-Shinchan Heads-Up Display in Claude Code's terminal statusline.

## Usage

```
/team-shinchan:setup-hud           # Install the HUD
/team-shinchan:setup-hud remove    # Remove the HUD configuration
```

## What It Does

Adds (or removes) a `statusLine` entry to `~/.claude/settings.json` that
displays a 2-line HUD at the bottom of Claude Code:

  Line 1: [Model] DOC_ID stage | agent_name | Todo X/Y
  Line 2: Context ████░░░░░░ PCT% | $COST | TIMEm

See `skills/setup-hud/SKILL.md` for implementation details.
