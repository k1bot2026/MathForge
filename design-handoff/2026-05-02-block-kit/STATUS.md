# Block-kit prototype — STATUS

**Parked.** See `docs/adr/0003-canvas-paradigm.md` for the open
architectural question (DAG canvas vs inline-formula document).

This bundle is exploratory, not slated for implementation in Phase 1.
The Phase 2 planning step will decide between three options (stay
DAG, pivot to inline, or hybrid). Until then, the prototype lives
here as reference.

## What was harvested

The `--block-{role}-fill` / `--block-{role}-fg` token ramp the
prototype introduced was adopted in `docs/BRAND.md` and
`src/app/globals.css` on 2026-05-03 (alongside the explanation-panel
handoff). It's useful regardless of the canvas-paradigm outcome.

## What's still parked

- The inline-formula document model (`prototype/index.html`).
- The `relation` role (`=`, `≔`, `<`, `≤`) — not in MathForge's
  current taxonomy.
- The Edit / Read / 2.5D view-mode segmented control.
- The Eval-window pattern (Shape / Value / Trace tabs).
- Dutch UI labels in the prototype — handoff vs. localisation
  decision pending if any of this ships.
