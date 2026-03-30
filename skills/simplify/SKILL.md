---
name: team-shinchan:simplify
description: Use when you need to detect or remove AI slop from text — filler openers, hedge stacks, redundant qualifiers, and emoji clusters. Scans stdin or a file and optionally rewrites clean output.
user-invocable: true
---

# AI Slop Cleaner

Removes AI-generated filler language from text files or stdin.

## Usage

```
# Scan mode (default) — print matched slop phrases with line numbers
echo "Certainly, here is your answer." | node ${CLAUDE_PLUGIN_ROOT}/src/slop-cleaner.js

# Fix mode — rewrite cleaned text to stdout
echo "Certainly, here is your answer." | node ${CLAUDE_PLUGIN_ROOT}/src/slop-cleaner.js --fix

# File input — scan a file
node ${CLAUDE_PLUGIN_ROOT}/src/slop-cleaner.js --file path/to/doc.md

# File input + fix — rewrite cleaned text back to the file
node ${CLAUDE_PLUGIN_ROOT}/src/slop-cleaner.js --fix --file path/to/doc.md
```

## What It Detects

| Category | Examples |
|----------|---------|
| Filler openers | "Certainly,", "Absolutely,", "Of course,", "Sure,", "Great,", "I'll help you" |
| Hedge stacks | "It's worth noting that ", "It is important to mention ", "Please note that " |
| Redundant qualifiers | "very unique" → "unique", "completely eliminate" → "eliminate", "totally unnecessary" → "unnecessary" |
| Emoji clusters | 3 or more consecutive emoji in a row |

## Invocation

When this skill is invoked, run the slop-cleaner script directly using the Bash tool:

```bash
# Scan mode
node ${CLAUDE_PLUGIN_ROOT}/src/slop-cleaner.js --file <path>

# Fix mode
node ${CLAUDE_PLUGIN_ROOT}/src/slop-cleaner.js --fix --file <path>
```

Report the output to the user. If slop is found in scan mode, summarize the matches and suggest running with `--fix` to clean them.
