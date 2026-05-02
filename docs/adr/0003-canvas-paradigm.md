# ADR 0003: Canvas paradigm — DAG vs inline-formula document

- **Status**: Proposed (decision deferred to Phase 2 kickoff)
- **Date**: 2026-05-03
- **Deciders**: Founder + Claude Code, on Phase 2 planning

## Context

Phase 1 shipped the typed-DAG canvas: nodes-and-edges in React Flow,
topological evaluation in `src/engine/evaluator.ts`, type-checked
connections via `src/editor/connections.ts`, and the Construction
Protocol replay timeline.

The Claude Design block-kit prototype landed 2026-05-02 in
`design-handoff/2026-05-02-block-kit/` proposing an alternative: an
**inline-formula document**, no edges, formula rows ("regels") of
horizontally-laid-out chip-blocks, with three view modes (Edit / Read /
2.5D) and a separate Eval window holding shape/value/trace tabs. The
prototype introduces a new role family — `relation` (`=`, `≔`, `<`,
`≤`) — that doesn't exist in MathForge's current block taxonomy, and
its labels are partially Dutch.

The two paradigms are not visually compatible: the inline view has no
edges, no positional canvas, no per-node compute UI. They answer
different product questions.

This ADR captures the question while the prototype is fresh. It does
**not** decide between paradigms — Phase 2's planning step does.

## Decision

**Defer.** Park the block-kit prototype as exploratory; keep Phase 1
DAG-canvas as the primary product surface; revisit at Phase 2 kickoff
with a structured option-A/B/C choice (below).

The `--block-{role}-fill` token ramp the prototype introduced **was**
adopted in 2026-05-03 alongside the explanation-panel handoff, since
it's useful regardless of the canvas-paradigm outcome. No other code
from the prototype is implemented.

## Options on the table for Phase 2

1. **Stay DAG.** Archive block-kit; close this ADR as Rejected.
2. **Pivot to inline-formula.** Rewrite `src/editor/canvas.tsx` and
   `src/editor/nodes/`; retire React Flow as the canvas layer. Phase-1
   editor surface and Construction Protocol are mostly thrown away
   (the engine and `MathValue` types survive).
3. **Both.** DAG stays primary; inline-formula becomes a "Document
   view" that renders a topologically-linear graph as rows. Hybrid
   renderer; preserves Phase 1; adds reading/sharing register.

Preliminary lean: **option 3.** Preserves Phase 1 work, lets the
inline view serve as a teaching/sharing format without forcing a
paradigm bet, and the prototype's chip palette transfers cleanly.

## Consequences

- **Positive**: prototype isn't lost; the question is documented and
  visible to anyone reading the repo. The token ramp is harvested.
- **Trade-offs**: a useful design study sits unimplemented for several
  weeks. Founder may want a usability test on the prototype before
  Phase 2 plans, which adds a step to the Phase 2 kickoff.
- **Re-evaluation trigger**: Phase 2 planning step. This ADR's status
  flips to Accepted (option 1, 2, or 3) at that point.

## Alternatives considered

- **Implement now** — rejected. The block-kit prototype lacks a README
  defining its design intent (only `index.html`, `styles.css`, `ux.css`,
  `blockkit.js`, `ux.js`, plus one `_review/00-current.png` reference).
  Implementing without the design-intent doc would mean making product
  decisions silently. The paradigm question is too big for that.
- **Reject outright** — rejected. The prototype is a thoughtful
  exploration of a real product question (does the DAG abstraction
  match adult-learner mental models for textbook-style math?). Closing
  the door without evidence is premature.

## What deciding requires

- A short usability test on `prototype/index.html` with 2–3 adult
  learners — does the inline format reduce time-to-first-formula?
- An engineering estimate for option 3's hybrid renderer.
- Founder time on the linearity question: do typical pedagogical
  graphs flatten cleanly to rows, or does branching dominate?

## References

- `design-handoff/2026-05-02-block-kit/` — the prototype itself.
- `design-handoff/2026-05-02-block-kit/STATUS.md` — short marker.
- `design-handoff/2026-05-02-explanation-panel/README.md` §4 Q7 — the
  parallel `--block-{role}-fill` token proposal that this ADR's
  decision (re: token adoption) builds on.
- `docs/ROADMAP.md` Phase 2 — the slice that owns this ADR's
  resolution.
