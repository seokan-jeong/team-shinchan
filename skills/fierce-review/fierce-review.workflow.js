export const meta = {
  name: 'fierce-review',
  description: 'Adversarial multi-dimension code review: dimensions fan out as independent agents, every finding is challenged by a skeptic (false-positive unless proven against the code), a completeness critic hunts uncovered files/rules, and an Action-Kamen judge scores against the shared rubric.',
  phases: [
    { title: 'Review', detail: 'one agent per dimension — correctness / security / performance / quality / tests / principles' },
    { title: 'Verify', detail: 'a skeptic refutes each finding; is_real=true only if it holds against the actual code' },
    { title: 'Critic', detail: 'completeness critic finds uncovered files, paths, and rule families (fights agentic laziness)' },
    { title: 'Judge',  detail: 'Action Kamen scores; the pass gate is recomputed deterministically and blocked by any confirmed CRITICAL/HIGH' },
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
const deepen = A.deepen === true

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
const AK = (A.persona && String(A.persona).trim())
  ? `${String(A.persona).trim()} ${REVIEW_DIRECTIVES}`
  : `You are Action Kamen, team-shinchan’s uncompromising, justice-minded reviewer. ${REVIEW_DIRECTIVES}`
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

// Critic findings: in `deepen` mode they pass the SAME adversarial gate as dimension findings;
// otherwise they are single-pass and are surfaced as `unverified` (never presented as verified).
const criticRaw = (gaps && Array.isArray(gaps.missed)) ? gaps.missed : []
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
  gaps: { uncovered: (gaps && Array.isArray(gaps.uncovered)) ? gaps.uncovered : [] },
}

// Honest digest: tag each finding verified vs UNVERIFIED and carry its suggested_fix so the judge's
// must_fix/should_fix can cite the remedy. The judge scores confirmed + unverified; dismissed are counted only.
const forJudge = confirmed.concat(unverified)
const digestLine = (f) => `- [${f.severity}] (${f.dim}, ${f.verified ? 'verified' : 'UNVERIFIED — scrutinize before acting'}) ${f.file}:${f.line}: ${f.title}\n    detail: ${f.detail}\n    suggested_fix: ${f.suggested_fix}`
const findingsDigest = forJudge.length ? forJudge.map(digestLine).join('\n') : '(no findings)'
const uncovered = baseReturn.gaps.uncovered.length ? baseReturn.gaps.uncovered.join(', ') : 'none reported'

const verdictRaw = await agent(
  `${AK}\n\nProduce the final verdict for the review of: ${scope}\n\nScore against this rubric (the shared eval-rubrics definition — use these exact item labels and pass threshold):\n${JSON.stringify(rubric)}\n\nFindings are tagged 'verified' (survived the adversarial skeptic) or 'UNVERIFIED' (the verifier did not return, or a single-pass critic find). Treat UNVERIFIED findings with skepticism — do NOT assume they are real, but do weigh them:\n${findingsDigest}\n\nUncovered areas flagged by the completeness critic: ${uncovered}\n\nScore each rubric item 0..max with a one-sentence rationale (one score entry per rubric item, using the item's exact label). Populate must_fix (CRITICAL/HIGH) / should_fix (MEDIUM) / could_fix (LOW) for the human reader; each entry MUST begin with "[SEVERITY] file:line" and include the suggested fix. NOTE: the script recomputes the gate deterministically — it re-sums your per-item scores (clamped to each item's max) and BLOCKS approval on any confirmed CRITICAL/HIGH finding regardless of your must_fix list — so be accurate, not strategic.`,
  { label: 'judge', phase: 'Judge', schema: VERDICT }
)

// Guard the judge result for null exactly as every other agent call is guarded — a null judge must
// NOT crash the workflow and discard all upstream findings. Degrade to a conservative REJECTED.
if (!verdictRaw) {
  return {
    ...baseReturn,
    verdict: {
      scores: [], total: 0, max_total: maxTotal, verdict: 'REJECTED',
      must_fix: ['Judge agent returned no verdict — the review could not be scored. Re-run the review.'],
      should_fix: [], could_fix: [],
      summary: 'Judge agent returned null; returning REJECTED conservatively with all findings preserved.',
      gate: { computed_deterministically: true, judge_failed: true, total: 0, max_total: maxTotal, pass_threshold_pct: passPct, blocker_count: blockers.length, blockers: blockerLines },
    },
  }
}

// Recompute `total` by pairing each rubric item to its score by label and CLAMPING to [0, item.max].
// This bounds 0 <= total <= maxTotal even if the judge over-scores or returns mismatched item sets.
const total = rubric.items.reduce((s, i) => {
  const sc = (verdictRaw.scores || []).find(x => x.item === i.label)
  return s + Math.max(0, Math.min(Number(sc && sc.score) || 0, Number(i.max) || 0))
}, 0)
const passed = maxTotal > 0 && (total / maxTotal) * 100 >= passPct && blockers.length === 0
const verdict = {
  ...verdictRaw,
  total,
  max_total: maxTotal,
  verdict: passed ? 'APPROVED' : 'REJECTED',
  gate: {
    computed_deterministically: true,
    total, max_total: maxTotal, pass_threshold_pct: passPct,
    blocker_count: blockers.length,
    blockers: blockerLines,
    llm_reported: { total: verdictRaw.total, max_total: verdictRaw.max_total, verdict: verdictRaw.verdict, must_fix_count: (verdictRaw.must_fix || []).length },
  },
}

return { ...baseReturn, verdict }
