export const meta = {
  name: 'fierce-review',
  description: 'Adversarial multi-dimension code review: dimensions fan out as independent agents, every finding is challenged by a skeptic (false-positive unless proven against the code), completeness + interaction critics hunt uncovered files/rules and cross-dimension issues, and three diverse-lens Action-Kamen judges score against the shared rubric (reconciled by min-score-per-item).',
  phases: [
    { title: 'Review', detail: 'one agent per dimension — correctness / security / performance / quality / tests / principles' },
    { title: 'Verify', detail: 'a skeptic refutes each finding; is_real=true only if it holds against the actual code' },
    { title: 'Critic', detail: 'completeness critic (uncovered files/paths/rules) + interaction critic (cross-dimension issues) — fights agentic laziness' },
    { title: 'Judge',  detail: 'three diverse-lens judges (correctness / security / maintainability); the gate takes the MIN score per rubric item and is blocked by any confirmed CRITICAL/HIGH' },
  ],
}

// args = { scope, files: [paths], baseRef, rubric, deepen }
//   The Workflow runtime delivers `args` as a JSON STRING (verified in fierce-debate:
//   typeof args === 'string'), so parse defensively — it may arrive as a string, an
//   already-parsed object, or undefined.
//   The SCRIPT itself has no filesystem access, so it cannot read eval-rubrics.json or
//   run git. The SKILL.md (main loop) resolves `scope`/`files` (git diff) and injects the
//   chosen `rubric` from agents/_shared/eval-rubrics.json — keeping that file the single
//   source of truth (DRY). The spawned AGENTS are full subagents and DO read the code.
//   The Workflow agent registry does NOT expose plugin subagents (team-shinchan:actionkamen,
//   etc.) — agentType resolves built-ins only — so the Action Kamen persona is delivered by
//   PROMPT INJECTION here, not via agentType, exactly as fierce-debate does.
function parseArgs(a) {
  if (typeof a === 'string') { try { return JSON.parse(a) } catch (e) { return {} } }
  return (a && typeof a === 'object') ? a : {}
}
const A = parseArgs(args)
const scope = A.scope || 'working tree changes'
const files = Array.isArray(A.files) ? A.files : []
const deepen = A.deepen !== false   // quality-first: deepen is the DEFAULT; only an explicit deepen:false opts out (honors the user knob)

// OFFLINE FALLBACK ONLY. This script has no filesystem access, so it cannot read
// agents/_shared/eval-rubrics.json. The SKILL's main loop injects the canonical rubric via
// `args` (the single source of truth); this copy is used ONLY when a caller omits or
// malforms `rubric`. Keep it in sync with eval-rubrics.json `default` (3 items, 60%).
const DEFAULT_RUBRIC = {
  items: [
    { label: 'Correctness', max: 5 },
    { label: 'Completeness', max: 5 },
    { label: 'Quality', max: 5 },
  ],
  pass_threshold_pct: 60,
}
// Validate the injected rubric's SHAPE, not just its type — a partial rubric would otherwise
// inject the literal string 'undefined' into the pass gate or force the judge to invent items
// (forking the rubric the SKILL forbids). Fall back to the offline default if malformed.
const rubric = (A.rubric && typeof A.rubric === 'object'
  && Array.isArray(A.rubric.items) && A.rubric.items.length > 0
  && typeof A.rubric.pass_threshold_pct === 'number')
  ? A.rubric
  : DEFAULT_RUBRIC

// Action Kamen persona. The SKILL injects it via `node src/workflow-personas.js actionkamen`
// (DRY with agents/actionkamen.md); the review-specific directives are appended. The literal
// fallback keeps the script self-contained when no persona is injected.
const REVIEW_DIRECTIVES = 'Read the actual files before judging; show your work; never rubber-stamp. Be specific and file:line-anchored.'
// Dogfood-proven failure mode: reviewers/skeptics that lack the Workflow runtime API as ground
// truth false-positive on valid primitives (e.g. flag `pipeline()` as "undefined / crashes the
// script") when the file under review is itself a *.workflow.js. Inject the API + an empiricism
// rule so EVERY reviewer, skeptic, critic and judge (all built on AK) reasons from fact, not
// inference. Scoped to runs that actually include a Workflow script so normal reviews stay lean.
const reviewingWorkflowScript = files.some(f => /\.workflow\.js$/.test(String(f)))
const WORKFLOW_API_NOTE = reviewingWorkflowScript
  ? ' WORKFLOW-RUNTIME GROUND TRUTH (some files under review are Claude Code Workflow scripts, *.workflow.js): the runtime provides these GLOBAL primitives — never flag them as undefined or as missing imports: agent(prompt, opts?), parallel(thunks), pipeline(items, ...stages), phase(title), log(msg), workflow(name, args), plus the globals args and budget. Such a script starts with `export const meta = {...}` and runs its body with top-level await. EMPIRICAL EXECUTION OUTWEIGHS INFERENCE: if a script produced output it necessarily ran through the primitives on that path, so do not raise a "this primitive does not exist / the script crashes at this call" finding unless you have evidence the runtime itself rejected it.'
  : ''
