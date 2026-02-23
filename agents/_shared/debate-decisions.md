# Debate Decision Log (Template)

> **Note**: This file is a **reference template** shipped with the plugin.
> Midori writes actual debate decisions to `.shinchan-docs/debate-decisions.md` in the host project directory.
> If that file does not exist, Midori will copy this template to create it.

This file defines the format for tracking key decisions made through the Team-Shinchan debate process.
Midori checks the project-local log before initiating new debates to avoid re-debating resolved topics.

## Format

Each decision entry follows this format:

### [DECISION-{NNN}] {Topic Title}
- **Date**: YYYY-MM-DD
- **Doc ID**: {workflow doc_id}
- **Panel**: {participating agents}
- **Category**: {architecture|security|performance|tech-selection}
- **Decision**: {one-line summary}
- **Rationale**: {brief rationale}
- **Status**: Active | Superseded by DECISION-{NNN}

## Rotation Policy
Keep the 20 most recent decisions. Archive older decisions to `debate-decisions-archive.md`.

---

## Active Decisions

_No decisions recorded yet. Entries will be added as debates are conducted._
