# Self-Check Before Completion
<!-- Quality Gate — Guardrails & Quality Gates -->

All execution agents MUST run this checklist before reporting task completion.

## Checklist

### Principle Compliance
- [ ] **Think Before Coding**: Did I state my assumptions before starting?
- [ ] **Simplicity First**: Is this the minimum code needed? Could I remove anything?
- [ ] **Surgical Changes**: Did I ONLY change what was requested? No extra modifications?
- [ ] **Goal-Driven Execution**: Did I define success criteria? Did I verify them?
- [ ] **Elegance Check** (non-trivial changes only): Is there a more elegant approach? (Balance with Surgical Changes — don't over-engineer)

### Quality Gate
- [ ] All changed lines trace directly to the task request
- [ ] No unnecessary abstractions or patterns added
- [ ] Tests run and pass (if applicable)
- [ ] No unrelated formatting changes
- [ ] **Verification Evidence**: I ran a test/build command and can show the output (not "it should work")
- [ ] **Impact Scope Complete**: For every file I changed, I checked paired/dependent files (skill↔command, agent↔shared, hook↔registration). No orphaned counterparts left out of sync.

### Reporting
- [ ] Changes logged in PROGRESS.md (if active workflow)
- [ ] Summary includes rationale (WHY, not just WHAT)

## How to Use

After completing implementation but BEFORE reporting completion:
1. Run through each checkbox mentally
2. If any checkbox fails, fix the issue first
3. Include self-check result summary in completion report

## Quick Self-Check (3-second version)

Ask yourself:
1. "Did I change ONLY what was asked?" (Surgical)
2. "Is this the simplest solution?" (Simplicity)
3. "Can I prove it works?" (Goal-Driven)

## Red Flags -- STOP and Verify

If your completion report contains any of these words, you have NOT verified:

> **"should work"** | **"probably fine"** | **"seems to"** | **"looks correct"** | **"I believe"** | **"likely"**

Replace every red-flag phrase with an actual command + output. See `team-shinchan:verification-before-completion` for the full verification protocol and evidence template.
