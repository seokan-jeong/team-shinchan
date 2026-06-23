# Outcome Benchmark — Slice A: team-shinchan `/implement` (Bo) vs bare Claude

> **TEMPLATE.** All result cells below read `TBD (filled by the user-gated paid run)`. This file is committed with **no** fabricated numbers. The headline numbers are produced ONLY by the separate, user-gated paid run (`node benchmarks/run.js --all`, ~$1 ceiling). Building the harness is not running it.

## Method (auditable)

- **Both arms** run the same headless CLI: `claude -p ... --output-format json --model haiku`, same flags, same pinned fixture snapshot, same fair non-padded prompt.
  - **arm-A** = `/team-shinchan:implement <task>` (Bo, plugin enabled).
  - **arm-B** = the SAME binary/model/flags with the plugin DISABLED via a clean isolated `CLAUDE_CONFIG_DIR`. The runner ASSERTS no team-shinchan hook/skill fired (no write-tracker JSONL line, no `.shinchan-docs` mutation) and persists both arms' full prompt+config for third-party re-derivation.
- **Fixture:** `tests/fixtures/leven/` — `sindresorhus/leven` (MIT) pinned at `235e7758c8ec95fc3a30ef32528ce1fa409c040a`. Grading toolchain: `node --test` (zero new install).
- **Scoring:** deterministic, model-free. Each arm's diff is applied to a pristine worktree; the task's pinned `test_cmd` runs; the **real exit code** is pass/fail; LOC from the diff; wall-clock measured. Non-applying/empty diff = deterministic FAIL.
- **Cost:** the CLI's **real** `total_cost_usd` + full `usage` (incl. cache tokens) per call; a pre-invocation kill-switch aborts before the running total would cross the ceiling.
- **Verdict:** a single binary win/no-win against the pre-committed `benchmarks/bar.json` — A wins ONLY if pass-rate is **strictly greater** AND tokens/$ is **not worse** AND there are **zero safety violations**.

## Per-task results (all 3 repeats per arm)

### Task: bugfix-01 (bugfix)

| Arm | Repeat | Pass | LOC + | LOC - | Tokens (in/out/cache) | USD | Time (ms) |
|-----|--------|------|-------|-------|------------------------|-----|-----------|
| A (Bo) | Repeat 1 | TBD | TBD | TBD | TBD | TBD | TBD |
| A (Bo) | Repeat 2 | TBD | TBD | TBD | TBD | TBD | TBD |
| A (Bo) | Repeat 3 | TBD | TBD | TBD | TBD | TBD | TBD |
| B (bare) | Repeat 1 | TBD | TBD | TBD | TBD | TBD | TBD |
| B (bare) | Repeat 2 | TBD | TBD | TBD | TBD | TBD | TBD |
| B (bare) | Repeat 3 | TBD | TBD | TBD | TBD | TBD | TBD |

### Task: feature-01 (feature)

| Arm | Repeat | Pass | LOC + | LOC - | Tokens (in/out/cache) | USD | Time (ms) |
|-----|--------|------|-------|-------|------------------------|-----|-----------|
| A (Bo) | Repeat 1 | TBD | TBD | TBD | TBD | TBD | TBD |
| A (Bo) | Repeat 2 | TBD | TBD | TBD | TBD | TBD | TBD |
| A (Bo) | Repeat 3 | TBD | TBD | TBD | TBD | TBD | TBD |
| B (bare) | Repeat 1 | TBD | TBD | TBD | TBD | TBD | TBD |
| B (bare) | Repeat 2 | TBD | TBD | TBD | TBD | TBD | TBD |
| B (bare) | Repeat 3 | TBD | TBD | TBD | TBD | TBD | TBD |

### Task: refactor-01 (refactor)

| Arm | Repeat | Pass | LOC + | LOC - | Tokens (in/out/cache) | USD | Time (ms) |
|-----|--------|------|-------|-------|------------------------|-----|-----------|
| A (Bo) | Repeat 1 | TBD | TBD | TBD | TBD | TBD | TBD |
| A (Bo) | Repeat 2 | TBD | TBD | TBD | TBD | TBD | TBD |
| A (Bo) | Repeat 3 | TBD | TBD | TBD | TBD | TBD | TBD |
| B (bare) | Repeat 1 | TBD | TBD | TBD | TBD | TBD | TBD |
| B (bare) | Repeat 2 | TBD | TBD | TBD | TBD | TBD | TBD |
| B (bare) | Repeat 3 | TBD | TBD | TBD | TBD | TBD | TBD |

## Verdict (against the pre-committed bar)

| Term | A (Bo) | B (bare) | Term met? |
|------|--------|----------|-----------|
| Pass-rate (strictly greater) | TBD | TBD | TBD |
| Tokens/$ (not worse) | TBD | TBD | TBD |
| Safety violations (zero) | TBD | TBD | TBD |

**Overall verdict:** TBD (filled by the user-gated paid run) — `win` only if ALL three terms are met; otherwise `no-win`, reported plainly with no inflation.

## Limitations

- **Small sample (n=3).** Agent execution is non-deterministic; a single lucky/unlucky run can flip a per-task verdict. All 3 repeats are reported individually (not just an average). n=3 is too small to claim statistical significance — we do not over-claim.
- **Single language / fixture.** One small MIT JS util (`leven`). Generality to Python, larger corpora, or Sonnet is explicitly deferred (corpus-C / Sonnet are Open Questions).
- **Safety term is scoped.** The "zero safety violations" term is exactly the minimal deterministic DEC-M5 checks: no unrelated/protected-file deletion, no API-key-shaped string in artifacts, and (where a task names one) the required guard branch is not removed. The full adversarial safety tier is out of scope this slice.
- **Cache cost counted honestly.** Bo's plugin context typically incurs higher cache tokens; these are included in the real cost, not discounted.

## Cautionary standard — ponytail issue #126

ponytail's issue **#126** was **retracted** for an unfair/inflated comparison (padded baseline / results-first bar). That retraction is the explicit anti-pattern this harness is built to avoid: the bar is committed **before** any results (git history is the tamper-evident timestamp), the baseline runs the SAME binary/model/flags with the plugin verifiably disabled, and both arms' prompt+config are persisted so a third party can re-derive the verdict. **If the harness does not beat baseline, this report says so plainly.**
