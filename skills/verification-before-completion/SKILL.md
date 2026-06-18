---
name: team-shinchan:verification-before-completion
description: Use when claiming a task is complete, before commits, or before PR creation.
user-invocable: false
---

# Verification-Before-Completion Gate

Never claim a task is complete without running a verification command and reading its output. "I believe it works" is not evidence.

## Verification Checkpoints

You MUST verify at each of these triggers:

1. **Before commits** -- run tests/linter, confirm pass
2. **Before PR creation** -- run full validation suite, confirm zero errors
3. **Before task completion** -- run the specific success criteria commands from the task plan
4. **Before moving to next task** -- confirm current task's tests still pass after any late edits

## Required Evidence

Every completion claim must include:

- **Command**: The exact command you ran (copy-paste, not paraphrased)
- **Output**: The actual output (or relevant excerpt for long output)
- **Verdict**: PASS or FAIL based on the output

If you cannot provide all three, you have NOT verified. Go back and run the command.

## Red Flags List

If your completion report contains ANY of these phrases, you have NOT verified -- STOP and actually run a command:

| Red Flag Phrase | What To Do Instead |
|-----------------|--------------------|
| "should work" | Run the test and show it passes |
| "probably fine" | Run the linter/build and show zero errors |
| "seems to" | Read the actual output and report what it says |
| "looks correct" | Run a validator or test that proves correctness |
| "I believe" | Replace belief with evidence -- run a command |
| "likely" | Remove doubt -- execute and observe |
| "I think" | Verify instead of thinking |
| "no issues expected" | Prove it -- run the check |

## Verification Template

Use this format in your completion report:

```
### Verification
- **Command**: `node tests/validate/index.js`
- **Expected**: All validators pass, 0 errors
- **Actual**: 23 validators passed, 0 errors, 0 warnings
- **Verdict**: PASS
```

If the verdict is FAIL, fix the issue before claiming completion. Do not report a task as done with a FAIL verdict.

> **Gate-enforced (glucofit / main-075 adoption).** At Stage 4, this `## Verification` section (in `IMPLEMENTATION.md`, or a standalone `VERIFICATION.md`) carrying a `Verdict: PASS` is now a **hard prerequisite** for `status: completed` — `hooks/transition-gate.sh` blocks completion without it. One row per REQUESTS.md acceptance criterion, exercised against REAL behavior (the built-in `verify`/`run` skill for runnable surfaces; the AC check command for non-runnable ones). An `UNVERIFIED` AC blocks completion. This closes the "구현 다 하고 QA하면 엉망" hole where self-graded checklists passed as done.

## Fierce-review as code-review evidence

At the **before-PR** and **before-completion** checkpoints, an APPROVED fierce-review artifact satisfies the code-review evidence requirement (it is a schema-validated, adversarially-verified rubric pass — stronger than a single read-through). If `.shinchan-docs/reviews/REVIEW-{NNN}.json` exists for the current scope with `verdict.verdict == "APPROVED"` and an empty `must_fix`, cite it:

- **Command**: `/team-shinchan:fierce-review <scope>`
- **Artifact**: `.shinchan-docs/reviews/REVIEW-{NNN}.json`
- **Verdict**: APPROVED (rubric {total}/{max_total}, 0 must_fix)

A REJECTED artifact, a non-empty `must_fix`, or a stale one (scope no longer matches the current diff) is NOT evidence — re-run the review. This does not replace the test/build evidence above; it adds the review dimension.

## Typed Evidence Receipts (main-075 benchmark adoption)

Completion/verification MAY additionally require a **typed evidence receipt** — a machine-rejectable record proving the *right kind* of evidence exists for the *surface* that changed. This is a conceptual port (MIT↔MIT) of an ultragoal-style completion gate: prose claims ("it works", "looks correct") are insufficient; the receipt is validated by `src/evidence-receipt.js`. This is **additive guidance**, not a hard mandatory gate — the existing exit-0 verify gate (`src/dag-executor.js`) keeps working unchanged. Adopt receipts where stronger, surface-specific proof is warranted (e.g. GUI work where an exit code alone proves little).

**Carrier**: the natural carrier is the same `.shinchan-docs/reviews/REVIEW-{NNN}.json` artifact used above — embed the receipt object under a `receipt` key.

**Surface taxonomy (WS-06)** — each surface demands a different machine-checkable evidence shape (`validateEvidenceReceipt` rejects with a specific reason per failed rule):

| `surface` | Required `surfaceEvidence` / refs |
|-----------|-----------------------------------|
| `gui` | `{ automationTranscript, screenshotRef }` |
| `cli` | `{ replaySafe: true, command, recordedStdout }` |
| `native` | `{ ptyCaptureRef }` **or** `{ screenshotRef }` |
| `api` | at least one `artifactRefs[]` entry |
| `math` | at least one `artifactRefs[]` entry |

A complete receipt also needs `contractCoverage` (a number in `[0,1]`) and a non-empty `adversarialCases` array (at least one adversarial/red-team case) — a "complete" verdict requires proof the work survives hostile input, not just the happy path.

**Freshness-scoping**: receipts carry a `scope` hash. `isReceiptFresh(receipt, currentScopeHash)` returns `false` when the goal/spec changed (`receipt.scope !== currentScopeHash`) — stale evidence is NOT evidence. Re-capture the receipt when scope moves.

Integration point: a gate that wants this stronger proof can call `validateEvidenceReceipt(receipt)` and `isReceiptFresh(receipt, scopeHash)` and treat `{ valid:false }` or a stale receipt the same way it treats a REJECTED review — block until re-captured. Wiring this into `src/dag-executor.js`'s completion gate is OPTIONAL and must remain backward-compatible (receipt absent ⇒ fall back to the existing exit-0 verify gate).
