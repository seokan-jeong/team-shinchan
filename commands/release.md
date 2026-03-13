---
description: Automate version bump across plugin.json, marketplace.json, README.md, and CHANGELOG.md
---

# Release Command

Bumps the version in all 4 required files and optionally creates a git commit and tag.

See `skills/release/SKILL.md` for full documentation.

## Usage

```
/team-shinchan:release --version <X.Y.Z> [--dry-run]
```

## Examples

```
/team-shinchan:release --version 4.15.0
/team-shinchan:release --version 4.15.0 --dry-run
```

## What it updates

| File | Field |
|------|-------|
| `.claude-plugin/plugin.json` | `"version"` |
| `.claude-plugin/marketplace.json` | `plugins[0].version` |
| `README.md` | Version badge |
| `CHANGELOG.md` | New version header |
