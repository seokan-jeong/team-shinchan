# benchmarks/ — Outcome Benchmark Harness (Slice A)

Proves with external, reproducible numbers — or honestly reports it does not — whether team-shinchan's `/implement` (Bo) beats bare Claude on a real vendored repo, scored deterministically on the git diff, under a strict pre-committed bar and a fair same-condition baseline.

## What this is / is not

- **Building the harness ≠ running it.** This repo ships the *built and unit-tested* harness. The full paid benchmark that produces the headline numbers is a **separate, user-gated step**.
- The deterministic test suite (`tests/benchmark-*.test.js`) proves the mechanics and spends **$0** (run it with `node --test tests/benchmark-*.test.js`).
- **The whole pipeline is proven money-free.** `tests/benchmark-integration.test.js` drives the REAL `cli(...)` end-to-end — fixture copy → `git apply` the arm's diff → real `node --test` → deterministic score → verdict → results JSONL — with a **STUB invoke** in place of the paid `claude` call. The ONLY remaining real-money step is swapping that stub for the real `claude` invoker (`realInvoke` / `defaultInvoke`).

## Single reproduce command (the user-gated PAID run)

```
node benchmarks/run.js --all
```

`benchmarks/run.js` has a real CLI entrypoint (`cli(argv, deps)`, exported and testable). Flags:

| flag | default | meaning |
| --- | --- | --- |
| `--all` | — | run every task in `benchmarks/tasks/` |
| `--repeat N` | `3` | repeats per (task × arm) |
| `--ceiling U` | `1.0` | hard $-ceiling (pre-invocation kill-switch) |
| `--tasks a,b` | all | comma-separated task ids |

This runs the full matrix: 3 tasks × 2 arms (A = `/team-shinchan:implement`, B = bare Claude, plugin disabled) × n=3 repeats, model = **haiku**, scoring each diff deterministically. Results are written to `benchmarks/results/<UTC-timestamp>.jsonl` and a concise summary (per-arm pass-rate, total $, aborted?, win/no-win) is printed.

You can confirm the CLI is wired (without spending a cent) with `node benchmarks/run.js --all --ceiling 0` — it enters `runMatrix`, aborts at the ceiling **before any `claude` call**, and prints `verdict: no-win (partial_coverage)`.

### Isolation: vendored-copy, not upstream-sha

Each (task × arm × repeat) runs against a **fresh copy** of the vendored fixture, not a git checkout of an upstream commit. `withFixtureCopy(fixtureDir, fn)` mkdtemps a scratch dir, recursively copies `tests/fixtures/<fixture>` into it (excluding any stale `.git` and the gitignored `.shinchan-docs/`), `git init`s and commits a clean **base** baseline (so the arm's `git diff` and the scorer's `git apply` both work), runs `fn(copyDir)`, and removes the copy in a `finally`.

A task's **`fixture_sha` is PROVENANCE ONLY** — it records the upstream commit the fixture was vendored from. It is **not** a checkout target; nothing ever does `git worktree add <fixture_sha>` (that commit is not in any local git). The fixture is resolved by NAME (`task.fixture` → `tests/fixtures/<name>`).

### Prerequisites

- **`ANTHROPIC_API_KEY`** must be available in the environment (or a logged-in Claude CLI session). The api key is read from the environment only and is **never** written into any committed artifact.
- The `claude` CLI on `PATH` (both arms invoke `claude -p ... --output-format json --model haiku`).
- Node.js with `node --test` (already used by the repo's test suite — zero new toolchain).
- The vendored fixture at `tests/fixtures/leven/` (its upstream provenance SHA is recorded in `PROVENANCE.json`; see "Isolation" above for why that SHA is never checked out).

### Grading soundness (test_cmd)

Each task's `test_cmd` is the **explicit** `node --test test.test.js`, not a bare `node --test`. This is deliberate: a bare `node --test` run in a directory with *no* discovered test files exits **0** (a vacuous pass), which would let an empty / no-op diff slip through as a "pass". The explicit file argument makes the grade depend on the named suite actually existing and passing — a missing `test.test.js` exits nonzero (`Could not find ...`), so a no-op can never grade green.

### Output location

- Per-run results JSONL + persisted per-arm prompt/config → `benchmarks/results/`.
- The writeup is rendered into `benchmarks/results/REPORT.template.md` (TBD cells filled by this run).

## Cost boundary (binding)

- A full run is bounded to **~$1** (`benchmarks/bar.json` `ceiling_usd`). This is a **HARD** constraint: the runner tracks the real accumulated `total_cost_usd` and **aborts before** any invocation that would cross the ceiling (a truncated matrix is reported as `partial_coverage`, never an overrun).
- The full paid run is a **separate, user-gated** step — it is not run as part of building/testing the harness.

## Pre-committed bar (anti-rigging)

`benchmarks/bar.json` is committed **before** any results (git history = tamper-evident timestamp). Bo counts as a win only if pass-rate is **strictly greater** AND tokens/$ is **not worse** AND there are **zero safety violations**. This, plus the verifiably-disabled fair baseline and persisted prompts, is the direct guard against the ponytail #126 retraction failure mode.
