# ADR 0003: Canvas paradigm — DAG vs inline-formula document

- **Status**: Accepted (option 1 — stay DAG)
- **Date opened**: 2026-05-03
- **Date decided**: 2026-05-03
- **Deciders**: Founder, on Phase 2 kickoff

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

**Stay DAG.** Phase 2 (Linear algebra full) builds on today's React Flow
canvas. The block-kit prototype's inline-formula model is not adopted.

Reasoning: Phase 2's block set (`la.eigen`, `la.svd`, `la.qr`,
`la.kernel`, etc.) carries shape variables (`Matrix<m, n>`, `Matrix<n, n>`)
that the existing connection unifier in `src/editor/connections.ts`
already handles. The inline-formula prototype's `relation` role and
document model don't naturally extend to these operations — eigen
decomposition isn't a row of `=` and `·`. Rebuilding the canvas now
would block Phase 2's block set for weeks with no clear pedagogical
upside for these operations.

The `--block-{role}-fill` token ramp the prototype introduced was
already adopted (2026-05-03) alongside the explanation-panel handoff —
useful regardless of this decision. No other code from the prototype
is implemented in Phase 2.

The inline-formula direction stays available for a future milestone
(Phase 3+) when the block set is full enough that a "Document view"
has meaningful content to render. This ADR can be superseded by a
later one if usability evidence and engineering bandwidth justify
the hybrid renderer (option 3 below).

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

- **Positive**: Phase 2 starts unblocked on a stable canvas surface.
  Construction Protocol stays live (depends on edges). Templates
  (Rotation, Shear, Eigen-demo) and the URL-share format need no
  migration. The block-kit token ramp was already harvested.
- **Trade-offs**: the inline-formula prototype sits unused at
  `design-handoff/2026-05-02-block-kit/`. A user who'd benefit from
  the textbook-style register doesn't get it this milestone.
- **Re-evaluation trigger**: a future milestone (Phase 3+) where the
  block surface is wide enough that a Document view has a
  meaningful corpus to render. At that point, supersede this ADR
  with one proposing the hybrid renderer.

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
