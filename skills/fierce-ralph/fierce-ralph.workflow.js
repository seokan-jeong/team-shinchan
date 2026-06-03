export const meta = {
  name: 'fierce-ralph',
  description: 'Deterministic loop-until-done: a worker agent does the next unit of work toward a goal, a verifier independently checks progress and completion against the real repo, and the loop repeats — bounded by a hard iteration cap, a token budget, and a stagnation limit — until an Action-Kamen final gate confirms the goal is met.',
  phases: [
    { title: 'Loop',   detail: 'worker agent executes the next incomplete unit of work toward the goal' },
    { title: 'Verify', detail: 'verifier checks progress + completion against the actual repo (tests, ACs)' },
    { title: 'Gate',   detail: 'Action Kamen final verification — APPROVED only with test/goal evidence' },
  ],
}

// args = { goal, progressDoc, maxIterations, workerPersona, judgePersona }
//   `args` arrives as a JSON STRING from the Workflow runtime — parse defensively.
//   The SCRIPT has no filesystem/git access: it CANNOT run stagnation-detector.js or read
//   PROGRESS.md. So progress/completion is judged by the VERIFIER AGENT (which can run tests,
//   git diff, and read docs), and the SCRIPT owns only the deterministic control: the loop, the
//   iteration cap, the token budget, and the stagnation counter. Personas are injected by the
//   SKILL via src/workflow-personas.js (kazama=worker, actionkamen=verifier/gate) — the runtime
//   cannot load plugin subagents via agentType.
function parseArgs(a) {
  if (typeof a === 'string') { try { return JSON.parse(a) } catch (e) { return {} } }
  return (a && typeof a === 'object') ? a : {}
}
const A = parseArgs(args)
const goal = (A.goal && String(A.goal).trim()) || 'Complete the outstanding task.'
const progressDoc = A.progressDoc && String(A.progressDoc).trim()
const progressCtx = progressDoc ? `Track acceptance criteria / TODOs in ${progressDoc}.` : ''
const MAX = (Number.isInteger(A.maxIterations) && A.maxIterations > 0) ? Math.min(A.maxIterations, 20) : 10
const STAGN_LIMIT = 3      // consecutive no-progress iterations before giving up (mirrors ralph's idle threshold)
const RESERVE = 60000      // output-token reserve kept for the final gate + tail before the budget cap

const WORK_DIRECTIVES = 'Edit the ACTUAL files to make concrete, verifiable progress; do not stop early and do not just describe — change the code.'
const GATE_DIRECTIVES = 'Run the tests/build and require real command evidence; never rubber-stamp; APPROVED only if the goal is genuinely met.'
const KAZAMA = (A.workerPersona && String(A.workerPersona).trim())
  ? `${String(A.workerPersona).trim()} ${WORK_DIRECTIVES}`
  : `You are Kazama, team-shinchan’s persistent autonomous deep worker. ${WORK_DIRECTIVES}`
const AK = (A.judgePersona && String(A.judgePersona).trim())
  ? `${String(A.judgePersona).trim()} ${GATE_DIRECTIVES}`
  : `You are Action Kamen, team-shinchan’s uncompromising verifier. ${GATE_DIRECTIVES}`

const WORK = {
  type: 'object', additionalProperties: false, required: ['summary', 'remaining'],
  properties: {
    summary: { type: 'string', description: 'what you changed this iteration' },
    files_touched: { type: 'array', items: { type: 'string' } },
    remaining: { type: 'string', description: 'what still remains toward the goal' },
  },
}
const CHECK = {
  type: 'object', additionalProperties: false, required: ['done', 'progressed', 'evidence', 'next'],
  properties: {
    done: { type: 'boolean', description: 'true ONLY if the goal is fully complete, with evidence' },
    progressed: { type: 'boolean', description: 'did THIS iteration make measurable progress vs before?' },
    evidence: { type: 'string', description: 'command output / file state proving the assessment' },
    next: { type: 'string', description: 'the single most important next step if not done' },
  },
}
const GATE = {
  type: 'object', additionalProperties: false, required: ['verdict', 'tests_pass', 'goal_met', 'evidence', 'blockers'],
  properties: {
    verdict: { enum: ['APPROVED', 'REJECTED'] },
    tests_pass: { type: 'boolean' },
    goal_met: { type: 'boolean' },
    evidence: { type: 'string' },
    blockers: { type: 'array', items: { type: 'string' } },
  },
}

