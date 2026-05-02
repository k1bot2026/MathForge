# MathForge

A visual canvas for composing mathematical formulas, methods, and algorithms as type-safe directed graphs of blocks.

> Working name. Rename when ready.

## What this is

MathForge lets you **build** mathematics rather than only read it. Every mathematical object — scalar, vector, matrix, random variable, function, distribution — is a typed, draggable block. Connect blocks through shape-checked handles. The graph evaluates reactively. Each block carries a four-tab explanation: **what / why / effect / impact**.

For adult learners, problem-solvers, and creators of new mathematical methods. Not a children's tool, not a CAS replacement, not a proof assistant.

## Status

[![ci](https://github.com/OWNER/mathforge/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/mathforge/actions/workflows/ci.yml)

Phase 0 — Bootstrap. See `docs/ROADMAP.md`.

## Stack

Next.js 16 · React 19 · TypeScript 6 strict · Tailwind v4 · shadcn/ui · React Flow · Zustand · math.js · SymPy via Pyodide · Zod · Mafs · react-three-fiber · Vitest + fast-check + Playwright + Storybook · Biome · Vercel.

## Getting started

```bash
pnpm install
pnpm dev          # dev server on http://localhost:3000
pnpm test         # vitest (unit + property)
pnpm test:e2e     # playwright (boots dev server)
pnpm storybook    # storybook on http://localhost:6006
pnpm typecheck    # tsc --noEmit
pnpm lint         # biome check
pnpm build        # production build
```

## Documentation

All design and architecture docs live in `docs/`. Start with:

- `docs/PROJECT_VISION.md` — what we're building and why
- `docs/ARCHITECTURE.md` — how it's structured
- `docs/BLOCK_TAXONOMY.md` — the heart of the system
- `docs/TYPES.md` — the type system
- `docs/ROADMAP.md` — what to build next

If you're contributing UI: `docs/DESIGN_PRINCIPLES.md` and `docs/BRAND.md`.

If you're working with Claude Code or Claude Design: `CLAUDE.md` and `docs/CLAUDE_DESIGN_WORKFLOW.md`.

## License

TBD.
