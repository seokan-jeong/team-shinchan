---
name: team-shinchan:setup-hud
description: Install or remove the Team-Shinchan HUD statusline configuration.
user-invocable: true
---

# MANDATORY EXECUTION — DO NOT EXPLAIN

**When this skill is invoked, execute immediately.**

## Step 1: Parse Arguments

If `$ARGUMENTS` contains "remove" -> go to Step 4 (Remove flow).
Otherwise -> continue to Step 2 (Install flow).

## Step 2: Detect Plugin Path

```bash
node -e "console.log(process.env.CLAUDE_PLUGIN_ROOT || '')"
```

Capture output as PLUGIN_ROOT.

If PLUGIN_ROOT is empty:
  Output error: "Cannot detect CLAUDE_PLUGIN_ROOT. Are you running in plugin mode?"
  STOP.

Set SCRIPT_PATH = PLUGIN_ROOT + '/src/statusline/index.js'

Verify script exists:
```bash
node -e "require('fs').accessSync('${CLAUDE_PLUGIN_ROOT}/src/statusline/index.js'); console.log('ok')"
```

If output is not 'ok':
  Output error: "statusline script not found at: ${SCRIPT_PATH}"
  STOP.

## Step 3: Install Flow

### 3a. Read current settings.json

```bash
node -e "
  const fs = require('fs'), path = require('path');
  const p = path.join(process.env.HOME || '~', '.claude/settings.json');
  let s = {};
  try { s = JSON.parse(fs.readFileSync(p, 'utf-8')); } catch(e) {}
  console.log(JSON.stringify({ exists: !!s.statusLine, current: s.statusLine || null }));
"
```

### 3b. Handle existing statusLine

If the output shows `"exists": true`:
  Display the current statusLine config to the user.
  Ask: **"A statusLine is already configured. Overwrite? (yes/no)"**
  If user says no: output "Cancelled. Existing statusLine unchanged." STOP.

### 3c. Write new config

```bash
node -e "
  const fs = require('fs'), path = require('path');
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
  const scriptPath = path.join(pluginRoot, 'src/statusline/index.js');
  const settingsPath = path.join(process.env.HOME, '.claude/settings.json');
  let settings = {};
  try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8')); } catch(e) {}
  settings.statusLine = {
    type: 'command',
    command: 'node \"' + scriptPath + '\"',
    padding: 0
  };
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  console.log('ok:' + scriptPath);
"
```

### 3d. Confirm success

Output:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HUD installed!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Script: {SCRIPT_PATH}
Settings: ~/.claude/settings.json

The HUD will appear on the NEXT assistant message.
If you update the plugin, run /team-shinchan:setup-hud again to refresh the path.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Step 4: Remove Flow

### 4a. Read current settings.json

```bash
node -e "
  const fs = require('fs'), path = require('path');
  const p = path.join(process.env.HOME || '~', '.claude/settings.json');
  let s = {};
  try { s = JSON.parse(fs.readFileSync(p, 'utf-8')); } catch(e) {}
  console.log(JSON.stringify({ exists: !!s.statusLine, current: s.statusLine || null }));
"
```

### 4b. Check if statusLine exists

If `"exists": false`: output "No statusLine configured." STOP.

### 4c. Check ownership

If the `command` field in the current statusLine does NOT contain `src/statusline/index.js`:
  Output: "Existing statusLine is not from Team-Shinchan. Refusing to remove."
  STOP.

### 4d. Remove statusLine and write back

```bash
node -e "
  const fs = require('fs'), path = require('path');
  const settingsPath = path.join(process.env.HOME, '.claude/settings.json');
  let settings = {};
  try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8')); } catch(e) {}
  delete settings.statusLine;
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  console.log('ok');
"
```

### 4e. Confirm removal

Output: "HUD removed. StatusLine configuration cleared."

## Prohibited

- Modifying any file other than ~/.claude/settings.json
- Running without user confirmation when overwriting an existing statusLine
