# Block-kit prototype — STATUS

**Archived.** ADR 0003 (`docs/adr/0003-canvas-paradigm.md`) was
decided on 2026-05-03 in favour of staying with the DAG canvas for
Phase 2 (Linear algebra full). The inline-formula direction stays
available for a future milestone — supersede ADR 0003 with a new
ADR proposing the hybrid renderer if and when that becomes the
right move.

## What was harvested

The `--block-{role}-fill` / `--block-{role}-fg` token ramp the
prototype introduced was adopted in `docs/BRAND.md` and
`src/app/globals.css` on 2026-05-03 (alongside the explanation-panel
handoff). It's useful regardless of the canvas-paradigm outcome.

## What stays archived (unimplemented)

- The inline-formula document model (`prototype/index.html`).
- The `relation` role (`=`, `≔`, `<`, `≤`) — not in MathForge's
  current taxonomy.
- The Edit / Read / 2.5D view-mode segmented control.
- The Eval-window pattern (Shape / Value / Trace tabs).
- Dutch UI labels in the prototype — handoff vs. localisation
  decision pending if any of this ships in a later milestone.

## When to revisit

The decision can be reopened when:
- The block surface is wide enough that a "Document view" has a
  meaningful corpus to render (Phase 3 statistics + Phase 4 calculus
  give it more material than today's linear algebra alone).
- Usability evidence (test with adult learners) shows the inline
  format reduces time-to-first-formula in a way the DAG can't.
- Engineering bandwidth exists for a parallel renderer that doesn't
  fork the block model.
