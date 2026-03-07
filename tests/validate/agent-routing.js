#!/usr/bin/env node
/**
 * Agent Routing Validator (Static Analysis)
 * Verifies agent assignment and routing rules are consistent across
 * shinnosuke.md, agent files, layer-map.json, and hook definitions.
 *
 * Checks:
 *   1. Stage→Owner mapping consistency (shinnosuke.md + start.md)
 *   2. Agent layer assignments (layer-map.json vs agent .md files)
 *   3. Read-only agent list consistency (agent-tool-guard.sh vs agent .md files)
 *   4. Subagent routing (shinnosuke.md subagent_type values match agent file names)
 *   5. Stage rules consistency (workflow-guard.sh enforces what docs describe)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '../..');
const AGENTS_DIR = path.join(ROOT_DIR, 'agents');
const LAYER_MAP_PATH = path.join(AGENTS_DIR, '_shared/layer-map.json');
const SHINNOSUKE_MD = path.join(AGENTS_DIR, 'shinnosuke.md');
const START_SKILL = path.join(ROOT_DIR, 'skills/start/SKILL.md');
const AGENT_TOOL_GUARD = path.join(ROOT_DIR, 'hooks/agent-tool-guard.sh');
const WORKFLOW_GUARD = path.join(ROOT_DIR, 'hooks/workflow-guard.sh');

// ─── Helpers ────────────────────────────────────────────────────────────────

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (_) {
    return null;
  }
}

function ok(msg) {
  console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
}

function fail(msg, errors) {
  console.log(`  \x1b[31m✗\x1b[0m ${msg}`);
  errors.push(msg);
}

function warn(msg, warnings) {
  console.log(`  \x1b[33m?\x1b[0m ${msg}`);
  warnings.push(msg);
}

// ─── Check 1: Stage→Owner mapping consistency ───────────────────────────────
// Requirements → Misae, Planning → Nene, Execution → Bo(PO), Completion → Masumi/ActionKamen
// Verified in: shinnosuke.md and skills/start/SKILL.md

function checkStageOwnerMapping(errors, warnings) {
  console.log('\n--- Check 1: Stage→Owner Mapping Consistency ---\n');

  const shinnosukeContent = readFile(SHINNOSUKE_MD);
  const startContent = readFile(START_SKILL);

  if (!shinnosukeContent) {
    fail('agents/shinnosuke.md not found', errors);
    return;
  }

  const combined = (shinnosukeContent || '') + '\n' + (startContent || '');

  // Stage 1 → Misae
  const stage1Misae = /Requirements.*Misae|Misae.*Stage\s*1|Stage\s*1.*Misae|requirements.*Misae|Misae.*requirements/i.test(combined) ||
    /Stage\s*1[^|]*\|\s*[^|]*Misae|Misae[^|]*\|[^|]*Requirements/i.test(combined);
  if (stage1Misae) {
    ok('Stage 1 (requirements) → Misae mapping found');
  } else {
    fail('Stage 1 (requirements) → Misae mapping not found in shinnosuke.md or start/SKILL.md', errors);
  }

  // Stage 2 → Nene
  const stage2Nene = /Planning.*Nene|Nene.*Stage\s*2|Stage\s*2.*Nene|planning.*Nene|Nene.*planning/i.test(combined) ||
    /Stage\s*2[^|]*\|\s*[^|]*Nene|Nene[^|]*\|[^|]*Planning/i.test(combined);
  if (stage2Nene) {
    ok('Stage 2 (planning) → Nene mapping found');
  } else {
    fail('Stage 2 (planning) → Nene mapping not found in shinnosuke.md or start/SKILL.md', errors);
  }

  // Stage 3 → Bo (PO)
  const stage3Bo = /[Ee]xecution.*Bo|Bo.*(?:PO|[Ee]xecution)|Stage\s*3.*Bo|Bo.*Stage\s*3/i.test(combined) ||
    /Stage\s*3[^|]*\|\s*[^|]*Bo|Bo\(PO\)/i.test(combined);
  if (stage3Bo) {
    ok('Stage 3 (execution) → Bo(PO) mapping found');
  } else {
    fail('Stage 3 (execution) → Bo(PO) mapping not found in shinnosuke.md or start/SKILL.md', errors);
  }

  // Stage 4 → Masumi or ActionKamen (completion review)
  const stage4Completion = /[Cc]ompletion.*(?:Masumi|Action Kamen)|Masumi.*[Cc]ompletion|Stage\s*4.*(?:Masumi|Action Kamen)/i.test(combined) ||
    /Stage\s*4[^|]*\|\s*[^|]*(?:Masumi|Action Kamen)/i.test(combined);
  if (stage4Completion) {
    ok('Stage 4 (completion) → Masumi/Action Kamen mapping found');
  } else {
    fail('Stage 4 (completion) → Masumi/Action Kamen mapping not found in shinnosuke.md or start/SKILL.md', errors);
  }

  // Verify start.md explicitly routes requirements → Misae (not Shinnosuke)
  if (startContent) {
    if (/team-shinchan:misae/i.test(startContent)) {
      ok('start/SKILL.md routes Stage 1 directly to team-shinchan:misae');
    } else {
      warn('start/SKILL.md does not explicitly reference team-shinchan:misae', warnings);
    }
    if (/Do NOT invoke Shinnosuke for Stage 1|must use Misae directly/i.test(startContent)) {
      ok('start/SKILL.md explicitly prohibits Shinnosuke invocation for Stage 1');
    } else {
      warn('start/SKILL.md does not explicitly prohibit Shinnosuke for Stage 1', warnings);
    }
  } else {
    warn('skills/start/SKILL.md not found — skipping start skill checks', warnings);
  }
}

// ─── Check 2: Agent layer assignments ───────────────────────────────────────
// Verify layer-map.json agents match actual agent .md files
// Advisory agents should reference read/grep-only tools
// Execution agents should reference Edit/Write/Bash

function checkAgentLayerAssignments(errors, warnings) {
  console.log('\n--- Check 2: Agent Layer Assignments ---\n');

  if (!fs.existsSync(LAYER_MAP_PATH)) {
    fail('agents/_shared/layer-map.json not found', errors);
    return;
  }

  let layerMap;
  try {
    layerMap = JSON.parse(fs.readFileSync(LAYER_MAP_PATH, 'utf-8'));
  } catch (e) {
    fail(`layer-map.json parse error: ${e.message}`, errors);
    return;
  }

  const { layers } = layerMap;
  if (!layers) {
    fail('layer-map.json missing "layers" field', errors);
    return;
  }

  const allLayerAgents = Object.values(layers).flat();

  // Check each layer agent has a corresponding .md file
  console.log('  Verifying agent files exist for all layer-map entries:');
  let missingFiles = 0;
  for (const agent of allLayerAgents) {
    const mdPath = path.join(AGENTS_DIR, `${agent}.md`);
    if (fs.existsSync(mdPath)) {
      ok(`  agents/${agent}.md exists`);
    } else {
      fail(`  agents/${agent}.md NOT found (referenced in layer-map.json)`, errors);
      missingFiles++;
    }
  }

  // Check advisory layer agents: should NOT list Edit/Write as primary tools
  console.log('\n  Verifying advisory layer agents are read-oriented:');
  const advisoryAgents = layers.advisory || [];
  for (const agent of advisoryAgents) {
    const mdPath = path.join(AGENTS_DIR, `${agent}.md`);
    const content = readFile(mdPath);
    if (!content) continue;

    // Extract tools: line from frontmatter
    const toolsMatch = content.match(/^tools:\s*\[([^\]]+)\]/m);
    if (!toolsMatch) {
      warn(`  ${agent}.md: no tools field found in frontmatter`, warnings);
      continue;
    }
    const tools = toolsMatch[1].split(',').map(t => t.trim().replace(/['"]/g, ''));
    const hasEdit = tools.includes('Edit');
    const hasWrite = tools.includes('Write');
    const hasBash = tools.includes('Bash');
    const hasRead = tools.includes('Read');

    if (hasRead && !hasEdit) {
      ok(`  ${agent}(advisory): Read-oriented tools (no Edit in frontmatter)`);
    } else if (hasEdit) {
      // Check if the file's text says it's read-only
      if (/read-only|READ-ONLY|cannot use Edit|NEVER Edit/i.test(content)) {
        warn(`  ${agent}(advisory): has Edit in tools frontmatter but doc says read-only — review needed`, warnings);
      } else {
        fail(`  ${agent}(advisory): has Edit in tools frontmatter — advisory agents should be read-only`, errors);
      }
    }

    // Advisory agents with Bash should have bash restrictions documented
    if (hasBash && !/Bash Restrict|Only.*read-only.*commands|NEVER.*rm|read-only.*Bash/i.test(content)) {
      warn(`  ${agent}(advisory): has Bash in tools but no Bash restriction documentation found`, warnings);
    }
  }

  // Check execution layer agents: should have Edit/Write/Bash
  console.log('\n  Verifying execution layer agents have implementation tools:');
  const executionAgents = layers.execution || [];
  for (const agent of executionAgents) {
    const mdPath = path.join(AGENTS_DIR, `${agent}.md`);
    const content = readFile(mdPath);
    if (!content) continue;

    const toolsMatch = content.match(/^tools:\s*\[([^\]]+)\]/m);
    if (!toolsMatch) {
      warn(`  ${agent}.md: no tools field found`, warnings);
      continue;
    }
    const tools = toolsMatch[1].split(',').map(t => t.trim().replace(/['"]/g, ''));
    const hasEdit = tools.includes('Edit');
    const hasWrite = tools.includes('Write');

    if (hasEdit && hasWrite) {
      ok(`  ${agent}(execution): has Edit + Write tools (correct for implementation)`);
    } else {
      fail(`  ${agent}(execution): missing Edit or Write — execution agents must be able to implement`, errors);
    }
  }
}

// ─── Check 3: Read-only agent list consistency ──────────────────────────────
// agent-tool-guard.sh defines readOnlyAgents list
// Each agent in that list should have read-only restrictions in its .md file

function checkReadOnlyAgentConsistency(errors, warnings) {
  console.log('\n--- Check 3: Read-Only Agent List Consistency ---\n');

  const hookContent = readFile(AGENT_TOOL_GUARD);
  if (!hookContent) {
    fail('hooks/agent-tool-guard.sh not found', errors);
    return;
  }

  // Extract readOnlyAgents array from the hook
  const roMatch = hookContent.match(/const\s+readOnlyAgents\s*=\s*\[([^\]]+)\]/);
  if (!roMatch) {
    fail('hooks/agent-tool-guard.sh: readOnlyAgents array not found', errors);
    return;
  }

  const readOnlyAgents = roMatch[1]
    .split(',')
    .map(a => a.trim().replace(/['"]/g, ''))
    .filter(Boolean);

  console.log(`  Hook defines ${readOnlyAgents.length} read-only agents: ${readOnlyAgents.join(', ')}`);

  // Verify each read-only agent has a .md file with read-only language
  for (const agent of readOnlyAgents) {
    const mdPath = path.join(AGENTS_DIR, `${agent}.md`);
    const content = readFile(mdPath);
    if (!content) {
      warn(`  ${agent}: listed as read-only in hook but agents/${agent}.md not found`, warnings);
      continue;
    }

    // Read-only agents should be mentioned as read-only or have restricted tools
    const isReadOnly = /read-only|READ-ONLY|NEVER Edit|cannot use Edit|No Edit|NEVER.*implement|cannot modify source/i.test(content);
    const hasEditInTools = /^tools:\s*\[[^\]]*"Edit"[^\]]*\]/m.test(content);

    if (isReadOnly || !hasEditInTools) {
      ok(`  ${agent}: read-only constraint documented or Edit absent from tools`);
    } else {
      warn(`  ${agent}: listed as read-only in hook but no explicit read-only mention in .md`, warnings);
    }
  }

  // Verify bo and kazama (execution agents) are NOT in readOnlyAgents
  const shouldBeWritable = ['bo', 'kazama'];
  for (const agent of shouldBeWritable) {
    if (readOnlyAgents.includes(agent)) {
      fail(`  ${agent}: execution agent should NOT be in readOnlyAgents list in agent-tool-guard.sh`, errors);
    } else {
      ok(`  ${agent}: correctly absent from read-only list (execution agent)`);
    }
  }

  // Verify shinnosuke (orchestration) is NOT in readOnlyAgents
  if (readOnlyAgents.includes('shinnosuke')) {
    fail('shinnosuke: orchestration agent should NOT be in readOnlyAgents', errors);
  } else {
    ok('shinnosuke: correctly absent from read-only list (orchestration agent)');
  }
}

// ─── Check 4: Subagent routing ───────────────────────────────────────────────
// shinnosuke.md must reference correct team-shinchan: subagent_type values
// Each referenced agent name must match an actual agent .md file

function checkSubagentRouting(errors, warnings) {
  console.log('\n--- Check 4: Subagent Routing Consistency ---\n');

  const shinnosukeContent = readFile(SHINNOSUKE_MD);
  if (!shinnosukeContent) {
    fail('agents/shinnosuke.md not found', errors);
    return;
  }

  // Extract all team-shinchan:agent references from shinnosuke.md
  const pattern = /team-shinchan:([\w-]+)/g;
  const referenced = new Set();
  let m;
  while ((m = pattern.exec(shinnosukeContent)) !== null) {
    referenced.add(m[1]);
  }

  // Known skills (not agents) — these are expected references in shinnosuke.md
  const KNOWN_SKILLS = new Set([
    'start', 'status', 'autopilot', 'ralph', 'ultrawork', 'plan', 'analyze', 'deepsearch',
    'debate', 'orchestrate', 'learn', 'memories', 'forget', 'help', 'resume', 'review',
    'frontend', 'backend', 'devops', 'implement', 'requirements', 'vision', 'bigproject',
    'verify-implementation', 'manage-skills', 'verify-agents', 'verify-skills',
    'verify-consistency', 'verify-workflow', 'verify-memory', 'verify-budget',
    'research', 'work-log', 'session-summary',
    'eval', 'ontology', 'impact-analysis', 'design-review', 'micro-execute',
    'micro-execute', 'shinnosuke',  // shinnosuke can reference itself for stage completion
    'setup-hud'
  ]);

  console.log(`  Found ${referenced.size} team-shinchan: references in shinnosuke.md`);

  let agentRefCount = 0;
  for (const ref of Array.from(referenced).sort()) {
    if (KNOWN_SKILLS.has(ref)) {
      ok(`  team-shinchan:${ref} (skill — skip agent file check)`);
      continue;
    }
    agentRefCount++;
    const mdPath = path.join(AGENTS_DIR, `${ref}.md`);
    if (fs.existsSync(mdPath)) {
      ok(`  team-shinchan:${ref} → agents/${ref}.md exists`);
    } else {
      fail(`  team-shinchan:${ref} referenced in shinnosuke.md but agents/${ref}.md not found`, errors);
    }
  }

  if (agentRefCount === 0) {
    warn('shinnosuke.md contains no team-shinchan: agent references (only skills)', warnings);
  }

  // Verify mandatory agent routes across the complete routing chain:
  //   shinnosuke.md, start/SKILL.md, and other orchestration skills
  // Note: shinnosuke.md uses shorthand like "Planning→Nene(opus)" in the Agent Invocation
  //   Protocol section, rather than the full team-shinchan:nene subagent_type.
  //   The actual team-shinchan:nene call lives in skills/plan/SKILL.md etc.
  //   We check both explicit references AND shorthand mentions.

  const startContent2 = readFile(START_SKILL);
  const startReferenced = new Set();
  if (startContent2) {
    const sp = /team-shinchan:([\w-]+)/g;
    let sm2;
    while ((sm2 = sp.exec(startContent2)) !== null) {
      startReferenced.add(sm2[1]);
    }
  }

  // Additional skills that are part of the orchestration chain
  const PLAN_SKILL = path.join(ROOT_DIR, 'skills/plan/SKILL.md');
  const planContent = readFile(PLAN_SKILL) || '';
  const planReferenced = new Set();
  {
    const pp = /team-shinchan:([\w-]+)/g;
    let pm;
    while ((pm = pp.exec(planContent)) !== null) {
      planReferenced.add(pm[1]);
    }
  }

  // shinnosuke.md shorthand notation: "Planning→Nene(opus)" or "Nene" in Stage table
  // Extract plain agent name mentions from shinnosuke.md shorthand
  const shinnosukeShorthand = new Set();
  const shortcutMatch = shinnosukeContent.match(/Shortcuts?:[^\n]+/i);
  if (shortcutMatch) {
    const shortcutLine = shortcutMatch[0];
    // Extract "Word→AgentName(model)" patterns
    const agentNames = shortcutLine.match(/→(\w+)\(/g) || [];
    agentNames.forEach(m => shinnosukeShorthand.add(m.slice(1, -1).toLowerCase()));
  }
  // Also capture agent names in the Stage table (| Stage | Key Agents | ...)
  const stageTableRe = /^\|\s*\d+\.\s*\w+[^|]*\|\s*([^|]+)\|/mg;
  let stm;
  while ((stm = stageTableRe.exec(shinnosukeContent)) !== null) {
    const agents = stm[1].match(/\b(Misae|Nene|Bo|Shiro|Masumi|Hiroshi|Midori|Aichan|Bunta|Masao|Kazama|Himawari)\b/g) || [];
    agents.forEach(a => shinnosukeShorthand.add(a.toLowerCase()));
  }

  const mandatoryRoutes = [
    { agent: 'misae',        label: 'Requirements analyst',  allowInStart: true,  allowShorthand: true },
    { agent: 'nene',         label: 'Strategic planner',     allowInStart: true,  allowShorthand: true, allowInPlan: true },
    { agent: 'bo',           label: 'Execution PO',          allowInStart: false, allowShorthand: true },
    { agent: 'actionkamen',  label: 'Reviewer',              allowInStart: false, allowShorthand: false },
    { agent: 'midori',       label: 'Debate facilitator',    allowInStart: false, allowShorthand: false },
  ];

  console.log('\n  Verifying mandatory agent routes across routing documents:');
  for (const { agent, label, allowInStart, allowShorthand, allowInPlan } of mandatoryRoutes) {
    if (referenced.has(agent)) {
      ok(`  team-shinchan:${agent} (${label}) referenced in shinnosuke.md`);
    } else if (allowInStart && startReferenced.has(agent)) {
      ok(`  team-shinchan:${agent} (${label}) referenced in start/SKILL.md (stage 1 routing)`);
    } else if (allowInPlan && planReferenced.has(agent)) {
      ok(`  team-shinchan:${agent} (${label}) referenced in skills/plan/SKILL.md (planning routing)`);
    } else if (allowShorthand && shinnosukeShorthand.has(agent.toLowerCase())) {
      ok(`  team-shinchan:${agent} (${label}) referenced via shorthand in shinnosuke.md`);
    } else {
      fail(`  team-shinchan:${agent} (${label}) NOT found in shinnosuke.md, start/SKILL.md, or plan/SKILL.md`, errors);
    }
  }

  // Verify start/SKILL.md also references correct agents
  const startContent = readFile(START_SKILL);
  if (startContent) {
    const startRefs = new Set();
    let sm;
    const startPattern = /team-shinchan:([\w-]+)/g;
    while ((sm = startPattern.exec(startContent)) !== null) {
      startRefs.add(sm[1]);
    }
    console.log('\n  Verifying start/SKILL.md agent references:');
    if (startRefs.has('misae')) {
      ok('  start/SKILL.md references team-shinchan:misae for Stage 1');
    } else {
      fail('  start/SKILL.md does not reference team-shinchan:misae', errors);
    }
    if (startRefs.has('shinnosuke')) {
      ok('  start/SKILL.md references team-shinchan:shinnosuke for Stages 2-4');
    } else {
      warn('  start/SKILL.md does not reference team-shinchan:shinnosuke for Stages 2-4', warnings);
    }
  }
}

// ─── Check 5: Stage rules consistency ───────────────────────────────────────
// workflow-guard.sh enforces a stage-tool matrix
// Compare what the hook actually blocks vs what shinnosuke.md describes

function checkStageRulesConsistency(errors, warnings) {
  console.log('\n--- Check 5: Stage Rules Consistency ---\n');

  const guardContent = readFile(WORKFLOW_GUARD);
  const shinnosukeContent = readFile(SHINNOSUKE_MD);

  if (!guardContent) {
    fail('hooks/workflow-guard.sh not found', errors);
    return;
  }

  if (!shinnosukeContent) {
    fail('agents/shinnosuke.md not found', errors);
    return;
  }

  // Check 5-a: requirements/planning block Edit/Write/TodoWrite
  const reqPlanBlocksEdit = /blockedInReqPlan\s*=\s*\[['"][^\]]*Edit[^\]]*\]|stage.*requirements.*Edit.*block|Edit.*requirements.*block/i.test(guardContent) ||
    /'Edit'.*blockedInReqPlan|blockedInReqPlan.*Edit/i.test(guardContent);
  if (reqPlanBlocksEdit || /blockedInReqPlan\s*=\s*\[['"]Edit['"]/m.test(guardContent)) {
    ok("workflow-guard.sh blocks 'Edit' in requirements/planning stages");
  } else {
    // Look for the array definition
    const arrayMatch = guardContent.match(/blockedInReqPlan\s*=\s*\[([^\]]+)\]/);
    if (arrayMatch && arrayMatch[1].includes('Edit')) {
      ok("workflow-guard.sh blocks 'Edit' in requirements/planning stages");
    } else {
      fail("workflow-guard.sh does not block 'Edit' in requirements/planning stages", errors);
    }
  }

  // Simpler checks using direct string match
  const blockedArrayMatch = guardContent.match(/blockedInReqPlan\s*=\s*\[([^\]]+)\]/);
  const blockedInReqPlan = blockedArrayMatch ? blockedArrayMatch[1] : '';

  if (blockedInReqPlan.includes('Write')) {
    ok("workflow-guard.sh blocks 'Write' in requirements/planning (with exceptions)");
  } else {
    fail("workflow-guard.sh does not block 'Write' in requirements/planning stages", errors);
  }

  if (blockedInReqPlan.includes('TodoWrite')) {
    ok("workflow-guard.sh blocks 'TodoWrite' in requirements/planning");
  } else {
    fail("workflow-guard.sh does not block 'TodoWrite' in requirements/planning", errors);
  }

  // Check 5-b: .shinchan-docs/ Write exception is documented
  if (/shinchan-docs.*allowed|Write.*shinchan-docs.*allowed|Exception.*Write.*shinchan-docs/i.test(guardContent) ||
      /filePath\.includes\('\.shinchan-docs\/'/.test(guardContent)) {
    ok("workflow-guard.sh allows Write to .shinchan-docs/ as exception");
  } else {
    fail("workflow-guard.sh missing .shinchan-docs/ Write exception in requirements/planning", errors);
  }

  // Check 5-c: execution stage allows all tools
  if (/execution.*allow|execution.*exit 0|stage.*execution.*allow/i.test(guardContent) ||
      /execution or unknown stage.*allow/i.test(guardContent)) {
    ok("workflow-guard.sh allows all tools in execution stage");
  } else {
    warn("workflow-guard.sh: execution stage allow-all behavior not explicitly confirmed", warnings);
  }

  // Check 5-d: completion stage blocks Edit/TodoWrite
  const completionBlockMatch = guardContent.match(/blockedInCompletion\s*=\s*\[([^\]]+)\]/);
  const blockedInCompletion = completionBlockMatch ? completionBlockMatch[1] : '';
  if (blockedInCompletion.includes('Edit')) {
    ok("workflow-guard.sh blocks 'Edit' in completion stage");
  } else {
    fail("workflow-guard.sh does not block 'Edit' in completion stage", errors);
  }

  if (blockedInCompletion.includes('TodoWrite')) {
    ok("workflow-guard.sh blocks 'TodoWrite' in completion stage");
  } else {
    fail("workflow-guard.sh does not block 'TodoWrite' in completion stage", errors);
  }

  // Check 5-e: completion Write restriction (.shinchan-docs/ or .md only)
  if (/completion.*Write.*shinchan-docs|Write.*completion.*md|\.endsWith\('\.md'\)/i.test(guardContent)) {
    ok("workflow-guard.sh restricts Write in completion to .shinchan-docs/ or .md files");
  } else {
    fail("workflow-guard.sh missing Write restriction in completion stage", errors);
  }

  // Check 5-f: shinnosuke.md documents stage-transition gates
  const hasTransitionGates = /Stage Transition Gates|S1.*S2|S2.*S3|S3.*S4/i.test(shinnosukeContent);
  if (hasTransitionGates) {
    ok("shinnosuke.md documents Stage Transition Gates");
  } else {
    fail("shinnosuke.md missing Stage Transition Gates documentation", errors);
  }

  // Check 5-g: shinnosuke.md Prohibited section says no Edit/Write
  if (/Prohibited.*No Edit|No Edit.*No Write|No.*Edit.*Write/i.test(shinnosukeContent)) {
    ok("shinnosuke.md Prohibited section bans Edit/Write (orchestrator cannot code)");
  } else {
    warn("shinnosuke.md Prohibited section does not explicitly ban Edit/Write", warnings);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

function runValidation() {
  console.log('========================================');
  console.log('  Agent Routing Validation (Static)');
  console.log('========================================');

  const errors = [];
  const warnings = [];

  checkStageOwnerMapping(errors, warnings);
  checkAgentLayerAssignments(errors, warnings);
  checkReadOnlyAgentConsistency(errors, warnings);
  checkSubagentRouting(errors, warnings);
  checkStageRulesConsistency(errors, warnings);

  console.log('\n----------------------------------------');
  console.log(`Errors: ${errors.length} | Warnings: ${warnings.length}`);
  console.log('----------------------------------------\n');

  if (errors.length > 0) {
    console.log('Errors:');
    errors.forEach(e => console.log(`  \x1b[31m• ${e}\x1b[0m`));
    console.log();
  }

  if (warnings.length > 0) {
    console.log('Warnings:');
    warnings.forEach(w => console.log(`  \x1b[33m• ${w}\x1b[0m`));
    console.log();
  }

  return errors.length;
}

if (require.main === module) {
  const errorCount = runValidation();
  process.exit(errorCount > 0 ? 1 : 0);
}

module.exports = { runValidation };
