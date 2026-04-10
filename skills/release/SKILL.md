---
name: team-shinchan:release
description: Use when you need to automate version bumps across all required files.
user-invocable: true
---

# EXECUTE IMMEDIATELY

## Step 1: Parse Arguments

```
Extract from args:
  --version <X.Y.Z>   (required, must be valid semver: digits.digits.digits)
  --dry-run            (optional, preview changes without writing)

If --version is missing or invalid:
  Output: "Usage: /team-shinchan:release --version <X.Y.Z> [--dry-run]"
  Output: "Version must be valid semver (e.g., 4.15.0)"
  STOP

Store: VERSION = extracted version, DRY_RUN = true/false
```

## Step 2: Read Current Version

```
Read .claude-plugin/plugin.json
Extract current "version" field value
Output: "Current version: {current} -> New version: {VERSION}"
```

## Step 3: Run Release Script

```bash
node ${CLAUDE.plugin.directory}/src/release.js <VERSION> [--dry-run]
```

Review the script output. If it reports errors, stop and show them to the user.

## Step 4: Post-Release Actions (skip if --dry-run)

If NOT dry-run:
1. Stage the 4 changed files:
   ```bash
   git add .claude-plugin/plugin.json .claude-plugin/marketplace.json README.md CHANGELOG.md
   ```
2. Create commit:
   ```bash
   git commit -m "chore: release v<VERSION>"
   ```
3. Create git tag:
   ```bash
   git tag v<VERSION>
   ```
4. Output summary:
   ```
   Release v<VERSION> complete!
   - 4 files updated
   - Commit created: chore: release v<VERSION>
   - Tag created: v<VERSION>
   - Run `git push && git push --tags` to publish
   ```

If dry-run:
  Output: "Dry run complete. No files were modified."
  STOP

## Step 5: Clear Local Caches (skip if --dry-run)

Reset stale local caches so agents start fresh after the release:

```bash
echo '{}' > .shinchan-docs/agent-context-cache.json
echo '{}' > .shinchan-docs/ontology/.llm-scan-cache.json
```

Output: "Local caches cleared (agent-context-cache, llm-scan-cache)"

## Step 6: Purge Old Plugin Cache (skip if --dry-run)

Remove previous version caches from the Claude Code plugin directory:

```bash
find ~/.claude/plugins/cache/team-shinchan/team-shinchan/ -maxdepth 1 -mindepth 1 -not -name "<VERSION>" -exec rm -rf {} +
```

Output: "Old plugin caches purged (kept only v<VERSION>)"

**STOP HERE.**