const AK = ((A.persona && String(A.persona).trim())
  ? `${String(A.persona).trim()} ${REVIEW_DIRECTIVES}`
  : `You are Action Kamen, team-shinchan’s uncompromising, justice-minded reviewer. ${REVIEW_DIRECTIVES}`)
  + WORKFLOW_API_NOTE
const fileList = files.length ? files.join('\n') : '(no explicit file list — discover changed files yourself with git)'

const DIMENSIONS = [
  { key: 'correctness', focus: 'logic errors, unhandled edge cases, missing input validation, off-by-one, and whether it actually meets the stated scope/spec' },
  { key: 'security',    focus: 'injection (SQL/XSS/command), broken authn/authz boundaries, secrets in code/logs, unsafe handling of untrusted input — apply rules/security.md' },
  { key: 'performance', focus: 'N+1 queries, memory leaks, hot-path algorithmic complexity, blocking I/O on the request path' },
  { key: 'quality',     focus: 'naming, DRY violations, single-responsibility, magic numbers, 3+ deep property chains and implicit type coercion (LLM_COMPREHENSION_RISK), project-pattern compliance — apply rules/coding.md' },
  { key: 'tests',       focus: 'behavior (not implementation) coverage, missing edge-case tests, flaky patterns (timing/order/global state), and regression evidence for each modified module (S4)' },
  { key: 'principles',  focus: 'Karpathy principles + Skepticism S1–S4: surgical/minimal changes, simplicity first, validated assumptions (no unguarded assume:), and the evidence gate (no "should/probably/seems to" without command output)' },
]

