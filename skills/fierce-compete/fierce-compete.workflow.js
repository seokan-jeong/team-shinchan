export const meta = {
  name: 'fierce-compete',
  description: 'Competitive code tournament: N builder agents independently solve the same task and each returns an apply-ready unified-diff patch (read-only, no working-tree collisions), an Action-Kamen judge scores them head-to-head, and the winner is selected deterministically by total score.',
  phases: [
    { title: 'Implement', detail: 'N builders independently solve the task, each returning a unified-diff patch' },
    { title: 'Judge', detail: 'Action Kamen scores every implementation on correctness / completeness / quality' },
  ],
}

// args = { task, n, files, builderPersona, judgePersona }
//   `args` arrives as a JSON STRING — parse defensively.
//   PATCH-RETURN model: builders are READ-ONLY and emit their solution as a unified diff (no
//   worktree, no parallel working-tree collisions, nothing to merge). The SKILL's main loop
//   applies the winner's patch with `git apply`. The script has no filesystem access, so it
//   neither reads code nor applies patches — it only fans out, judges, and picks the winner
//   deterministically. Personas are injected by the SKILL via src/workflow-personas.js
//   (bo=builder, actionkamen=judge) — the runtime can't load plugin subagents via agentType.
function parseArgs(a) {
  if (typeof a === 'string') { try { return JSON.parse(a) } catch (e) { return {} } }
  return (a && typeof a === 'object') ? a : {}
}
const A = parseArgs(args)
const task = (A.task && String(A.task).trim()) || 'Implement the requested change.'
const N = (Number.isInteger(A.n) && A.n >= 2) ? Math.min(A.n, 4) : 2
const ctx = (Array.isArray(A.files) && A.files.length) ? `Relevant files:\n${A.files.join('\n')}\n\n` : ''

const BUILD_DIRECTIVES = 'Read the relevant code, design your BEST solution, and return it as an apply-ready unified git diff (correct file paths and context lines). Do NOT modify the working tree — return the patch as text only. Note any tests you would run.'
const JUDGE_DIRECTIVES = 'Read each patch as real code; score strictly against the rubric; reward correctness and simplicity, never rubber-stamp.'
const BO = (A.builderPersona && String(A.builderPersona).trim())
  ? `${String(A.builderPersona).trim()} ${BUILD_DIRECTIVES}`
  : `You are Bo, team-shinchan’s execution PO and implementer. ${BUILD_DIRECTIVES}`
const AK = (A.judgePersona && String(A.judgePersona).trim())
  ? `${String(A.judgePersona).trim()} ${JUDGE_DIRECTIVES}`
  : `You are Action Kamen, team-shinchan’s uncompromising reviewer. ${JUDGE_DIRECTIVES}`

const IMPL = {
  type: 'object', additionalProperties: false, required: ['approach', 'patch'],
  properties: {
    approach: { type: 'string', description: 'one-paragraph summary of the strategy' },
    patch: { type: 'string', description: 'apply-ready unified git diff' },
    changed_files: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string', description: 'risks, tradeoffs, tests to run' },
  },
}
const SCORES = {
  type: 'object', additionalProperties: false, required: ['scores', 'rationale', 'dissent'],
  properties: {
    scores: {
      type: 'array', minItems: 2, items: {
        type: 'object', additionalProperties: false,
        required: ['index', 'correctness', 'completeness', 'quality', 'rationale'],
        properties: {
          index: { type: 'integer' },
          correctness: { type: 'integer' },
          completeness: { type: 'integer' },
          quality: { type: 'integer' },
          rationale: { type: 'string' },
        },
      },
    },
    rationale: { type: 'string' },
    // Non-empty by contract: record the strongest objection to the winner (mirrors fierce-debate).
    dissent: { type: 'string' },
  },
}

phase('Implement')
log(`Fierce compete: "${task}" — ${N} independent implementations, head-to-head judged.`)
const impls = (await parallel(
  Array.from({ length: N }, (_, i) => () =>
    agent(
      `${BO}\n\nTask: ${task}\n\n${ctx}You are builder #${i + 1} of ${N}, competing independently against the others. Produce your single strongest solution.`,
      { label: `impl:${i + 1}`, phase: 'Implement', schema: IMPL }
    ).then(r => r && { index: i + 1, ...r })
  )
)).filter(Boolean)

// Never silently proceed with a degenerate tournament.
if (impls.length < 2) {
  return { task, n: N, error: 'Need >=2 surviving implementations for a tournament', implementations: impls, winner: null }
}

phase('Judge')
const dossier = impls.map(m =>
  `### Implementation ${m.index}\nApproach: ${m.approach}\nPatch:\n${m.patch}\nNotes: ${m.notes || '—'}`
).join('\n\n')
const verdictRaw = await agent(
  `${AK}\n\nTask: ${task}\n\n${dossier}\n\nScore EACH implementation (by its index) on correctness / completeness / quality (1-5 each). Reward the one that is most correct and simplest; penalize patches that would not apply or that miss the task. dissent MUST be non-empty: the strongest objection to the likely winner.`,
  { label: 'judge', phase: 'Judge', schema: SCORES }
)

// Guard the judge for null (the fierce-review lesson) — degrade rather than crash.
if (!verdictRaw) {
  return { task, n: N, implementations: impls, scores: [], winner: null, rationale: null, dissent: null, error: 'judge returned no verdict' }
}

// DETERMINISTIC winner: compute clamped totals from the per-impl scores and pick the max — never
// trust an LLM 'winner' label. Tie → higher correctness, then lower index.
const clamp5 = (n) => Math.max(0, Math.min(Number(n) || 0, 5))
const scored = (verdictRaw.scores || []).map(s => ({
  index: s.index,
  correctness: clamp5(s.correctness),
  completeness: clamp5(s.completeness),
  quality: clamp5(s.quality),
  rationale: s.rationale,
  total: clamp5(s.correctness) + clamp5(s.completeness) + clamp5(s.quality),
})).sort((a, b) => b.total - a.total || b.correctness - a.correctness || a.index - b.index)

const top = scored[0] || null
const winnerImpl = top ? impls.find(m => m.index === top.index) : null
const winner = (top && winnerImpl)
  ? { index: top.index, total: top.total, max_total: 15, approach: winnerImpl.approach, patch: winnerImpl.patch, changed_files: winnerImpl.changed_files || [] }
  : null

return {
  task,
  n: N,
  implementations: impls,
  scores: scored,
  winner,
  rationale: verdictRaw.rationale,
  dissent: verdictRaw.dissent,
}
