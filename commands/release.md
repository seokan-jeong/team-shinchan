---
description: Release the plugin — bump version across 4 files, then optionally commit, tag, push, and create a GitHub Release
---

# Release Command

Bumps the version across the 4 required files and — when asked — runs the full
GitHub release flow (commit + tag + push + GitHub Release). Implemented in
`src/release.js`.

The 4-file version bump is **always** performed. The git/GitHub steps are
**opt-in** (`--full`, or individual flags) so a bump can be reviewed before any
history is written.

## Usage

```
node src/release.js <X.Y.Z> [flags]
# or, as the slash command:
/team-shinchan:release --version <X.Y.Z> [flags]
```

| Flag | Effect |
|------|--------|
| `--dry-run` | Preview every step; **no** file writes, git, or gh. |
| `--notes-file <f>` | Release-notes source for the CHANGELOG body **and** the GitHub Release body. If omitted, notes are drafted from `git log <last-tag>..HEAD` (never a silently-empty header). |
| `--title <str>` | GitHub Release title (default `vX.Y.Z`). |
| `--git` | Stage the 4 files + commit `chore: release vX.Y.Z`. |
| `--tag` | Annotated tag `vX.Y.Z` (implies `--git`). |
| `--push` | Push the current branch + tag to `origin` (implies `--git`). |
| `--gh-release` | Create a GitHub Release via `gh` (implies `--tag`). |
| `--full` | `--git --tag --push --gh-release`. |
| `--allow-dirty` | Skip the clean-working-tree guard. Lets a release proceed with uncommitted feature work in the tree — the release commit still stages ONLY the 4 version files, so the tag will NOT contain those changes. Use only for an intentional bump-only commit. |

## Examples

```
# Bump only — review the diff, then release manually.
node src/release.js 4.39.0 --dry-run
node src/release.js 4.39.0

# Full release in one shot, with hand-written notes.
node src/release.js 4.39.0 --full --notes-file RELEASE_NOTES.md --title "v4.39.0 — Big Feature"

# Preview exactly what --full would run (no side effects).
node src/release.js 4.39.0 --full --dry-run
```

## What it updates

| File | Field |
|------|-------|
| `.claude-plugin/plugin.json` | `"version"` |
| `.claude-plugin/marketplace.json` | `plugins[0].version` |
| `README.md` | Version badge (`version-X.Y.Z-blue`) |
| `CHANGELOG.md` | New `## [X.Y.Z] - <date>` section (filled from notes) |

## What `--full` also does

1. `git add` the 4 files + `git commit -m "chore: release vX.Y.Z"`
2. `git tag -a vX.Y.Z -m "chore: release vX.Y.Z"`
3. `git push origin <branch>` + `git push origin vX.Y.Z`
4. `gh release create vX.Y.Z --title … --notes-file …`

> **Conventional messages are mandatory.** The harness commit-lint hook rejects
> non-conventional **commit and tag** messages, so both are emitted as
> `chore: release vX.Y.Z`. Do not hand-write a `vX.Y.Z — …` tag message — it
> will be blocked.

## Preconditions (fail-fast)

- valid semver `X.Y.Z`, and not already the current version
- `--tag`: tag `vX.Y.Z` must not already exist
- `--git`: **clean working tree** — blocks if any tracked file other than the 4 version files
  has uncommitted changes. The release commit stages ONLY those 4 files, so dirty feature work
  would be tagged-but-not-shipped. **Commit feature work first, then release** (override with
  `--allow-dirty` for an intentional bump-only commit). Untracked files are ignored.
- `--git`: warns if not on `main`
- `--gh-release`: requires `gh auth status` to succeed
- `--push` may be blocked by the pre-push-gate (IMPLEMENTATION + RETROSPECTIVE docs)

## After a release

**Automatic (since v4.55.0):** after a real release (`--push`/`--gh-release`/`--full`), the tool
clears the local plugin cache + fast-forwards the marketplace clone itself, so the new version is
what loads locally — no manual step. Pass `--no-clear-cache` to opt out.

```
~/.claude/plugins/cache/team-shinchan/team-shinchan/<versions>   # cleared (re-cached on next load)
git -C ~/.claude/plugins/marketplaces/team-shinchan pull --ff-only   # synced
```

> The cleared versions include the one THIS session loaded, so its team-shinchan plugin agents
> deregister until you **restart Claude Code** (which then loads the new version). The tool prints
> this restart reminder. It is best-effort and never fails the release.

## Tests

`tests/release.test.js` (`node --test`) covers arg parsing, semver guards,
version bumping, CHANGELOG insertion, git-log note drafting, and the
conventional-message command construction.
