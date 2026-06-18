#!/bin/bash
# Team-Shinchan Transition Gate — Programmatic PreToolUse Hook
# Validates stage transition prerequisites before WORKFLOW_STATE.yaml writes.
# Blocks advancement if required artifacts are missing.
#
# Stdin: {"tool_name":"...","tool_input":{...}}
# Stdout: {"decision":"block","reason":"..."} or empty (allow)
set -eo pipefail

INPUT=$(cat)
if [ -z "$INPUT" ]; then
  exit 0
fi

PROJECT_ROOT="${PWD}"
DOCS_DIR="${PROJECT_ROOT}/.shinchan-docs"

if [ ! -d "$DOCS_DIR" ]; then
  exit 0
fi

RESULT=$(echo "$INPUT" | DOCS_DIR="$DOCS_DIR" node -e "
const fs = require('fs');
const path = require('path');
const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  let input;
  try { input = JSON.parse(chunks.join('')); } catch(e) { process.exit(0); }

  const toolName = input.tool_name || '';
  const toolInput = input.tool_input || {};
  const filePath = toolInput.file_path || '';

  // Only intercept Write/Edit to WORKFLOW_STATE.yaml
  if (!filePath.includes('WORKFLOW_STATE.yaml')) {
    process.exit(0);
  }

  // For Write: check content; for Edit: check both old_string and new_string
  const newContent = toolInput.content || toolInput.new_string || '';

  // Detect stage change in new content
  let stageMatch = newContent.match(/stage:\\s*([\\w]+)/);

  // For Edit: if new_string is just the stage name (partial replace), check old_string for context
  if (!stageMatch && toolName === 'Edit' && toolInput.old_string && toolInput.new_string) {
    const oldHasStage = /stage:\\s*\\w+/.test(toolInput.old_string) || /^\\s*(requirements|design|planning|execution|completion)\\s*$/.test(toolInput.old_string);
    const newIsStage = /^\\s*(requirements|design|planning|execution|completion)\\s*$/.test(toolInput.new_string.trim());
    if (oldHasStage && newIsStage) {
      stageMatch = [null, toolInput.new_string.trim()];
    }
  }

  // Detect status change (completed/done)
  let statusMatch = newContent.match(/status:\\s*([\\w]+)/);
  if (!statusMatch && toolName === 'Edit' && toolInput.old_string && toolInput.new_string) {
    const oldHasStatus = /status:\\s*\\w+/.test(toolInput.old_string);
    const newIsStatus = /^\\s*(active|paused|completed|done|blocked)\\s*$/.test(toolInput.new_string.trim());
    if (oldHasStatus && newIsStatus) {
      statusMatch = [null, toolInput.new_string.trim()];
    }
  }
  const newStatus = statusMatch ? statusMatch[1].trim() : '';

  if (!stageMatch && !['completed', 'done'].includes(newStatus)) {
    process.exit(0); // No stage change or completion status detected
  }

  const newStage = stageMatch ? stageMatch[1].trim() : '';

  // Get doc directory
  const docDir = path.dirname(filePath);
  const missing = [];

  // Read current stage from disk (shared by stage transition gate + status completion gate)
  let currentStage = '';
  try {
    const current = fs.readFileSync(filePath, 'utf-8');
    const cm = current.match(/^\\s*stage:\\s*(\\w+)/m);
    if (cm) currentStage = cm[1].trim();
  } catch(e) {}

  // === Stage transition gates ===
  if (stageMatch && newStage) {
    if (currentStage !== newStage) {
      const stageOrder = ['requirements', 'design', 'planning', 'execution', 'completion'];
      const currentIdx = stageOrder.indexOf(currentStage);
      const newIdx = stageOrder.indexOf(newStage);

      if (newIdx > currentIdx && currentIdx !== -1 && newIdx !== -1) {
        // Gate: requirements -> design (normal path) OR requirements -> planning (skip-design / quick-fix path)
        // Both consume Misae's requirements output, so they share the same prerequisites:
        // REQUESTS.md present + AK APPROVED for requirements + the ambiguity (clarity) gate.
        if (currentStage === 'requirements' && (newStage === 'design' || newStage === 'planning')) {
          // main-075 fix: honor output_format (REQUESTS.html when html, else REQUESTS.md).
          // output_format is recorded in WORKFLOW_STATE.yaml (e.g. requests_written history event).
          const ofMatch = (() => { try { return fs.readFileSync(filePath, 'utf-8').match(/output_format:\\s*(\\S+)/); } catch(e) { return null; } })();
          const outputFormat = ofMatch ? ofMatch[1].replace(/['\"]/g, '').trim() : 'markdown';
          const reqLabel = outputFormat === 'html' ? 'REQUESTS.html' : 'REQUESTS.md';
          const reqFile = path.join(docDir, reqLabel);
          if (!fs.existsSync(reqFile)) {
            missing.push(reqLabel + ' does not exist');
          } else {
            const content = fs.readFileSync(reqFile, 'utf-8');
            if (!content.match(/problem|목표|objective/i)) {
              missing.push(reqLabel + ' missing Problem Statement / Objective');
            }
            if (!content.match(/requirement|요구사항|기능/i)) {
              missing.push(reqLabel + ' missing Requirements section');
            }
          }
          // Advisory: Plan Mode — not a hard block (R-5: may not be supported in all versions)
          console.warn('[transition-gate] ADVISORY: Nene should call EnterPlanMode before starting PROGRESS.md (FR-P0.1). Not a hard block.');

          // Defense-in-depth: AK APPROVED must exist in history for requirements stage
          const yamlOnDisk = (() => { try { return fs.readFileSync(filePath, 'utf-8'); } catch(e) { return ''; } })();
          const hasAkApprovedReq = yamlOnDisk.includes('event: ak_review') &&
                                   yamlOnDisk.includes('stage: requirements') &&
                                   yamlOnDisk.includes('verdict: APPROVED') &&
                                   yamlOnDisk.includes('agent: action_kamen');
          if (!hasAkApprovedReq) {
            missing.push('No Action Kamen APPROVED review recorded for requirements stage in workflow history → Run: Task(subagent_type=\'team-shinchan:actionkamen\') for stage: requirements, then record verdict in WORKFLOW_STATE.yaml history');
          }

          // Ambiguity Gate (FR-1.4, FR-1.5, NFR-4, HR-1, HR-5)
          // Uses yamlOnDisk already read above — no extra fs.readFileSync
          const clarityRaw = (() => {
            try {
              const goalM = yamlOnDisk.match(/goal_clarity:\\s*([\\d.]+)/);
              const constrM = yamlOnDisk.match(/constraint_clarity:\\s*([\\d.]+)/);
              const successM = yamlOnDisk.match(/success_criteria:\\s*([\\d.]+)/);
              // Anchor on indentation so 'weighted_overall' does NOT satisfy the bare 'overall' match.
              const overallM = yamlOnDisk.match(/^\\s+overall:\\s*([\\d.]+)/m);
              const weightedM = yamlOnDisk.match(/^\\s+weighted_overall:\\s*([\\d.]+)/m);
              const gateThreshM = yamlOnDisk.match(/gate_threshold:\\s*([\\d.]+)/);
              const gateLoopM = yamlOnDisk.match(/gate_loop_enabled:\\s*(true|false)/);
              if (!goalM && !constrM && !successM && !overallM) return null; // absent = legacy
              return {
                goal: parseFloat(goalM ? goalM[1] : 'NaN'),
                constraint: parseFloat(constrM ? constrM[1] : 'NaN'),
                success: parseFloat(successM ? successM[1] : 'NaN'),
                overall: parseFloat(overallM ? overallM[1] : 'NaN'),
                weightedOverall: weightedM ? parseFloat(weightedM[1]) : null,
                gateThreshold: gateThreshM ? parseFloat(gateThreshM[1]) : 0.8,
                gateLoopEnabled: gateLoopM ? gateLoopM[1] === 'true' : false,
              };
            } catch(e) { return null; }
          })();

          if (clarityRaw === null) {
            // NFR-4 / HR-5: absent = legacy workflow, warn but allow
            console.warn('[transition-gate] AMBIGUITY GATE: clarity_score absent — legacy workflow, allowing transition.');
          } else {
            // HR-1: validate arithmetic mean (±0.05 tolerance)
            const computedMean = (clarityRaw.goal + clarityRaw.constraint + clarityRaw.success) / 3;
            const arithmeticValid = Math.abs(computedMean - clarityRaw.overall) <= 0.05;
            // main-075 fix: Gate-Loop path honors weighted_overall + gate_threshold when
            // gate_loop_enabled (the interview exit criterion). Legacy workflows fall back to
            // the unweighted overall < 0.8 check.
            const useWeighted = clarityRaw.gateLoopEnabled &&
                                clarityRaw.weightedOverall !== null &&
                                !Number.isNaN(clarityRaw.weightedOverall);
            const effectiveScore = useWeighted ? clarityRaw.weightedOverall : clarityRaw.overall;
            const effectiveThreshold = useWeighted ? clarityRaw.gateThreshold : 0.8;
            if (!arithmeticValid) {
              missing.push(
                'AMBIGUITY GATE: clarity_score.overall (' + clarityRaw.overall.toFixed(2) +
                ') does not equal arithmetic mean of sub-scores (' + computedMean.toFixed(2) +
                ') — possible tampering (HR-1)'
              );
            } else if (effectiveScore < effectiveThreshold) {
              missing.push(
                'AMBIGUITY GATE: ' + (useWeighted ? 'weighted_overall' : 'clarity_score.overall') +
                ' = ' + effectiveScore.toFixed(2) + ' < ' + effectiveThreshold.toFixed(2) +
                ' — return to Misae for clarification'
              );
            }
            // score >= threshold and arithmetic valid: pass silently (FR-1.5)
          }

          // === Recurrence-Escalation Gate (glucofit adoption) ===
          // glucofit: one root cause spawned 5 per-widget tickets across runs; nothing ever noticed
          // \"we keep touching this file.\" When a file referenced in THIS REQUESTS has already been
          // changed in >=2 prior workflows, make the recurrence VISIBLE: require an explicit
          // acknowledgment (root-cause stance) before planning — a 3rd+ symptom patch to the same
          // file must not proceed silently. Conservative: fires only on a concrete file-level repeat.
          try {
            const reqText = fs.readFileSync(reqFile, 'utf-8');
            const reqRefs = (reqText.match(/\`([a-zA-Z0-9_\\-\\/]+\\.[a-z]{1,5})\`/g) || []).map(s => s.replace(/\`/g, ''));
            if (reqRefs.length > 0) {
              const shinDir = path.dirname(docDir);
              const priorImpls = [];
              const collect = (dir) => { try { for (const e of fs.readdirSync(dir)) {
                const sub = path.join(dir, e);
                if (sub === docDir) continue;
                const impl = path.join(sub, 'IMPLEMENTATION.md');
                if (fs.existsSync(impl)) priorImpls.push(fs.readFileSync(impl, 'utf-8'));
              } } catch(_e) {} };
              collect(shinDir);
              collect(path.join(shinDir, 'archived'));
              const recurring = reqRefs.filter(ref => priorImpls.filter(t => t.includes(ref)).length >= 2);
              const hasAck = /recurrence\\s*[:：]|반복\\s*(인정|확인|이력)|재발|근본\\s*원인|root[-\\s]?cause/i.test(reqText);
              if (recurring.length > 0 && !hasAck) {
                missing.push('RECURRENCE GATE: ' + recurring.slice(0, 3).join(', ') + ' has been changed in >=2 prior workflows — this is a recurring class, not a fresh problem. Add a \"Recurrence:\" line to REQUESTS.md naming the ROOT CAUSE (or justify why a fresh fix is correct) before planning. Repeated symptom-patches to the same file must escalate to root-cause.');
              }
            }
          } catch(_e) {}
        }

        // Gate: design -> planning
        // The design stage (Hiroshi, interactive design interview) must produce an
        // AK-approved DESIGN.md before Nene plans against it.
        if (currentStage === 'design' && newStage === 'planning') {
          // main-075 fix: honor output_format (DESIGN.html when html, else DESIGN.md), mirroring
          // the requirements gate above. Without this, html-format design workflows can never advance.
          const ofMatchD = (() => { try { return fs.readFileSync(filePath, 'utf-8').match(/output_format:\\s*(\\S+)/); } catch(e) { return null; } })();
          const outputFormatD = ofMatchD ? ofMatchD[1].replace(/['\"]/g, '').trim() : 'markdown';
          const designLabel = outputFormatD === 'html' ? 'DESIGN.html' : 'DESIGN.md';
          const designFile = path.join(docDir, designLabel);
          if (!fs.existsSync(designFile)) {
            missing.push(designLabel + ' does not exist — the design stage must produce an architecture/design document before planning');
          } else {
            const content = fs.readFileSync(designFile, 'utf-8');
            if (!content.match(/architecture|component|approach|설계|아키텍처|컴포넌트|접근/i)) {
              missing.push(designLabel + ' missing an Architecture / Approach / Components section');
            }
            if (!content.match(/decision|결정|trade-?off|rationale|근거/i)) {
              missing.push(designLabel + ' missing Key Decisions / rationale — record the design choices made during the interview');
            }
            // === Seam Gate (glucofit / main-075 adoption) ===
            // Telemetry: :start produced per-symptom patches (e.g. 5 tickets for 1 root cause)
            // because no gate ever asked \"where is the single seam, and what is the blast radius?\"
            // The impact-analysis / systematic-debugging skills already existed but were orphaned.
            // Make the seam decision VISIBLE at the design→planning boundary (mirrors the DEBATE GATE):
            // the gate requires the SECTION to exist with substance; AK judges its quality.
            if (!content.match(/blast\\s*radius|영향\\s*범위|영향범위|영향\\s*반경/i)) {
              missing.push(designLabel + ' missing a \"## Blast Radius & Seam\" section — map the impact radius (files/components affected) and justify this is the single root-cause seam, not a symptom site. Seed it with /team-shinchan:impact-analysis.');
            } else if (!content.match(/기존\\s*(메커니즘|구현|코드|솔루션|방식|로직)|existing\\s+(mechanism|implementation|code|solution)|단일\\s*(지점|seam)|root[-\\s]?cause|근본\\s*(원인|지점)|증상\\s*(위치|지점)|symptom\\s*site/i)) {
              missing.push(designLabel + ' \"Blast Radius & Seam\" section is present but lacks substance — it must (a) name the EXISTING mechanism(s) surveyed for this problem and (b) justify single-seam vs N-symptom-sites. A heading alone is not enough.');
            }
          }
          // Defense-in-depth: AK APPROVED must exist in history for design stage
          const yamlOnDiskDesign = (() => { try { return fs.readFileSync(filePath, 'utf-8'); } catch(e) { return ''; } })();
          const hasAkApprovedDesign = yamlOnDiskDesign.includes('event: ak_review') &&
                                      yamlOnDiskDesign.includes('stage: design') &&
                                      yamlOnDiskDesign.includes('verdict: APPROVED') &&
                                      yamlOnDiskDesign.includes('agent: action_kamen');
          if (!hasAkApprovedDesign) {
            missing.push('No Action Kamen APPROVED review recorded for design stage in workflow history → Run: Task(subagent_type=\'team-shinchan:actionkamen\') for stage: design, then record verdict in WORKFLOW_STATE.yaml history');
          }
        }

        // Gate: planning -> execution
        if (currentStage === 'planning' && newStage === 'execution') {
          // main-075 fix: honor output_format for REQUESTS (html → REQUESTS.html). PROGRESS.md is
          // always markdown (Nene's plan), so it is not format-switched.
          const ofMatchP = (() => { try { return fs.readFileSync(filePath, 'utf-8').match(/output_format:\\s*(\\S+)/); } catch(e) { return null; } })();
          const outputFormatP = ofMatchP ? ofMatchP[1].replace(/['\"]/g, '').trim() : 'markdown';
          const reqLabelP = outputFormatP === 'html' ? 'REQUESTS.html' : 'REQUESTS.md';
          const reqFile = path.join(docDir, reqLabelP);
          const progFile = path.join(docDir, 'PROGRESS.md');
          if (!fs.existsSync(reqFile)) {
            missing.push(reqLabelP + ' does not exist');
          }
          if (!fs.existsSync(progFile)) {
            missing.push('PROGRESS.md does not exist');
          } else {
            const content = fs.readFileSync(progFile, 'utf-8');
            if (!content.match(/phase|단계/i)) {
              missing.push('PROGRESS.md missing Phase definitions');
            }

            // Plan Validation Gate — 3 quality checks (FR-2)
            const phases = content.split(/^## Phase \\d+/m).slice(1);

            // Defense-in-depth: AK APPROVED must exist in history for planning stage
            const yamlOnDiskPlan = (() => { try { return fs.readFileSync(filePath, 'utf-8'); } catch(e) { return ''; } })();
            const hasAkApprovedPlan = yamlOnDiskPlan.includes('event: ak_review') &&
                                      yamlOnDiskPlan.includes('stage: planning') &&
                                      yamlOnDiskPlan.includes('verdict: APPROVED') &&
                                      yamlOnDiskPlan.includes('agent: action_kamen');
            if (!hasAkApprovedPlan) {
              missing.push('No Action Kamen APPROVED review recorded for planning stage in workflow history → Run: Task(subagent_type=\'team-shinchan:actionkamen\') for stage: planning, then record verdict in WORKFLOW_STATE.yaml history');
            }

            // Check 1: Every Phase must have at least 1 AC reference (FR-2.1)
            // Accepts: AC-1, FR-01, NFR, or **AC**: pattern (flexible AC format)
            for (let i = 0; i < phases.length; i++) {
              if (!phases[i].match(/AC-\\d+|FR-\\d+|NFR|\\*\\*AC\\*\\*:/)) {
                missing.push('Plan Validation: Phase ' + (i+1) + ' missing Acceptance Criteria (AC) reference');
              }
            }

            // Check 2: File references must resolve to existing files (FR-2.2)
            const fileRefs = content.match(/\`([a-zA-Z0-9_\\-\\/\\.]+\\.(md|js|sh|json|yaml|yml|ts|tsx))\`/g) || [];
            const projectRoot = path.resolve(docDir, '../..');
            for (const ref of fileRefs) {
              const cleaned = ref.replace(/\`/g, '').replace(/:[0-9\\-]+$/, '');
              if (cleaned.includes('*') || cleaned.includes('{')) continue;
              if (cleaned.startsWith('$')) continue;
              if (cleaned.startsWith('#') || cleaned.startsWith('//')) continue;
              const fullPath = path.join(projectRoot, cleaned);
              if (!fs.existsSync(fullPath) && !content.includes('Create') && !content.includes('신규')) {
                // Only warn for files that should exist (not files to be created)
                // Skip if the Phase section mentions creating this file
                const refPhase = phases.find(p => p.includes(cleaned));
                if (refPhase && (refPhase.includes('Create') || refPhase.includes('생성') || refPhase.includes('신규'))) continue;
                missing.push('Plan Validation: PROGRESS.md references non-existent file: ' + cleaned);
              }
            }

            // Check 3: Phase descriptions must be specific enough (FR-2.3)
            for (let i = 0; i < phases.length; i++) {
              const firstLine = phases[i].split('\\n').find(l => l.trim().length > 0) || '';
              const trimmed = firstLine.replace(/^[:#\\s\\(\\)\\w\\-]+/, '').trim();
              if (firstLine.trim().length < 20) {
                missing.push('Plan Validation: Phase ' + (i+1) + ' description too short (< 20 chars): \"' + firstLine.trim().substring(0, 40) + '\"');
              }
            }

            // === Debate Gate (design-decision record required) ===
            // Telemetry showed Midori never fired (0 of thousands of logged actions) because debate
            // was a soft auto-detect. This makes the debate/no-debate choice VISIBLE at the
            // planning to execution boundary: require a recorded debate OR an explicit one-line waiver.
            const yamlForDebate = (() => { try { return fs.readFileSync(filePath, 'utf-8'); } catch(e) { return ''; } })();
            let reqForDebate = '';
            try { reqForDebate = fs.readFileSync(reqFile, 'utf-8'); } catch(e) {}
            const hasDebateRef = /DECISION-\\d+/.test(content) ||
              /event:\\s*debate|agent:\\s*midori|\\bmidori\\b|fierce-debate/i.test(yamlForDebate);
            // main-075 fix: an AK-approved Stage 1.5 design stage is itself a recorded, reviewed
            // design-decision deliberation (DESIGN.md/DESIGN.html with DEC-N choices + AK APPROVED).
            // The debate gate predates the design stage; recognize it so design-stage workflows are
            // not forced into a redundant Midori debate. Design-skipped / quick-fix workflows have no
            // approved design and still require a debate OR a reasoned waiver.
            const hasApprovedDesign = yamlForDebate.includes('event: ak_review') &&
              yamlForDebate.includes('stage: design') &&
              yamlForDebate.includes('verdict: APPROVED') &&
              yamlForDebate.includes('agent: action_kamen') &&
              (fs.existsSync(path.join(docDir, 'DESIGN.md')) || fs.existsSync(path.join(docDir, 'DESIGN.html')));
            // Waiver must include a REASON (not a content-free 'none') — a bare waiver was the rubber-stamp hole.
            const hasWaiver = /design\\s+decisions?\\s*\\**\\s*:\\s*\\**\\s*(none|n\\/a)\\b\\s*[—:,\\-(]\\s*\\S/i.test(content) ||
              /no\\s+design\\s+decisions?\\b[^\\n]*[—:,\\-(]\\s*\\S/i.test(content) ||
              /토론\\s*(불필요|없음)\\s*[—:,\\-(]?\\s*\\S/.test(content) ||
              /debate\\s*\\**\\s*:\\s*\\**\\s*(none|waived|n\\/a)\\b\\s*[—:,\\-(]\\s*\\S/i.test(content);
            // Design-decision signals = a CHOICE is present (choice vocabulary, not mere topic keywords — avoids false-positive friction).
            const designSignals = /\\bvs\\.?\\b|\\bversus\\b|option\\s+[ab]\\b|approach\\s+[12]\\b|trade-?off|alternative approach|irreversible|두 가지 (방식|접근)|중 (선택|어느)/i;
            const hasSignals = designSignals.test(content) || designSignals.test(reqForDebate);
            if (hasDebateRef || hasApprovedDesign) {
              // A design-decision record exists — either a debate (DECISION-NNN / debate event) OR an
              // AK-approved Stage 1.5 design stage (DESIGN.md/.html). Gate satisfied.
            } else if (hasSignals) {
              // Floor + signal hard-layer: when a choice is detected, a waiver is NOT enough — debate is required.
              missing.push('DEBATE GATE: design-decision signals (vs / option A|B / approach 1|2 / trade-off / alternative / irreversible) detected in the plan or requirements, but no debate decision is recorded. A waiver is NOT sufficient here — run /team-shinchan:debate (or /team-shinchan:fierce-debate for irreversible/high-stakes) and cite the resulting DECISION-NNN in PROGRESS.md.');
            } else if (!hasWaiver) {
              missing.push('DEBATE GATE: planning to execution requires a design-decision record. Either run /team-shinchan:debate and cite the DECISION-NNN in PROGRESS.md, OR add a one-line waiver WITH A REASON to PROGRESS.md: \"Design decisions: none - {why no design choice exists}\".');
            }
            // else: no signals + a waiver that includes a reason → allow (trivial transition, minimal friction).
          }
        }

        // Gate: execution -> completion
        if (currentStage === 'execution' && newStage === 'completion') {
          const progFile = path.join(docDir, 'PROGRESS.md');
          if (!fs.existsSync(progFile)) {
            missing.push('PROGRESS.md does not exist');
          }
          try {
            const yaml = fs.readFileSync(filePath, 'utf-8');
            if (!yaml.includes('action_kamen') && !yaml.includes('verify_implementation')) {
              missing.push('No Action Kamen review recorded in workflow history');
            }
          } catch(e) {}
        }
      }
    }
  }

  // === Status completion gate ===
  // Block status: completed/done unless RETROSPECTIVE.md + IMPLEMENTATION.md exist
  if (['completed', 'done'].includes(newStatus)) {
    if (currentStage !== 'completion') {
      missing.push('current.stage is \"' + currentStage + '\" — must be \"completion\" before marking workflow as completed. Transition to Stage 4 (completion) first.');
    }
    const retroFile = path.join(docDir, 'RETROSPECTIVE.md');
    const implFile = path.join(docDir, 'IMPLEMENTATION.md');
    if (!fs.existsSync(implFile)) {
      missing.push('IMPLEMENTATION.md does not exist — required before marking workflow as completed');
    } else {
      // FR-1.4 (main-073): RETROSPECTIVE.md is optional if IMPLEMENTATION.md contains ## Lessons.
      // Legacy workflows (main-070..072) still satisfy the gate via RETROSPECTIVE.md.
      const hasLessons = (() => {
        try { return /\n##\s+Lessons\b/.test(fs.readFileSync(implFile, 'utf-8')); }
        catch(e) { return false; }
      })();
      if (!hasLessons && !fs.existsSync(retroFile)) {
        missing.push('RETROSPECTIVE.md missing AND IMPLEMENTATION.md has no `## Lessons` section — one is required before marking workflow as completed (FR-1.4)');
      }
      // === Outcome-Verification Gate (glucofit / main-075 adoption) ===
      // \"구현 다 하고 QA하면 엉망\": completion accepted self-graded checklists + self-authored
      // tests and never recorded OUTCOME evidence, so broken deliverables passed as done. Require a
      // Verification record with an explicit PASS verdict — either VERIFICATION.md or a
      // \"## Verification\" section in IMPLEMENTATION.md. (AK/grounding judge that the evidence is
      // real; this gate makes its ABSENCE non-skippable.)
      const implForVerify = (() => { try { return fs.readFileSync(implFile, 'utf-8'); } catch(e) { return ''; } })();
      const verifFileContent = (() => { try { return fs.readFileSync(path.join(docDir, 'VERIFICATION.md'), 'utf-8'); } catch(e) { return ''; } })();
      const hasVerifSection = /\\n##\\s+Verification\\b/i.test(implForVerify) || verifFileContent.length > 0;
      const hasVerdict = /verdict\\s*[:=]\\s*\\**\\s*(pass|passed|✅)/i.test(implForVerify) ||
                         /verdict\\s*[:=]\\s*\\**\\s*(pass|passed|✅)/i.test(verifFileContent);
      if (!hasVerifSection || !hasVerdict) {
        missing.push('OUTCOME-VERIFICATION GATE: no recorded verification evidence with a PASS verdict — add VERIFICATION.md (or a \"## Verification\" section in IMPLEMENTATION.md) that exercises each REQUESTS.md acceptance criterion against REAL behavior (run the built-in `verify`/`run` skill; for non-runnable deliverables run the AC check commands) and records Command / Observed / Verdict: PASS. Self-graded checklists are not evidence.');
      }
    }
  }

  if (missing.length > 0) {
    console.log(JSON.stringify({
      decision: 'block',
      reason: 'TRANSITION GATE: Blocked. Missing prerequisites:\\n- ' + missing.join('\\n- ')
    }));
    return;
  }

  process.exit(0);
});
" 2>/dev/null || true)

if [ -n "$RESULT" ]; then
  echo "$RESULT"
fi

exit 0