const FINDING_ITEM = {
  type: 'object', additionalProperties: false,
  required: ['severity', 'file', 'line', 'title', 'detail', 'suggested_fix'],
  properties: {
    severity: { enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
    file: { type: 'string' },
    line: { type: 'string', description: 'line or range, e.g. "42" or "42-58"; "n/a" if not line-specific' },
    title: { type: 'string' },
    detail: { type: 'string' },
    suggested_fix: { type: 'string' },
  },
}
const FINDINGS = {
  type: 'object', additionalProperties: false, required: ['findings'],
  properties: { findings: { type: 'array', items: FINDING_ITEM } },
}
const CHALLENGE = {
  type: 'object', additionalProperties: false,
  required: ['is_real', 'confidence', 'why', 'revised_severity'],
  properties: {
    is_real: { type: 'boolean', description: 'true ONLY if the issue genuinely holds against the actual code' },
    confidence: { enum: ['high', 'medium', 'low'] },
    why: { type: 'string' },
    revised_severity: { enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE'] },
  },
}
const GAPS = {
  type: 'object', additionalProperties: false, required: ['uncovered', 'missed'],
  properties: {
    uncovered: { type: 'array', items: { type: 'string' }, description: 'files, code paths, or rule families that were NOT examined' },
    missed: { type: 'array', items: FINDING_ITEM, description: 'concrete issues the dimension reviewers missed' },
  },
}
const VERDICT = {
  type: 'object', additionalProperties: false,
  required: ['scores', 'total', 'max_total', 'verdict', 'must_fix', 'should_fix', 'could_fix', 'summary'],
  properties: {
    scores: { type: 'array', minItems: 1, items: {
      type: 'object', additionalProperties: false,
      required: ['item', 'score', 'max', 'rationale'],
      properties: { item: { type: 'string' }, score: { type: 'integer' }, max: { type: 'integer' }, rationale: { type: 'string' } },
    } },
    total: { type: 'integer' },
    max_total: { type: 'integer' },
    verdict: { enum: ['APPROVED', 'REJECTED'] },
    must_fix: { type: 'array', items: { type: 'string' } },
    should_fix: { type: 'array', items: { type: 'string' } },
    could_fix: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
}

// One adversarial refutation of one finding, reused by the dimension-verify and deepen-critic
// paths (DRY). It ALWAYS resolves to the finding object — a finding is NEVER dropped: if the
// verifier agent yields nothing (skip/error → null), the finding is retained with challenge=null
// and later classified as `unverified` rather than silently erased by `.filter(Boolean)`.
const verifyBody = (fnd, dim) =>
  `A reviewer reported this ${dim} issue:\n- Title: ${fnd.title}\n- Location: ${fnd.file}:${fnd.line}\n- Severity claimed: ${fnd.severity}\n- Detail: ${fnd.detail}\n\nRead the ACTUAL code at that location and try to REFUTE this finding. Set is_real=true ONLY if it genuinely holds against the code as written. Default to is_real=false (false positive) when you cannot prove it. If real but mis-rated, set revised_severity.`
const challengeFinding = (fnd, dim, phaseName) =>
  agent(`${AK}\n\n${verifyBody(fnd, dim)}`, { label: `verify:${dim}:${fnd.file}`, phase: phaseName, schema: CHALLENGE })
    .then(v => ({ ...fnd, dim, challenge: v || null }))
// Partition predicates — mutually exclusive and EXHAUSTIVE over every finding:
//   isReal: verifier confirmed it; isFalsePositive: verifier refuted it;
//   isUnverified: everything else — no challenge (null verifier) OR a malformed (non-boolean) is_real.
const isReal = (f) => !!(f.challenge && f.challenge.is_real === true)
const isFalsePositive = (f) => !!(f.challenge && f.challenge.is_real === false)
const isUnverified = (f) => !(isReal(f) || isFalsePositive(f))
const withSeverity = (f) => (f.challenge && f.challenge.revised_severity && f.challenge.revised_severity !== 'NONE')
  ? { ...f, severity: f.challenge.revised_severity }
  : f

phase('Review')
log(`Fierce review: ${scope} — ${DIMENSIONS.length} dimensions, every finding adversarially verified.`)

// pipeline: a dimension's findings are verified the moment that dimension's review lands —
// dimension B keeps reviewing while dimension A's findings are already being challenged.
const reviewed = await pipeline(
  DIMENSIONS,
  (d) => agent(
    `${AK}\n\nReview ONLY the ${d.key} dimension of the changes in this scope: ${scope}\n\nFiles in scope:\n${fileList}\n\nFocus strictly on: ${d.focus}\n\nRead the files, then report concrete, file:line-anchored findings for this dimension only. An empty findings array is the correct answer if the dimension is clean — do NOT invent issues.`,
    { label: `review:${d.key}`, phase: 'Review', schema: FINDINGS }
  ).then(r => ({ dim: d.key, findings: (r && r.findings) || [] })),
  (rev) => parallel((rev.findings || []).map(fnd => () => challengeFinding(fnd, rev.dim, 'Verify')))
)
const dimFindings = reviewed.flat().filter(Boolean)

phase('Critic')
// Completeness pass — the structural answer to agentic laziness ("reviewed 35 of 50").
const verifiedSoFar = dimFindings.filter(isReal).map(withSeverity)
const confirmedDigest = verifiedSoFar.length
  ? verifiedSoFar.map(f => `- [${f.severity}] ${f.dim} ${f.file}:${f.line}: ${f.title}`).join('\n')
  : '(none confirmed yet)'
const gaps = await agent(
  `${AK}\n\nScope: ${scope}\nFiles in scope:\n${fileList}\n\nConfirmed findings so far:\n${confirmedDigest}\n\nYou are the completeness critic. Identify every file, code path, or rule family in scope that was NOT examined, and report any concrete issue the per-dimension reviewers missed. Be the reason this review does not stop at "good enough".`,
  { label: 'completeness-critic', phase: 'Critic', schema: GAPS }
)

// Interaction critic — cross-dimension issues a per-dimension reviewer structurally cannot see
// (a perf fix that weakens a security boundary, two changes that now duplicate/contradict, a
// refactor that breaks an implicit contract). Runs alongside the completeness critic.
const interaction = await agent(
  `${AK}\n\nScope: ${scope}\nFiles in scope:\n${fileList}\n\nConfirmed findings so far:\n${confirmedDigest}\n\nYou are the INTERACTION critic. Ignore single-dimension issues (others cover those). Find ONLY cross-cutting problems: where two changes interact badly (a performance optimization that weakens a validation/security boundary; two modules that now duplicate or contradict logic; a refactor that breaks an implicit contract another file relies on). Report concrete, file:line-anchored interaction issues only — an empty array is correct if there are none.`,
  { label: 'interaction-critic', phase: 'Critic', schema: GAPS }
)

// Critic findings: in `deepen` mode they pass the SAME adversarial gate as dimension findings;
// otherwise they are single-pass and are surfaced as `unverified` (never presented as verified).
const criticRaw = [
  ...((gaps && Array.isArray(gaps.missed)) ? gaps.missed : []),
  ...((interaction && Array.isArray(interaction.missed)) ? interaction.missed : []),
]
let criticFindings
if (deepen && criticRaw.length) {
  criticFindings = (await parallel(criticRaw.map(fnd => () => challengeFinding(fnd, 'critic', 'Critic')))).filter(Boolean)
} else {
  criticFindings = criticRaw.map(fnd => ({ ...fnd, dim: 'critic', challenge: null, single_pass: true }))
}

// Partition ALL findings exactly once and EXHAUSTIVELY. Every finding lands in exactly one of
// confirmed / dismissed / unverified — none is ever lost (the silent-drop defect this fixes).
const everything = dimFindings.concat(criticFindings)
const confirmed = everything.filter(isReal).map(withSeverity).map(f => ({ ...f, verified: true }))
const dismissed = everything.filter(isFalsePositive)
const unverified = everything.filter(isUnverified).map(f => ({
  ...f, verified: false,
  unverified_reason: f.single_pass
    ? 'single-pass critic (deepen=false)'
    : (f.challenge ? 'verifier returned a malformed (non-boolean is_real) verdict' : 'verifier returned null'),
}))

phase('Judge')
// Deterministic pieces are computed from data the SCRIPT holds, BEFORE and AFTER the judge runs —
// never trusting the LLM's arithmetic or its must_fix list for the actual gate.
const maxTotal = rubric.items.reduce((s, i) => s + (Number(i.max) || 0), 0)
const passPct = rubric.pass_threshold_pct  // guaranteed numeric by the rubric-shape validation above
// The gate is BLOCKED by any CONFIRMED CRITICAL/HIGH finding (revised severities already applied) —
// derived deterministically from `confirmed`, NOT from the judge's must_fix list.
const blockers = confirmed.filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH')
const blockerLines = blockers.map(b => `[${b.severity}] ${b.dim} ${b.file}:${b.line} ${b.title}`)
const baseReturn = {
  scope,
  dimensions: DIMENSIONS.map(d => d.key),
  confirmed,
  unverified,
  dismissed,
  // gaps.missed findings already live in confirmed/unverified — return only `uncovered` to avoid double-emission.
  gaps: { uncovered: [
    ...((gaps && Array.isArray(gaps.uncovered)) ? gaps.uncovered : []),
    ...((interaction && Array.isArray(interaction.uncovered)) ? interaction.uncovered : []),
  ] },
}

// Honest digest: tag each finding verified vs UNVERIFIED and carry its suggested_fix so the judge's
// must_fix/should_fix can cite the remedy. The judge scores confirmed + unverified; dismissed are counted only.
const forJudge = confirmed.concat(unverified)
const digestLine = (f) => `- [${f.severity}] (${f.dim}, ${f.verified ? 'verified' : 'UNVERIFIED — scrutinize before acting'}) ${f.file}:${f.line}: ${f.title}\n    detail: ${f.detail}\n    suggested_fix: ${f.suggested_fix}`
const findingsDigest = forJudge.length ? forJudge.map(digestLine).join('\n') : '(no findings)'
const uncovered = baseReturn.gaps.uncovered.length ? baseReturn.gaps.uncovered.join(', ') : 'none reported'

// THREE independent judges, each through a distinct lens. A single judge has one blind spot and one
// risk-appetite; three lenses reconciled by MIN-per-item means approval must satisfy the HARSHEST
// relevant lens on every rubric item. (Quality-first: more judges is pure signal here because the
// lenses are diverse, not N copies of the same prompt — INVARIANT 10.)
const JUDGE_LENSES = [
  { key: 'correctness',     emphasis: 'correctness & completeness — does it actually do what the scope requires; are edge cases, failure paths, and the stated spec genuinely met' },
  { key: 'security',        emphasis: 'security & safety — trust boundaries, injection, authn/authz, secrets, unsafe handling of untrusted input, and data-loss risk' },
  { key: 'maintainability', emphasis: 'maintainability & operability — readability, DRY/SRP, pattern compliance, test quality, and the 6-month cost of living with this change' },
]
const judgePromptFor = (lens) =>
  `${AK}\n\nYou are ONE of three independent judges; YOUR lens is **${lens.emphasis}**. Produce a full verdict for the review of: ${scope}\n\nScore against this rubric (use these exact item labels and pass threshold):\n${JSON.stringify(rubric)}\n\nFindings are tagged 'verified' (survived the adversarial skeptic) or 'UNVERIFIED' (verifier did not return, or a single-pass critic find). Treat UNVERIFIED with skepticism but weigh it:\n${findingsDigest}\n\nUncovered areas flagged by the completeness critic: ${uncovered}\n\nScore each rubric item 0..max with a one-sentence rationale FROM YOUR LENS (one entry per rubric item, exact labels). Do NOT soften your lens to be "balanced" — the other two lenses cover other angles. Populate must_fix (CRITICAL/HIGH) / should_fix (MEDIUM) / could_fix (LOW); each entry MUST begin with "[SEVERITY] file:line" and include the suggested fix. NOTE: the script reconciles the three judges deterministically — MIN score per item across judges, union of fix lists, and BLOCKS approval on any confirmed CRITICAL/HIGH finding — so be accurate to your lens, not strategic.`
const judgeResults = await parallel(JUDGE_LENSES.map(l => () =>
  agent(judgePromptFor(l), { label: `judge:${l.key}`, phase: 'Judge', schema: VERDICT }).then(v => (v ? { lens: l.key, v } : null))
))
const judges = judgeResults.filter(Boolean)

// All three judges null → conservative REJECTED, preserving every upstream finding (same contract
// as the prior single-judge null guard).
if (!judges.length) {
  return {
    ...baseReturn,
    verdict: {
      scores: [], total: 0, max_total: maxTotal, verdict: 'REJECTED',
      must_fix: ['All judge agents returned no verdict — the review could not be scored. Re-run the review.'],
      should_fix: [], could_fix: [],
      summary: 'Every judge agent returned null; returning REJECTED conservatively with all findings preserved.',
      gate: { computed_deterministically: true, judge_failed: true, total: 0, max_total: maxTotal, pass_threshold_pct: passPct, blocker_count: blockers.length, blockers: blockerLines },
    },
  }
}

// Reconcile deterministically. Per rubric item: clamp each judge's score to [0, max], take the MIN
// (the harshest relevant lens governs). The SCRIPT owns the gate — never the LLMs' arithmetic.
const uniq = (arr) => Array.from(new Set(arr))
const scores = rubric.items.map((i) => {
  const perJudge = judges.map((j) => {
    const sc = (j.v.scores || []).find(x => x.item === i.label)
    return { lens: j.lens, score: Math.max(0, Math.min(Number(sc && sc.score) || 0, Number(i.max) || 0)), rationale: (sc && sc.rationale) || '' }
  })
  const harshest = perJudge.reduce((m, p) => (p.score < m.score ? p : m), perJudge[0])
  return { item: i.label, score: harshest.score, max: Number(i.max) || 0, rationale: `[harshest: ${harshest.lens}] ${harshest.rationale}` }
})
const total = scores.reduce((s, x) => s + x.score, 0)
const must_fix = uniq(judges.flatMap(j => j.v.must_fix || []))
const should_fix = uniq(judges.flatMap(j => j.v.should_fix || []))
const could_fix = uniq(judges.flatMap(j => j.v.could_fix || []))
const passed = maxTotal > 0 && (total / maxTotal) * 100 >= passPct && blockers.length === 0
const verdict = {
  scores,
  total,
  max_total: maxTotal,
  verdict: passed ? 'APPROVED' : 'REJECTED',
  must_fix, should_fix, could_fix,
  summary: judges.map(j => `(${j.lens}) ${j.v.summary || ''}`).join('  '),
  gate: {
    computed_deterministically: true,
    total, max_total: maxTotal, pass_threshold_pct: passPct,
    blocker_count: blockers.length,
    blockers: blockerLines,
    reconciliation: 'min-score-per-item across 3 lenses; union of fix lists',
    judges: judges.map(j => ({ lens: j.lens, llm_total: j.v.total, llm_verdict: j.v.verdict, must_fix_count: (j.v.must_fix || []).length })),
  },
}

return { ...baseReturn, verdict }
