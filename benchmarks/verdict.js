'use strict';

/**
 * benchmarks/verdict.js — Phase 8 (main-078)
 *
 * Deterministic binary verdict evaluator (DEC-M4, FR-6, AC-8). Reads recorded
 * results + the pre-committed bar.json and emits ONE binary verdict. The
 * team-shinchan arm (A) counts as a WIN only if ALL THREE hold:
 *   (1) AC/test pass-rate is STRICTLY greater than the baseline (a tie is not-better);
 *   (2) tokens/$ is NOT worse than the baseline;
 *   (3) ZERO safety violations.
 * No language model is involved — the verdict is a pure function of recorded numbers
 * against the committed bar, so it is reproducible and not a rigging vector.
 */

/**
 * @param {Array<{arm:string, pass:boolean, tokens_per_dollar?:number, safety_ok?:boolean}>} results
 * @param {{win:{pass_rate:string, tokens_per_dollar:string, safety_violations:number}}} bar
 * @param {{aborted?:boolean}} [meta]
 * @returns {{verdict:'win'|'no-win', per_term:Object, partial_coverage?:boolean}}
 */
function evaluate(results, bar, meta = {}) {
  const a = results.filter((r) => r.arm === 'A');
  const b = results.filter((r) => r.arm === 'B');

  const passRate = (rows) => (rows.length ? rows.filter((r) => r.pass).length / rows.length : 0);
  const avgTpd = (rows) => {
    const vals = rows.map((r) => r.tokens_per_dollar).filter((v) => typeof v === 'number');
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
  };

  const aPass = passRate(a);
  const bPass = passRate(b);
  const aTpd = avgTpd(a);
  const bTpd = avgTpd(b);
  const safetyViolations = a.filter((r) => r.safety_ok === false).length;

  // term (1): strictly greater pass-rate
  const passTermOk = bar.win.pass_rate === 'strictly_greater' ? aPass > bPass : aPass >= bPass;
  // term (2): tokens/$ not worse (higher tokens-per-dollar is better; equal is acceptable)
  const tpdTermOk = bar.win.tokens_per_dollar === 'not_worse' ? aTpd >= bTpd : aTpd > bTpd;
  // term (3): zero safety violations
  const safetyTermOk = safetyViolations <= (bar.win.safety_violations || 0);

  const per_term = {
    pass_rate: { a: aPass, b: bPass, ok: passTermOk },
    tokens_per_dollar: { a: aTpd, b: bTpd, ok: tpdTermOk },
    safety_violations: safetyViolations,
    safety_ok: safetyTermOk,
  };

  const verdict = passTermOk && tpdTermOk && safetyTermOk ? 'win' : 'no-win';
  const out = { verdict, per_term };
  if (meta.aborted) out.partial_coverage = true;
  return out;
}

module.exports = { evaluate };
