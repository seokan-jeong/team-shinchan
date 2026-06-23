# benchmarks/ — Outcome Benchmark Harness (Slice A)

Proves with external, reproducible numbers — or honestly reports it does not — whether team-shinchan's `/implement` (Bo) beats bare Claude on a real vendored repo, scored deterministically on the git diff, under a strict pre-committed bar and a fair same-condition baseline.

## What this is / is not

- **Building the harness ≠ running it.** This repo ships the *built and unit-tested* harness. The full paid benchmark that produces the headline numbers is a **separate, user-gated step**.
- The deterministic test suite (`tests/benchmark-*.test.js`) proves the mechanics and spends **$0** (run it with `node --test tests/benchmark-*.test.js`).

## Single reproduce command (the user-gated PAID run)

```
node benchmarks/run.js --all
```

This runs the full matrix: 3 tasks × 2 arms (A = `/team-shinchan:implement`, B = bare Claude, plugin disabled) × n=3 repeats, model = **haiku**, off the pinned fixture commit, scoring each diff deterministically.

### Prerequisites

- **`ANTHROPIC_API_KEY`** must be available in the environment (or a logged-in Claude CLI session). The api key is read from the environment only and is **never** written into any committed artifact.
- The `claude` CLI on `PATH` (both arms invoke `claude -p ... --output-format json --model haiku`).
- Node.js with `node --test` (already used by the repo's test suite — zero new toolchain).
- The vendored fixture at `tests/fixtures/leven/` (pinned SHA recorded in its `PROVENANCE.json`).

### Output location

- Per-run results JSONL + persisted per-arm prompt/config → `benchmarks/results/`.
- The writeup is rendered into `benchmarks/results/REPORT.template.md` (TBD cells filled by this run).

## Cost boundary (binding)

- A full run is bounded to **~$1** (`benchmarks/bar.json` `ceiling_usd`). This is a **HARD** constraint: the runner tracks the real accumulated `total_cost_usd` and **aborts before** any invocation that would cross the ceiling (a truncated matrix is reported as `partial_coverage`, never an overrun).
- The full paid run is a **separate, user-gated** step — it is not run as part of building/testing the harness.

## Pre-committed bar (anti-rigging)

`benchmarks/bar.json` is committed **before** any results (git history = tamper-evident timestamp). Bo counts as a win only if pass-rate is **strictly greater** AND tokens/$ is **not worse** AND there are **zero safety violations**. This, plus the verifiably-disabled fair baseline and persisted prompts, is the direct guard against the ponytail #126 retraction failure mode.
