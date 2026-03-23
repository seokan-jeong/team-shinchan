---
name: team-shinchan:setup
description: Use when you need first-time installation onboarding or a plugin health check.
user-invocable: true
---

# MANDATORY EXECUTION — DO NOT EXPLAIN

**When this skill is invoked, execute immediately.**

## Step 1: Plugin Version

```bash
node -e "console.log('v' + JSON.parse(require('fs').readFileSync('${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json','utf-8')).version)"
```

## Step 2: Hooks Health Check

```bash
node -e "
const fs = require('fs');
const p = '${CLAUDE_PLUGIN_ROOT}/hooks/hooks.json';
try {
  const h = JSON.parse(fs.readFileSync(p, 'utf-8'));
  const events = Object.keys(h.hooks || {});
  const str = JSON.stringify(h);
  const cmd = (str.match(/\"type\":\"command\"/g) || []).length;
  const pmt = (str.match(/\"type\":\"prompt\"/g) || []).length;
  console.log('Events: ' + events.join(', '));
  console.log('Command hooks: ' + cmd);
  console.log('Prompt hooks: ' + pmt);
  console.log('Total: ' + (cmd + pmt));
} catch(e) { console.log('ERROR: ' + e.message); }
"
```

## Step 3: Initialize .shinchan-docs/

```bash
mkdir -p .shinchan-docs
```

If `.shinchan-docs/` already exists, report existing state:
```bash
ls .shinchan-docs/ 2>/dev/null | head -20
```

## Step 4: Agent Roster

```bash
cd "${CLAUDE_PLUGIN_ROOT}" && for f in agents/*.md; do
  name=$(basename "$f" .md)
  mem=$(grep -m1 "^memory:" "$f" 2>/dev/null | awk '{print $2}')
  echo "  $name: memory=${mem:-none}"
done
```

## Step 5: Run Validation

```bash
cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/index.js
```

## Step 6: Summary

Output:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Setup Complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Version: {version}
Hooks: {N} command + {N} prompt
Agents: 15 total ({N} with memory)
Validation: {PASS/FAIL}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ready! Use /team-shinchan:start to begin a task.
```

## Prohibited

- Only explaining without executing
- Skipping any steps
- Modifying any files (this is a read-only health check)