phase('Loop')
log(`Fierce ralph: "${goal}" — deterministic loop (max ${MAX} iterations${A.maxIterations ? '' : ', default'}${budget.total ? `, ~${Math.round(budget.remaining() / 1000)}k token budget` : ''}).`)

let done = false
let iter = 0
let stagnation = 0
let nextHint = ''
let stopReason = null
const history = []

while (!done && iter < MAX) {
  if (budget.total && budget.remaining() <= RESERVE) { stopReason = 'budget_exhausted'; break }
  iter++

  const stagnNote = stagnation >= 1
    ? '\n\nThe previous iteration(s) made NO measurable progress. Take a DIFFERENT approach — do not repeat the stalled step.'
    : ''
  const hintNote = nextHint ? `\n\nSuggested next step from the last verification: ${nextHint}` : ''
  const w = await agent(
    `${KAZAMA}\n\nGoal: ${goal}\n${progressCtx}\n\nDo the next incomplete unit of work toward the goal NOW (iteration ${iter}/${MAX}). Then report what you changed and what remains.${hintNote}${stagnNote}`,
    { label: `work:${iter}`, phase: 'Loop', schema: WORK }
  )

  const c = await agent(
    `${AK}\n\nGoal: ${goal}\n${progressCtx}\n\nIteration ${iter} reported: ${w ? w.summary : '(worker returned no report)'}\nRemaining (worker's view): ${w ? w.remaining : 'unknown'}\n\nIndependently verify against the ACTUAL repo — run the tests/build, check the goal's acceptance criteria${progressDoc ? ` in ${progressDoc}` : ''}. Is the GOAL FULLY complete (done)? Did THIS iteration make measurable progress vs the prior state (progressed)?`,
    { label: `verify:${iter}`, phase: 'Verify', schema: CHECK }
  )

  // Guard the verifier for null — never crash the loop, never misread a null as "done".
  if (!c) {
    stagnation++
    history.push({ iter, done: false, progressed: false, note: 'verifier returned null', worker_summary: w ? w.summary : null })
    if (stagnation >= STAGN_LIMIT) { stopReason = 'stagnation'; break }
    continue
  }

  done = c.done === true
  stagnation = (c.progressed === true) ? 0 : stagnation + 1
  nextHint = c.next || ''
  history.push({ iter, done, progressed: c.progressed === true, evidence: c.evidence, next: c.next, worker_summary: w ? w.summary : null })

  if (!done && stagnation >= STAGN_LIMIT) { stopReason = 'stagnation'; break }
}
if (!stopReason) stopReason = done ? 'completed' : 'max_iterations'

phase('Gate')
const gateRaw = await agent(
  `${AK}\n\nGoal: ${goal}\n${progressCtx}\n\nThe loop ran ${iter} iteration(s) and stopped because: ${stopReason}. Perform the FINAL verification: run the tests/build and confirm the goal is met. Set verdict APPROVED only if it genuinely is, with command evidence; list any blockers otherwise.`,
  { label: 'final-gate', phase: 'Gate', schema: GATE }
)
// Guard the gate for null exactly like every other agent (the fierce-review lesson) — degrade to REJECTED.
const gate = gateRaw || { verdict: 'REJECTED', tests_pass: false, goal_met: false, evidence: 'Final gate agent returned no verdict.', blockers: ['gate agent returned null'] }

// DETERMINISTIC completion — derived from structured fields, not the LLM's verdict label alone:
// the loop must have reached done AND the gate must show tests pass, goal met, and no blockers.
const gatePass = gate.verdict === 'APPROVED' && gate.tests_pass === true && gate.goal_met === true && (gate.blockers || []).length === 0
const completed = done && gatePass

return {
  goal,
  iterations: iter,
  loop_done: done,
  stop_reason: stopReason,
  stagnated: stagnation >= STAGN_LIMIT,
  budget_exhausted: stopReason === 'budget_exhausted',
  completed,
  gate,
  history,
}
