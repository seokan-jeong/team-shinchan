---
name: deepsearch
description: Deep codebase exploration with Shiro(Explorer) and Masumi(Librarian). Used for "find", "where is", "search" requests.
user-invocable: true
---

# Deepsearch Skill

## Features

- Shiro(Explorer): Fast filename/keyword search
- Masumi(Librarian): Code content analysis and dependency tracking
- Supports searching files, functions, classes, docs, patterns

## Search Stages

1. **Quick Search (Shiro)**: Filename pattern matching, keyword search, directory structure
2. **Deep Search (Masumi)**: Code content analysis, related doc search, dependency tracking

## Search Targets

| Target | Description |
|--------|-------------|
| Files | Search by filename, path |
| Functions | Search by function name, signature |
| Classes | Search by class name, inheritance |
| Docs | README, comments, documentation |
| Patterns | Search by code patterns |

## Workflow Checklist

```
[ ] Identify search keywords/targets
[ ] Perform Shiro quick search
[ ] Perform Masumi deep search if needed
[ ] Organize and provide results
```

## Result Format

- File paths and line numbers
- Related code snippets
- Context explanation
- Related file list
