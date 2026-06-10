# DAG Executor + Completion Gate

> Phase 2 of `interview-metrics-researc-002`. Module: `src/dag-executor.js`.
> Tests: `tests/dag-executor.test.js`. Config: `.shinchan-config.yaml` → `executor:`.

The DAG executor drives the Team-Shinchan **executing** stage as a topologically-ordered task
DAG with static conflict-graph serialization, a per-task verify gate, an error-typed recovery
ladder, a post-merge integration pass, and a strict ALL-PASS completion gate that blocks the
`executing → done` stage transition.

It is built on top of the existing Workflow `pipeline`/`parallel` mental model but ships as a
standalone, dependency-free, unit-tested Node module. All graph logic is exposed as **pure
functions**; side-effectful dispatch and verification are injected as callbacks so tests run
without spawning shells.

## Task DAG schema

Each task carries six fields (authored by Nene — see `agents/nene.md` → *DAG Plan Schema*):

| Field | Meaning |
|-------|---------|
| `id` | Unique string id within the plan |
| `depends_on` | Ids that must be `DONE` first (`[]` if none) |
| `touches` | File paths / resources read or written — drives the conflict graph |
| `verify` | Executable shell command, exit 0 iff complete (NL-only / `true` / `exit 0` → auto-FAIL) |
| `estimate` | Human time estimate, e.g. `"45m"` |
| `scope` | Free-text change boundary; notes which AC(s) it satisfies |

Plan metadata may declare `integration_test` (the post-merge integration command).

## Pipeline

1. **Parse** — `parsePlan()` reads the schema from a structured object or a fenced ```yaml
   block in PLAN.md. Validates unique ids and that every `depends_on` resolves.
2. **Topological sort** — `topoSort()` (Kahn) orders by `depends_on` and **throws on a cycle
   before any dispatch** (no partial execution).
3. **Conflict graph** — `buildConflictGraph()` adds an edge between any two tasks whose
   `touches[]` intersect; `connectedComponents()` groups them. Tasks in a component serialize;
   disjoint components dispatch in parallel up to the concurrency cap.
4. **Verify gate** — `evaluateVerify()`: exit 0 → `DONE`; non-zero or absent/NL-only → `FAILED`
   (never a silent `SKIP`). A `FAILED` task `BLOCK`s its downstream dependents.
5. **Recovery ladder** — `recoveryStep()` branches on error type:
   - `transient` → retry (≤ 3, independent counter)
   - `deterministic` → local-patch immediately (no retry consumed)
   - `scope-drift` → replan (bounded counter; exhaustion → `FAILED`; **no infinite replan**)
6. **Post-merge integration** — `runIntegration()` runs `plan_meta.integration_test`; **absent
   ⇒ warn, do not block**.
7. **Completion gate** — `evaluateCompletionGate()` enforces strict ALL-PASS: zero
   `FAILED`/`SKIP`, all tasks `DONE`, integration passing. Otherwise the stage transition is
   blocked. Zero tasks ⇒ vacuous PASS.

## States

`PENDING → INFLIGHT → DONE | FAILED | BLOCKED | SKIP`. The gate treats `FAILED`, `SKIP`, and any
unfinished (`PENDING`/`INFLIGHT`/`BLOCKED`) task as a block.

## Configuration (`.shinchan-config.yaml`)

```yaml
executor:
  concurrency_cap: 4      # default 4; values outside [1,20] fall back to 4 with a warning
  serial_fallback: true   # default true; emit the NFR-5 warning on a single-component graph
```

## Serial fallback (NFR-5)

If the conflict graph collapses to a **single connected component** (every task shares a
resource), execution is fully serial — expected, not a bug — and the executor logs a warning so
operators can inspect plan granularity. This is the worst case of the conflict-graph algorithm
and the documented boundary condition (REQUESTS.md FR-4 boundary).

## Security notes (STRIDE)

- `touches[]` is parsed once and treated read-only; runtime mutation is unsupported (S1).
- Only the error **type** and a short (≤ 200 char) message are persisted to WORKFLOW_STATE —
  never raw stack traces (I1).
- Trivially-passing `verify` strings (`true`, `exit 0`, `:`) are flagged weak and auto-FAIL;
  semantic meaningfulness of verify commands is enforced by AK review (T2/R-5, process control).

## Cross-phase safety

The module never imports from `src/option-metrics.js` (dependency-inversion ban) and adds only
new exports. Phase 1 artifacts (`agents/misae.md` pipeline, `skills/fierce-option-panel/`,
`src/option-metrics.js`) are frozen; `verify-consistency` + `tests/option-metrics.test.js` are
run as a regression gate after Phase 2 changes.

## CLI

```bash
node src/dag-executor.js --self-check   # diamond-DAG smoke; exits 0 iff the gate passes
```
