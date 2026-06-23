# Event-Driven Loop — CI-Failure Responder (opt-in)

Team-Shinchan is normally **manual**: you start work with `/team-shinchan:start`. This recipe adds
one **opt-in, event-driven entry point** — when CI fails on `main`, a GitHub Actions job runs
Claude Code headlessly with the plugin, diagnoses the failure, and **opens a fix PR** (it never
pushes to `main`). It is the "agent triggered by an event, not by a human typing a command" loop.

> **Why this is a recipe, not a built-in skill.** The plugin lives inside interactive Claude Code
> sessions; an external event source (GitHub Actions) is the only place a CI failure can be
> observed. So the event loop is wired in *your* repo's CI, opt-in, rather than shipped active. The
> plugin supplies the workflow it runs (`/team-shinchan:start`); CI supplies the trigger.

## How it works

```
CI fails on main  ─►  GitHub Actions "ci-responder" job
                         ├─ installs Node + the team-shinchan plugin
                         ├─ runs:  claude -p "/team-shinchan:start  fix the CI failure: <log>"
                         │          (headless; --permission-mode acceptEdits, bounded)
                         └─ opens a PR with the fix  ─►  human reviews + merges
```

The fix path is the same audited workflow you use interactively (requirements→design→
planning→micro-execute→completion + the AK gates), just driven headlessly from the failure log.

## Hard brakes (REQUIRED — an event loop that can re-trigger itself is dangerous)

The single biggest hazard is an **infinite responder loop**: the responder opens a PR → that PR's
CI fails → the responder fires again → … The template below blocks this with three guards, and you
should keep all three:

1. **Output is a PR, never a push to `main`.** A failed fix cannot directly re-trigger the `main`
   responder.
2. **Skip the bot's own runs.** `if: github.actor != 'github-actions[bot]'` (and skip when the head
   branch is `ci-fix/*`) so the responder never responds to itself.
3. **One attempt per failure, time- and token-bounded.** No internal retry loop; a `timeout-minutes`
   on the job; the headless run is a single `/team-shinchan:start` (its own stage caps apply). If the
   fix PR still fails CI, a human is in the loop — the responder does not keep trying.

## The workflow (copy to `.github/workflows/ci-responder.yml` to activate)

```yaml
name: CI Responder (team-shinchan)

on:
  workflow_run:
    workflows: ["CI Validation"]   # the name of the CI workflow to watch
    types: [completed]
    branches: [main]

permissions:
  contents: write        # create the fix branch
  pull-requests: write   # open the PR

jobs:
  respond:
    # only on FAILURE, and never respond to the responder's own runs
    if: >-
      ${{ github.event.workflow_run.conclusion == 'failure'
          && github.actor != 'github-actions[bot]'
          && !startsWith(github.event.workflow_run.head_branch, 'ci-fix/') }}
    runs-on: ubuntu-latest
    timeout-minutes: 30          # hard time brake
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: '20' }

      - name: Install Claude Code + team-shinchan plugin
        run: |
          npm install -g @anthropic-ai/claude-code
          # install the plugin per your distribution (marketplace / git); see plugin README

      - name: Fetch the failing run's logs
        env: { GH_TOKEN: ${{ secrets.GITHUB_TOKEN }} }
        run: |
          gh run view ${{ github.event.workflow_run.id }} --log-failed > ci-failure.log 2>&1 || true
          head -c 12000 ci-failure.log > ci-failure.trimmed.log   # bound the prompt size

      - name: Diagnose + fix headlessly
        env: { ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }} }
        run: |
          [ -z "$ANTHROPIC_API_KEY" ] && { echo "No ANTHROPIC_API_KEY — skipping."; exit 0; }
          claude -p "/team-shinchan:start Fix this CI failure. Root-cause it, make the minimal
          fix, and ensure ./run-tests.sh static passes. Failure log:
          $(cat ci-failure.trimmed.log)" \
            --permission-mode acceptEdits

      - name: Open a fix PR (never push to main)
        env: { GH_TOKEN: ${{ secrets.GITHUB_TOKEN }} }
        run: |
          git config user.name  "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          BR="ci-fix/run-${{ github.event.workflow_run.id }}"
          git checkout -b "$BR"
          git add -A && git diff --cached --quiet && { echo "No changes produced."; exit 0; }
          git commit -m "fix: CI-responder auto-fix for failed run ${{ github.event.workflow_run.id }}"
          git push origin "$BR"
          gh pr create --base main --head "$BR" \
            --title "CI-responder: auto-fix for run ${{ github.event.workflow_run.id }}" \
            --body "Automated fix from the team-shinchan CI responder. **Human review required** before merge."
```

## Setup checklist

- Add `ANTHROPIC_API_KEY` to repo **Secrets** (the responder skips cleanly if absent).
- Make the plugin installable in CI (marketplace or a git install step — see the plugin README).
- Confirm the `workflows: ["CI Validation"]` name matches your CI workflow's `name:`.
- Keep all three hard brakes. Treat every responder PR as a **draft for human review** — the
  responder proposes; a human disposes.

## Limitations (be honest about these)

- Opt-in and GitHub-Actions-specific; other CI systems need the equivalent wiring.
- Best-effort: the headless fix may be wrong or incomplete — that's why the output is a reviewable
  PR, not a direct push.
- Costs API tokens per failure; the `head -c 12000` trim and `timeout-minutes` bound each run.
- Not a substitute for the interactive workflow — it's an automated *first attempt* at a known
  failure, gated by human PR review.
