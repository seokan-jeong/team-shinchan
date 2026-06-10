#!/usr/bin/env node
/**
 * fierce-option-panel — Team-Shinchan Workflow (interview-metrics-researc-002 Phase 1)
 *
 * Hardens interview option generation: diverse generators -> SelfCheckGPT majority-vote
 * consensus (HR-2) -> SteerConf cautious-confidence judge -> deterministic top-K.
 *
 * Mirrors the fierce-compete.workflow.js structure (meta export, defensive parseArgs,
 * phase()/agent()/parallel()/log() runtime calls). The script has no filesystem/git access;
 * pure logic (weight validation, consensus, k-bound) is imported from src/option-metrics.js.
 *
 * DEFAULT-ON EXCEPTION: this is the one fierce-* skill enabled by default (quality-over-cost).
 * See docs/fierce-option-panel.md and skills/fierce-option-panel/SKILL.md.
 *
 * LIMITATIONS / TRANSFERABILITY GAP (NFR-5): the ECE/AUROC scoring transfers from the
 * factual-QA literature via a proxy (user's eventual option selection = ground truth) and is
 * UNVALIDATED for design options. Targets (ECE<0.10, AUROC>=0.70, Distinct-2>=0.55,
 * self-BLEU<=0.40) are pragmatic, not universal.
 *
 * NEVER delegate to a sub-agent — workflow() throws inside a Task child (R-5, main-loop only).
 */

export const meta = {
  name: 'fierce-option-panel',
  description:
    'Default-on interview option-quality panel: N diverse generators produce structure-free candidate options, a SelfCheckGPT majority-vote consensus filters hallucinations (>= ceil(N/2+1) backing), a SteerConf cautious-confidence judge scores the survivors, and a deterministic top-K is selected. Falls back to the basic B-path on any failure.',
  phases: [
    { title: 'Generate', detail: 'N diverse generators produce structure-free candidate options + relative weights' },
    { title: 'Consensus', detail: 'SelfCheckGPT majority-vote (>= ceil(N/2+1)) filters hallucinated options' },
    { title: 'Judge', detail: 'SteerConf cautious-confidence rubric scores survivors; deterministic top-K' },
  ],
}

// Pure, testable helpers shared with the basic B-path (src/option-metrics.js).
// Resolve relative to this file so the import works regardless of cwd.
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const OM = require('../../src/option-metrics.js')

// args arrives as a JSON STRING — parse defensively (workflow runtime contract).
function parseArgs(a) {
  if (typeof a === 'string') { try { return JSON.parse(a) } catch (e) { return {} } }
  return (a && typeof a === 'object') ? a : {}
}
const A = parseArgs(args)

const question = (A.question && String(A.question).trim()) || 'Design the next interview question and its options.'
const ctx = (Array.isArray(A.files) && A.files.length) ? `Relevant files:\n${A.files.join('\n')}\n\n` : ''
// Number of diverse generators (config: interview.fierce_panel_generators, default 3).
const N = (Number.isInteger(A.generators) && A.generators >= 2) ? Math.min(A.generators, 6) : 3
// K-bound for the final top-K (config: interview.fierce_panel_k_max, default 6).
const K_MAX = (Number.isInteger(A.kMax) && A.kMax >= 2) ? Math.min(A.kMax, 6) : 6

const GEN_DIRECTIVES =
  'Read the relevant code, then propose your single STRONGEST candidate option for answering ' +
  'this interview question. STRUCTURE-FREE: do NOT use "A:"/"B:"/"C:" labels or an option-count ' +
  'target — produce one substantive option. Cite at least one concrete code reference ' +
  '(file/function), or mark evidence as "inferred" if it cannot be grounded. Give a relative ' +
  'weight in [0,1] expressing how strong you think this option is.'
const JUDGE_DIRECTIVES =
  'You are a CAUTIOUS-confidence judge (SteerConf): prefer to UNDER-state confidence rather than ' +
  'over-state it. Score each surviving option on evidence quality, coverage, and distinctness. ' +
  'Never expose a raw self-confidence number — only your calibrated rubric scores.'

const GEN = (A.generatorPersona && String(A.generatorPersona).trim())
  ? `${String(A.generatorPersona).trim()} ${GEN_DIRECTIVES}`
  : `You are Misae, team-shinchan's requirements analyst. ${GEN_DIRECTIVES}`
const JUDGE = (A.judgePersona && String(A.judgePersona).trim())
  ? `${String(A.judgePersona).trim()} ${JUDGE_DIRECTIVES}`
  : `You are Action Kamen, team-shinchan's uncompromising reviewer. ${JUDGE_DIRECTIVES}`

const OPTION = {
  type: 'object', additionalProperties: false, required: ['option', 'evidence', 'weight'],
  properties: {
    option: { type: 'string', description: 'the candidate option text (structure-free, no A/B/C label)' },
    evidence: { type: 'string', description: 'file/function reference, or "inferred"' },
    weight: { type: 'number', description: 'relative strength in [0,1]' },
    rationale: { type: 'string' },
  },
}
const VERDICT = {
  type: 'object', additionalProperties: false, required: ['scores', 'rationale', 'dissent'],
  properties: {
    scores: {
      type: 'array', minItems: 1, items: {
        type: 'object', additionalProperties: false,
        required: ['index', 'evidence_quality', 'coverage', 'distinctness', 'rationale'],
        properties: {
          index: { type: 'integer' },
          evidence_quality: { type: 'integer' },
          coverage: { type: 'integer' },
          distinctness: { type: 'integer' },
          rationale: { type: 'string' },
        },
      },
    },
    rationale: { type: 'string' },
    dissent: { type: 'string' },
  },
}

