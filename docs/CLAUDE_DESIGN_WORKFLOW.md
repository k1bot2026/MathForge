# Claude Design Workflow

How Claude Design and Claude Code collaborate on this project. Read this before starting visual work.

## Mental model

- **Claude Code** owns the codebase. It is the source of truth for behavior, types, and tests.
- **Claude Design** owns visual exploration. It produces mockups and interactive prototypes that get handed back to Claude Code for production implementation.
- **`docs/BRAND.md`** is the single source of truth that both consult. When tokens change, they change there first.

## When to use which

| Task | Tool |
|---|---|
| Marketing / landing page | Claude Design first → Claude Code implements |
| Onboarding tour, empty states | Claude Design first → Claude Code implements |
| Settings panel, sharing modal, share/read-only page | Claude Design first → Claude Code implements |
| Explanation panel layout (4 tabs: what/why/effect/impact) | Claude Design first → Claude Code implements |
| Block library sidebar | Claude Design for visual exploration → Claude Code for the live data integration |
| **Block component visuals** (the actual nodes on canvas) | Claude Design for static mockup of states (idle, hover, selected, error, warning) → Claude Code implements as React Flow custom nodes |
| **Canvas / React Flow internals** (handles, edges, drag) | Claude Code only — visual is too coupled to library specifics |
| **Visualizations** (Mafs, Three.js, Plot) | Claude Code only — these are domain components |
| Math expression rendering (KaTeX) | Claude Code only |
| Type system, evaluation engine, blocks | Claude Code only |

## Sequencing

The first ten days of work do **not** run Design and Code in parallel. Architecture comes first, because the data model determines what the blocks can even look like.

```
Day  1–3   : Read all docs, ratify, possibly amend via ADR.       (Claude Code, plan-only mode)
Day  4–7   : Phase 0 bootstrap.                                    (Claude Code)
Day  8–10  : First block + canvas integration end-to-end.          (Claude Code)
Day 10+    : Parallel tracks unlock.                               (Both)
```

After day 10, Design works on tracks listed below while Code continues with Phase 1 blocks.

## Handoff format

Claude Design produces a **handoff bundle**: a tar archive containing static HTML + CSS + assets and a `README.md` with design intent. Anthropic's docs describe this as the canonical mechanism — let Claude Design generate it, place under `design-handoff/`.

Repository layout:

```
design-handoff/
├── 2026-XX-XX-onboarding/            # date-prefixed, one folder per handoff
│   ├── README.md                      # design intent, decisions, open questions
│   ├── prototype/                     # the bundle as exported by Claude Design
│   │   └── index.html
│   ├── screenshots/                   # PNG references
│   └── tokens-used.md                 # which tokens from BRAND.md were used
├── 2026-XX-XX-explanation-panel/
└── ...
```

Naming: `YYYY-MM-DD-<short-feature-slug>/`.

## Process per handoff

1. **Brief** (in Claude Design chat). Provide:
   - the feature in one paragraph,
   - a link to the GitHub repo (so Design ingests `docs/BRAND.md` and existing components),
   - explicit reference: *"Use the tokens from `docs/BRAND.md`. Apply the role colour mapping from `docs/DESIGN_PRINCIPLES.md`. Voice & tone per `DESIGN_PRINCIPLES.md`."*,
   - constraints (what must not change).

2. **Iterate** in Claude Design with inline comments and adjustment sliders until the prototype is close to right.

3. **Export** as a Claude Code handoff bundle.

4. **Place** the bundle in `design-handoff/<date-feature>/`.

5. **Open a Claude Code session** for the implementation:
   - prompt: *"Implement the design in `design-handoff/<date-feature>/`. Read its README first. Use existing components from `src/components/` where possible; don't add new dependencies without a check-in."*
   - Claude Code is allowed to deviate from the handoff for technical reasons (accessibility, perf, integration) — but must explain deviations in the PR description.

6. **Review** as usual. Visual regressions caught by Storybook snapshot tests.

## What Claude Design must NOT do

- Define new design tokens. New tokens go in `docs/BRAND.md` first.
- Override the role colour mapping. If you think a block needs a new colour family, that's a `docs/BRAND.md` change with rationale.
- Generate code that bypasses the type system. If a Design-generated prototype hardcodes block shapes that don't match `MathValue`, the implementation in code must reconcile — favoring `MathValue`.
- Generate visuals using emoji or default-stock illustrations.

## What Claude Code must do on handoff

- Read the handoff `README.md` first. Do not skim.
- Compare proposed design tokens against `docs/BRAND.md`. If they conflict, update `docs/BRAND.md` first (with the user's approval) — do not silently absorb.
- Add a Storybook story matching each state shown in the handoff.
- Add a snapshot test for each story.
- Note in the PR description what (if anything) was changed from the handoff and why.

## Known caveats with Claude Design (research preview)

Per Anthropic's documentation, the product is in research preview as of April 2026. Known issues include inline comments occasionally disappearing, save errors in compact view, and lag with very large repositories. Workarounds:

- Paste comments into chat as backup.
- Use full-view layout for any non-trivial work.
- Link subdirectories rather than the entire monorepo when ingesting.

Treat output as **drafts**, not final assets. Always run the implementation through code review against `docs/BRAND.md` and `docs/DESIGN_PRINCIPLES.md`.

## Skipping Claude Design

For a v1 / private preview, you can skip Claude Design entirely and let Claude Code generate UI from `docs/BRAND.md` directly. This works because:

- The brand tokens are already specified.
- shadcn/ui provides the component vocabulary.
- The minimalist principle keeps surface area small.

When to skip:
- Single-developer sprint where context-switching cost outweighs design quality.
- Early phases (0 and 1) where the canvas is the entire product.

When NOT to skip:
- Marketing / landing page (Claude Design is dramatically faster here).
- Onboarding flow (interaction-heavy, Design's iteration loop saves time).
- Any view shown to non-technical stakeholders for feedback.

## Decision log

When in doubt about which tool to use for a task, log the decision in `docs/adr/` so future sessions don't relitigate.
