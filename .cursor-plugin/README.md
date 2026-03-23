# Team-Shinchan for Cursor

Structured 4-stage development workflow adapted from the Team-Shinchan Claude Code plugin.

## Installation

Copy `cursor-rules.md` to your project's `.cursor/rules/` directory:

```bash
mkdir -p .cursor/rules
cp cursor-rules.md .cursor/rules/team-shinchan.mdc
```

## What's Included

- 4-stage workflow (Requirements → Planning → Execution → Completion)
- Agent routing guidelines for multi-model setups
- Complexity-based model selection

## What's NOT Included

- Automated hooks (workflow-guard, budget-guard, etc.)
- Agent enforcement (tool restrictions, deny-lists)
- Work tracking and analytics

These features require the full Claude Code plugin. Install via:
`/plugin install` from the [Claude Code marketplace](https://github.com/seokan-jeong/team-shinchan)
