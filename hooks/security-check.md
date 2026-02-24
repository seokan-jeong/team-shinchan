---
name: security-check
description: Block dangerous operations - secrets staging, destructive git, sensitive file writes, large file adds
event: PreToolUse
---

# Security Check

**Runs BEFORE every tool use. Blocks dangerous operations.**

## Rule 1: Secrets Detection (REFUSE)

If the tool is `Bash` and the command contains `git add` or `git commit`, check whether any of the following file patterns appear in the arguments:

- `.env`, `.env.*` (e.g. `.env.local`, `.env.production`)
- `credentials.*` (e.g. `credentials.json`, `credentials.yaml`)
- `*.pem`, `*.key`
- `id_rsa*` (e.g. `id_rsa`, `id_rsa.pub`)
- `*.p12`, `*.pfx`
- `*secret*` (any file with "secret" in the name)

**Action**: REFUSE with message:
`SECURITY BLOCK: Attempted to stage/commit sensitive file(s). Files matching secret patterns (.env, credentials, .pem, .key, id_rsa, .p12, .pfx) must never be committed. Remove them from the staging area and add to .gitignore.`

## Rule 2: Destructive Git Commands (REFUSE)

If the tool is `Bash` and the command matches any of:

- `push --force` or `push -f` (force push)
- `reset --hard` (hard reset)
- `clean -fd` or `clean -f` (force clean)
- `branch -D main` or `branch -D master` (delete main/master branch)

**Action**: REFUSE with message:
`SECURITY BLOCK: Destructive git operation detected ({matched_pattern}). This could cause irreversible data loss. If this is intentional, the user must explicitly confirm.`

## Rule 3: Sensitive File Write (REFUSE)

If the tool is `Edit` or `Write` and the target file path matches any of:

- `*.env`, `*.env.*`
- `*credentials*`
- `*secret*`
- `*.pem`
- `*.key`

**Action**: REFUSE with message:
`SECURITY BLOCK: Attempted to write to a sensitive file ({file_path}). Credentials, secrets, and key files should be managed outside the AI workflow. Use environment variables or a secrets manager instead.`

## Rule 4: Large File Staging (WARN)

If the tool is `Bash` and the command contains `git add`, check if any explicitly named files exceed 10MB.

**Action**: WARN with message:
`SECURITY WARNING: Large file detected in git add. Files over 10MB should typically not be committed to git. Consider using Git LFS or adding the file to .gitignore.`

## Priority

These security checks take precedence over all other hook logic. If a security rule triggers REFUSE, the tool call must be blocked regardless of other hook outcomes.