phase('Generate')
log(`fierce-option-panel: "${question}" — ${N} diverse generators (structure-free).`)
const raw = (await parallel(
  Array.from({ length: N }, (_, i) => () =>
    agent(
      `${GEN}\n\nInterview question: ${question}\n\n${ctx}You are generator #${i + 1} of ${N}, ` +
      `working INDEPENDENTLY from the others. Produce your single best candidate option.`,
      { label: `gen:${i + 1}`, phase: 'Generate', schema: OPTION }
    ).then(r => r && { index: i + 1, ...r })
  )
)).filter(Boolean)

if (raw.length === 0) {
  return { question, generators: N, error: 'no generator produced an option', options: [], winner: null, option_source: 'basic_fallback' }
}

// SelfCheckGPT consensus: cluster near-duplicate options and count how many generators back
// each cluster. Two options are "the same" if their normalized text overlaps heavily
// (cheap, dependency-free signal via Distinct-2 self-overlap of the pair).
function sameOption(a, b) {
  const sb = OM.computeSelfBLEU([a.option, b.option]) // high overlap -> high self-BLEU
  return sb >= 0.5
}
const clusters = []
for (const opt of raw) {
  let placed = false
  for (const cl of clusters) {
    if (sameOption(cl.rep, opt)) { cl.members.push(opt); cl.votes++; placed = true; break }
  }
  if (!placed) clusters.push({ rep: opt, members: [opt], votes: 1 })
}

phase('Consensus')
const consensus = OM.selfCheckConsensus(
  clusters.map((cl, i) => ({ id: i, votes: cl.votes })),
  N
)
log(`Consensus: majority threshold=${consensus.threshold}; ${consensus.passed.length}/${clusters.length} clusters pass.`)

// Distinct-2 floor (R-3): if majority-vote leaves < 2 survivors, bypass the filter and
// flag, rather than collapsing diversity below the bar.
let survivors
let consensusBypassed = false
const passedIds = new Set(consensus.passed.map(p => p.id))
const passedClusters = clusters.filter((_, i) => passedIds.has(i))
if (passedClusters.length >= 2) {
  survivors = passedClusters.map(cl => ({ ...cl.rep, votes: cl.votes }))
} else {
  consensusBypassed = true
  survivors = clusters.map(cl => ({ ...cl.rep, votes: cl.votes }))
  log('Consensus bypassed (< 2 survivors) — diversity floor engaged (R-3).')
}

phase('Judge')
const dossier = survivors.map((o, i) =>
  `### Option ${i + 1}\nText: ${o.option}\nEvidence: ${o.evidence}\nGenerator weight: ${o.weight}\nConsensus votes: ${o.votes}`
).join('\n\n')
const verdictRaw = await agent(
  `${JUDGE}\n\nInterview question: ${question}\n\n${dossier}\n\nScore EACH option (by index, 1-5 ` +
  `per dimension). Reward strong code-grounded evidence and genuine distinctness; penalize ` +
  `vague or duplicative options. dissent MUST be non-empty: the strongest objection to the top option.`,
  { label: 'judge', phase: 'Judge', schema: VERDICT }
)

if (!verdictRaw) {
  return { question, generators: N, options: survivors, scores: [], winner: null, rationale: null, dissent: null, error: 'judge returned no verdict', option_source: 'basic_fallback' }
}

// Deterministic ranking: total of clamped rubric dims, tie -> evidence_quality, then index.
const clamp5 = (n) => Math.max(0, Math.min(Number(n) || 0, 5))
const scored = (verdictRaw.scores || []).map(s => ({
  index: s.index,
  evidence_quality: clamp5(s.evidence_quality),
  coverage: clamp5(s.coverage),
  distinctness: clamp5(s.distinctness),
  rationale: s.rationale,
  total: clamp5(s.evidence_quality) + clamp5(s.coverage) + clamp5(s.distinctness),
})).sort((a, b) => b.total - a.total || b.evidence_quality - a.evidence_quality || a.index - b.index)

// Attach judge totals as the option weight, then K-bound truncate (NFR-4 / AC-17) — applied
// AFTER consensus/judge (the critic-equivalent stage) per the documented ordering.
const ranked = scored.map(s => {
  const o = survivors[s.index - 1] || survivors[0]
  return { ...o, judge_total: s.total }
})
const topK = OM.kBoundTruncate(ranked.map(o => ({ ...o, weight: o.judge_total })), K_MAX)

return {
  question,
  generators: N,
  k_max: K_MAX,
  consensus_threshold: consensus.threshold,
  consensus_bypassed: consensusBypassed,
  options: topK,
  scores: scored,
  winner: topK[0] || null,
  rationale: verdictRaw.rationale,
  dissent: verdictRaw.dissent,
  option_source: 'fierce_panel',
}
