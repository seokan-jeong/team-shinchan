---
name: team-shinchan:version
description: Use when you need to check the current plugin version, latest published release, and what changed between them.
user-invocable: true
---

# EXECUTE IMMEDIATELY

## Step 1: Read Current Version

```bash
node -e "const p=JSON.parse(require('fs').readFileSync('${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json','utf-8'));console.log(p.version)"
```

Store result as `CURRENT_VERSION`.

## Step 2: Get Latest Published Version

```bash
gh release list --repo seokan-jeong/team-shinchan --limit 1 --json tagName,publishedAt --jq '.[0]' 2>/dev/null || echo '{"error":"gh not available or no releases"}'
```

Extract tag name and strip leading `v` to get `PUBLISHED_VERSION`.
Extract `publishedAt` as `PUBLISHED_DATE`.

If `gh` fails or no releases found, set `PUBLISHED_VERSION = "unknown"`.

## Step 3: Compare Versions

Compare `CURRENT_VERSION` vs `PUBLISHED_VERSION`:
- If `CURRENT_VERSION > PUBLISHED_VERSION`: local is **ahead** (unreleased changes exist)
- If `CURRENT_VERSION == PUBLISHED_VERSION`: local is **up to date**
- If `CURRENT_VERSION < PUBLISHED_VERSION`: local is **behind** (update available)

## Step 4: Gather Changelog Diff

If versions differ, read `CHANGELOG.md` and extract all entries between the two versions.

- If local is ahead: show what's new since the published version (unreleased changes)
- If local is behind: show what the published version added

## Step 5: Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Team-Shinchan Version Info
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Local version:     v{CURRENT_VERSION}
  Published version: v{PUBLISHED_VERSION} ({PUBLISHED_DATE})
  Status:            {ahead|up to date|behind}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If versions differ, also show:

```
Changes between v{LOWER} and v{HIGHER}:

{changelog entries — keep concise, show Added/Changed/Fixed sections}
```

If local is behind, suggest:
```
To update: claude plugin update team-shinchan
```

If local is ahead, suggest:
```
Unreleased changes detected. Use /team-shinchan:release --version <X.Y.Z> to publish.
```

## Prohibited

- Modifying any files
- Skipping version comparison
- Showing changelog for versions outside the comparison range
