---
name: deny-check
description: Block tool calls matching patterns in deny-list.json
event: PreToolUse
---

# Deny List Check

**Runs BEFORE every tool use. Blocks operations matching the deny list.**

## How It Works

1. Read the deny list from `${CLAUDE_PLUGIN_ROOT}/hooks/deny-list.json`
2. For the current tool call, check if **tool name** matches the `tool` field in any deny rule
3. If the tool matches, check if the **command or file path** contains or matches the `pattern` field
4. If both match: **REFUSE** the tool call

## Deny List Format

The deny list is a JSON array where each entry has:

```json
{
  "tool": "Bash",
  "pattern": "rm -rf /",
  "reason": "Prevents recursive root deletion"
}
```

- `tool`: The tool name to match (e.g. `Bash`, `Write`, `Edit`)
- `pattern`: A substring or regex pattern to match against the tool's arguments (command string for Bash, file path for Write/Edit)
- `reason`: Human-readable explanation shown when the rule triggers

## On Match

**Action**: REFUSE with message:
`DENY LIST BLOCK: Operation denied. Rule: "{pattern}" — {reason}. If you believe this is a false positive, ask the user to review and update deny-list.json.`

## Extending the Deny List

Users can extend `deny-list.json` by adding new entries to the JSON array. Each entry must have `tool`, `pattern`, and `reason` fields. The deny list is loaded at hook evaluation time, so changes take effect immediately on the next tool call.

Example — adding a custom rule:
```json
{
  "tool": "Bash",
  "pattern": "my-dangerous-command",
  "reason": "Custom team policy: this command is not allowed in CI"
}
```

## Priority

Deny list checks run alongside security-check.md as the first line of defense. If a deny rule matches, the tool call must be blocked regardless of other hook outcomes.
