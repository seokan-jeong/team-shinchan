status: PASS

# Feasibility Spike — Headless CLI Contract (Phase 1, main-078)

**Outcome:** PASS. The single allowed paid call ran successfully and confirmed both load-bearing assumptions.

## The one command run (exactly one paid call)

```
claude -p "/team-shinchan:implement add a function add(a,b) returning a+b to /tmp/spike/util.js" \
  --output-format json --model haiku
```

- Exit code: `0`
- Real cost of this single call: **`total_cost_usd = 0.0387698`** (≈ $0.039)
- Model used: `claude-haiku-4-5-20251001` (confirmed via `modelUsage` key)
- `num_turns: 3` — the plugin skill `/team-shinchan:implement` (Bo) **DID trigger headlessly** and ran a multi-turn agent loop.

## Confirmed assumptions

1. **arm-A triggers `/team-shinchan:implement` headlessly** — ✅ Yes. The JSON shows `num_turns: 3`, a substantive `result` string ("Done. I've added the `add(a, b)` function..."), and `permission_denials` for the Read/Write the skill attempted. The skill loop executes non-interactively under `claude -p`.
2. **Real `total_cost_usd` + full `usage` are captured** — ✅ Yes. See the field paths below.

## Observed JSON field paths (the contract every later test parses)

| Field | JSON path | Observed value (this spike) |
|-------|-----------|------------------------------|
| Real cost | `total_cost_usd` | `0.0387698` |
| Input tokens | `usage.input_tokens` | `26` |
| Output tokens | `usage.output_tokens` | `528` |
| Cache read tokens | `usage.cache_read_input_tokens` | `75358` |
| Cache creation tokens | `usage.cache_creation_input_tokens` | `14284` |
| Per-model cost | `modelUsage["claude-haiku-4-5-20251001"].costUSD` | `0.0387698` |
| Success flag | `subtype` / `is_error` | `"success"` / `false` |

The runner (Phase 5) reads `total_cost_usd` as the primary cost (DEC-M2), and the full `usage` object incl. the two cache-token fields for honest cache accounting (FR-5). `MODEL_PRICING` (Phase 7) converts the non-cache token counts to USD when cross-checking; the authoritative cost is the CLI's own `total_cost_usd`.

## Notes / caveats observed

- The actual file write to `/tmp/spike/util.js` was **permission-denied** by the sandbox (`permission_denials` lists the Read+Write). This does **not** affect the contract: the skill still triggered, ran turns, and returned a complete real-cost JSON. In the real paid benchmark run the worktree will be writable, so arm-A's diff will be produced. The spike's purpose was the JSON/headless-trigger contract, which is confirmed.
- `ANTHROPIC_API_KEY` was **not** set in this environment; the CLI authenticated via the logged-in Superset/Claude session. The fixture and this file contain **no** key string (HR-4; grep-verified `0`).

## Captured fixture

`tests/fixtures/sample-cli-usage.json` is the **real** captured JSON from this call, with `session_id`, `uuid`, and per-denial `tool_use_id` identifiers scrubbed. It is the deterministic fixture every later test parses (Phase 5 kill-switch, Phase 7 usage→USD, Phase 9 delivery-trace row 1). It carries a real numeric `total_cost_usd` and a real `usage` object — **not** an `AVG_TOKENS` heuristic.

## Assumption to verify in the later paid run

- In a writable worktree, arm-A actually emits a non-empty git diff (here the write was sandbox-denied; the diff path is exercised by the deterministic scorer tests with synthetic diffs, and will be exercised for real in the user-gated paid run).
