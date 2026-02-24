# Security Rules

Operational checklist for secure coding. Cross-references [hooks/security-check.md](../hooks/security-check.md) and [hooks/deny-list.json](../hooks/deny-list.json).

---

### R-1: Never Commit Secrets
Files matching `.env*`, `credentials.*`, `*.pem`, `*.key`, `id_rsa*`, `*.p12`, `*.pfx`, or `*secret*` must never be committed. Always add secret patterns to `.gitignore`.

### R-2: No Destructive Git Without Confirmation
Never execute `push --force`, `reset --hard`, `clean -f`, or `branch -D main/master` without explicit user confirmation. These operations cause irreversible data loss.

### R-3: Never Write to Sensitive Files
Do not create or modify `.env`, credentials, secret, or key files through AI-assisted workflows. Use environment variables or a secrets manager instead.

### R-4: Validate All External Input
Never trust user input, API responses, or file contents. Validate type, length, format, and range at every boundary. Use allowlists over denylists when possible.

### R-5: Parameterize Queries
Never concatenate user input into SQL, shell commands, or template strings. Use parameterized queries, prepared statements, or proper escaping.

### R-6: Principle of Least Privilege
Grant the minimum permissions required. Use read-only access when writes are not needed. Scope tokens and API keys to specific resources.

### R-7: No Hardcoded Credentials
Passwords, API keys, tokens, and connection strings must come from environment variables or a secrets manager. Never embed them in source code.

### R-8: Sanitize Output
Escape all dynamic content before rendering in HTML, logs, or error messages. Prevent XSS, log injection, and information leakage.

### R-9: Pin Dependency Versions
Lock exact dependency versions in lock files. Review changelogs before upgrading. Avoid installing packages from untrusted sources.

### R-10: No Eval or Dynamic Code Execution
Never use `eval()`, `Function()`, or equivalent dynamic code execution with untrusted input. These are injection vectors.

### R-11: Audit Large File Staging
Files over 10MB should not be committed to git. Use Git LFS or add them to `.gitignore`. Check file sizes before staging.

### R-12: No Pipe-to-Shell
Never pipe remote content directly to a shell (`curl ... | bash`). Download first, review, then execute.

### R-13: Rate Limit Sensitive Endpoints
Apply rate limiting to authentication, password reset, and payment endpoints. Use exponential backoff for retry logic.

### R-14: Log Security Events
Log authentication attempts, authorization failures, and data access. Never log sensitive data (passwords, tokens, PII) in plain text.
