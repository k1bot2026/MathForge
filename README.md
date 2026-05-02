# MathForge

A visual canvas for composing mathematical formulas, methods, and algorithms as type-safe directed graphs of blocks.

> Working name. Rename when ready.

## What this is

MathForge lets you **build** mathematics rather than only read it. Every mathematical object — scalar, vector, matrix, random variable, function, distribution — is a typed, draggable block. Connect blocks through shape-checked handles. The graph evaluates reactively. Each block carries a four-tab explanation: **what / why / effect / impact**.

For adult learners, problem-solvers, and creators of new mathematical methods. Not a children's tool, not a CAS replacement, not a proof assistant.

## Status

[![ci](https://github.com/k1bot2026/MathForge/actions/workflows/ci.yml/badge.svg)](https://github.com/k1bot2026/MathForge/actions/workflows/ci.yml)

**Phase 2 — Linear algebra full (active).** Phase 1 shipped. See `docs/ROADMAP.md`.

### Shipped blocks

| Block | Description |
|---|---|
| `core.constant` | Literal scalar value |
| `core.scalar-input` | Labelled scalar parameter, editable at runtime |
| `la.vector` | N-dimensional real vector (up to 16 components) |
| `la.matrix` | m×n real matrix (up to 8×8) |
| `la.matvec` | Matrix-vector product `Matrix<m,n> × Vector<n> → Vector<m>` |
| `la.matmul` | Matrix-matrix product `Matrix<m,k> × Matrix<k,n> → Matrix<m,n>` |
| `la.transpose` | Matrix transpose `Matrix<m,n> → Matrix<n,m>` |
| `la.add` | Element-wise matrix addition (same shape required) |
| `la.sub` | Element-wise matrix subtraction (same shape required) |
| `la.trace` | Sum of main diagonal (square matrices only) |
| `la.det` | Matrix determinant (square matrices only) |
| `la.inverse` | Matrix inverse with singular-matrix guard |
| `la.rref` | Reduced row echelon form (Gauss-Jordan) |
| `la.rank` | Matrix rank via non-zero rows of RREF |
| `viz.unit-grid` | Mafs-rendered unit grid with live transformation overlay |

Shape polymorphism: `la.vector` and `la.matrix` accept arbitrary dimensions — type constraints are checked at connection time using shape variables, not hard-coded sizes.

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
- `docs/BLOCK_TAXONOMY.md` — the heart of the system: every block with type signatures and status
- `docs/TYPES.md` — the type system and shape polymorphism
- `docs/ROADMAP.md` — what to build next
- `docs/TESTING.md` — property testing with fast-check, SymPy fixture infrastructure
- `docs/BLOCK_AUTHORING_GUIDE.md` — how to add a new block (canonical pattern + pre-commit checklist)

If you're contributing UI: `docs/DESIGN_PRINCIPLES.md` and `docs/BRAND.md`.

If you're working with Claude Code or Claude Design: `CLAUDE.md` and `docs/CLAUDE_DESIGN_WORKFLOW.md`.

## License

TBD.
