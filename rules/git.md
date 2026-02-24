# Git Rules

Operational checklist for git operations, commit messages, and collaboration.

---

### R-1: Conventional Commit Messages
Use the format `type: description` where type is one of: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `ci`. Keep the subject line under 72 characters.

### R-2: Atomic Commits
Each commit should represent one logical change. Do not mix feature code, formatting fixes, and dependency updates in the same commit.

### R-3: Never Force Push to Main
Force-pushing to `main` or `master` is prohibited. It rewrites shared history and causes data loss for all collaborators.

### R-4: Branch Naming Convention
Use the format `{type}/{short-description}` (e.g., `feat/add-auth`, `fix/null-pointer`, `chore/update-deps`). Keep branch names lowercase with hyphens.

### R-5: Review Before Committing Secrets
Always run `git diff --staged` before committing. Check for accidentally staged `.env` files, credentials, API keys, or tokens.

### R-6: Write Meaningful PR Descriptions
PRs must include: a summary of what changed and why, testing instructions, and any migration or deployment notes.

### R-7: Keep PRs Small and Focused
Target under 400 lines of code change per PR. Large PRs are hard to review and more likely to introduce bugs. Split large changes into sequential PRs.

### R-8: Rebase Before Merge
Keep feature branches up to date with the target branch via rebase. Resolve conflicts locally before requesting review.

### R-9: Tag Releases with Semver
Follow semantic versioning: MAJOR for breaking changes, MINOR for new features, PATCH for bug fixes. Tag every release.

### R-10: No Committed Generated Files
Do not commit build outputs (`dist/`, `build/`), dependency directories (`node_modules/`), or OS files (`.DS_Store`). Add them to `.gitignore`.

### R-11: Stage Files Explicitly
Prefer `git add <specific-files>` over `git add .` or `git add -A`. This prevents accidentally staging sensitive or unrelated files.

### R-12: Update Changelog on Release
Every version bump must include a CHANGELOG.md entry describing what changed, with links to relevant PRs or issues.

### R-13: Version Consistency Across Files
When bumping versions, update all version references atomically: `plugin.json`, `marketplace.json`, `README.md` badge, and `CHANGELOG.md`.
