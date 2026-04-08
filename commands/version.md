---
description: Show current plugin version, latest published release, and changelog diff between them
---

# Version Command

Displays the current local plugin version, compares it with the latest published GitHub release, and shows what changed between them.

See `skills/version/SKILL.md` for full documentation.

## Usage

```
/team-shinchan:version
```

## Output

- Current local version (from `plugin.json`)
- Latest published version (from GitHub releases)
- Status: ahead / up to date / behind
- Changelog diff between the two versions
