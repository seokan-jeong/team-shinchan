export const meta = {
  name: 'fierce-debate',
  description: 'Adversarial, non-skippable debate over one high-stakes decision: advocates argue maximally, each refutes the others, an uncompromising judge scores them and records surviving dissent.',
  phases: [
    { title: 'Advocate', detail: 'one persona-prompted agent argues maximally per option' },
    { title: 'Refute', detail: 'each advocate attacks every other option — unconditional, never skipped' },
    { title: 'Judge', detail: 'Action Kamen rubric judge scores options; dissent must be recorded' },
  ],
}

// args = { topic: string, category: string, options: [{ label, persona }] }
//   persona = a 1-2 sentence ROLE/EXPERTISE descriptor injected into the prompt.
//   NOTE: the Workflow runtime's agent registry does NOT expose plugin subagents
//   (team-shinchan:hiroshi, etc.) — agentType only resolves built-ins. So personas
//   are delivered by PROMPT INJECTION here, not via agentType. The fierceness
//   (mandatory refutation + scored judge + non-empty dissent) is independent of that.
// The Workflow tool delivers `args` as a JSON STRING (verified empirically — typeof args === 'string'),
// so parse defensively: it may arrive as a string, an already-parsed object, or undefined.
function parseArgs(a) {
  if (typeof a === 'string') { try { return JSON.parse(a) } catch (e) { return {} } }
  return (a && typeof a === 'object') ? a : {}
}
const A = parseArgs(args)
const topic = A.topic || 'Untitled decision'
const category = A.category || 'architecture'
const PANEL = (Array.isArray(A.options) && A.options.length >= 2)
  ? A.options
  : [{ label: 'Option A' }, { label: 'Option B' }]
const DEFAULT_PERSONA = 'You are a senior engineer with broad architectural judgment and no loyalty to any vendor or fashion.'

const ADVOCATE = {
  type: 'object', additionalProperties: false,
  properties: {
    thesis: { type: 'string' },
    strongest_claim: { type: 'string' },
    evidence: { type: 'string' },
    tradeoff_accepted: { type: 'string' },
  },
  required: ['thesis', 'strongest_claim', 'evidence', 'tradeoff_accepted'],
}

const REBUTTAL = {
  type: 'object', additionalProperties: false,
  properties: {
    attack: { type: 'string' },
    holds: { type: 'boolean', description: 'true only if the attacked claim genuinely survives' },
    why: { type: 'string' },
  },
  required: ['attack', 'holds', 'why'],
}

const VERDICT = {
  type: 'object', additionalProperties: false,
  properties: {
    scores: {
      type: 'array', minItems: 2,
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          option: { type: 'string' },
          correctness: { type: 'integer' },
          completeness: { type: 'integer' },
          quality: { type: 'integer' },
          total: { type: 'integer' },
        },
        required: ['option', 'correctness', 'completeness', 'quality', 'total'],
      },
    },
    winner: { type: 'string' },
    rationale: { type: 'string' },
    // Non-empty by contract: premature consensus is structurally rejected.
    dissenting_views: { type: 'array', minItems: 1, items: { type: 'string' } },
  },
  required: ['scores', 'winner', 'rationale', 'dissenting_views'],
}

phase('Advocate')
log(`Fierce debate: "${topic}" — ${PANEL.length} options, mandatory cross-refutation.`)
const advocates = (await parallel(PANEL.map((o) => () =>
  agent(
    `${o.persona || DEFAULT_PERSONA}\n\nYou are the dedicated advocate for option "${o.label}" in this decision: ${topic}\n\nArgue MAXIMALLY for "${o.label}" — the strongest honest case, concrete evidence, and the single tradeoff you accept. Do NOT hedge toward any other option.`,
    { label: `advocate:${o.label}`, phase: 'Advocate', schema: ADVOCATE }
  ).then(r => r && { ...r, option: o.label, persona: o.persona || DEFAULT_PERSONA })
))).filter(Boolean)

if (advocates.length < 2) {
  return { topic, category, error: 'Need >=2 surviving advocates for a debate', advocates }
}

phase('Refute')
// MANDATORY adversarial pass: every advocate attacks every OTHER option's strongest claim. Unconditional —
// this is the structural property the Midori/Task path cannot guarantee.
const refutations = (await parallel(advocates.flatMap(a =>
  advocates.filter(b => b.option !== a.option).map(b => () =>
    agent(
      `${a.persona}\n\nYou championed "${a.option}". Now REFUTE the strongest claim made for "${b.option}":\n\n"${b.strongest_claim}"\n\nAttack it as hard as you honestly can. Set holds=true ONLY if it genuinely survives your attack.`,
      { label: `refute:${a.option}->${b.option}`, phase: 'Refute', schema: REBUTTAL }
    ).then(r => r && { by: a.option, target: b.option, ...r })
  )
))).filter(Boolean)

phase('Judge')
const dossier = advocates.map(a =>
  `### ${a.option}\nThesis: ${a.thesis}\nStrongest claim: ${a.strongest_claim}\nEvidence: ${a.evidence}\nTradeoff accepted: ${a.tradeoff_accepted}`
).join('\n\n')
const attacks = refutations.map(r =>
  `- [${r.holds ? 'SURVIVED' : 'BROKEN'}] ${r.by} -> ${r.target}: ${r.attack} (${r.why})`
).join('\n')

const verdict = await agent(
  `You are Action Kamen, team-shinchan's uncompromising quality and correctness reviewer. You judge strictly against a rubric and never rubber-stamp a winner.\n\nDecision: ${topic}\n\n## ADVOCATES\n${dossier}\n\n## REFUTATIONS\n${attacks}\n\nScore EACH option on Correctness / Completeness / Quality (1-5 each, total out of 15). Weight claims that SURVIVED refutation; discount BROKEN ones. Pick the winner (highest total; tie -> higher Correctness). dissenting_views MUST be non-empty: record the strongest surviving objection to the winner even though you still chose it.`,
  { label: 'judge', phase: 'Judge', schema: VERDICT }
)

return { topic, category, panel: advocates.map(a => a.option), advocates, refutations, verdict }
