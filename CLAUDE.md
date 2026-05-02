# CLAUDE.md

This file is read by Claude Code at the start of every session. Keep it concise, current, and project-specific. When something here goes stale, update it in the same commit that changes the underlying reality.

## Project

**MathForge** — a visual, gamified web application for composing mathematical formulas, methods, and algorithms as type-safe directed graphs of "blocks". For adult learners, problem-solvers, and creators of new mathematical methods.

Current phase: see the active phase header in `docs/ROADMAP.md`.

## Non-negotiables

1. **Mathematical correctness is sacrosanct.** Every operation block has property-based tests. Where exact arithmetic is possible, use it (math.js `Fraction` / `BigNumber`, SymPy rationals). Numerical approximations are labelled in the UI as such. See `docs/TESTING.md`.
2. **Type-first.** All block I/O is described by `MathValue` discriminated unions. The connection validator (`isValidConnection` in React Flow) prevents shape errors at edit-time. See `docs/TYPES.md`.
3. **Plan before code.** For any non-trivial task, propose a plan and pause for review. Use plan mode (Shift+Tab twice) for multi-file changes.
4. **Tests before implementation for any math block.** Write property-based tests against a gold-standard reference (SymPy) first; then make them pass.
5. **No premature abstraction.** Build vertical slices. The current slice is the active phase in `docs/ROADMAP.md`.
6. **Keep docs current.** When you change architecture, types, or block taxonomy, update the relevant doc in the same commit.

## Tech stack

- **Runtime:** Node 22 LTS, pnpm 10
- **Framework:** Next.js 16 App Router, React 19, TypeScript 6 strict
- **Styling:** Tailwind v4 + shadcn/ui (`new-york`), Framer Motion
- **Editor canvas:** `@xyflow/react` (React Flow)
- **State:** Zustand (+ immer)
- **Math (default):** math.js (matrices, BigNumber, Fraction, simplify, derivative)
- **Math (heavy symbolic):** SymPy via Pyodide in a Web Worker (Comlink)
- **Math input:** MathLive
- **Math display:** KaTeX
- **2D viz:** Mafs
- **3D viz:** react-three-fiber + drei
- **Statistical plots:** Observable Plot
- **Persistent cache:** idb-keyval (IndexedDB)
- **Validation (boundaries only):** Zod
- **Testing:** Vitest, fast-check, Playwright, Storybook
- **Lint/format:** Biome
- **Backend (Phase 3+):** Supabase (Postgres + Auth)

Pin versions in `package.json`. Major-version upgrades require an ADR in `docs/adr/`.

## Commands

```bash
pnpm install            # install
pnpm dev                # dev server (Next.js)
pnpm build              # production build
pnpm typecheck          # tsc --noEmit
pnpm lint               # biome check
pnpm format             # biome format --write
pnpm test               # vitest (fast unit + property tests)
pnpm test:property      # extended property-based suite (slower, runs in CI)
pnpm test:e2e           # Playwright
pnpm storybook          # Storybook dev
```

CI gate before merge: `typecheck && lint && test && build`.

## Project structure

```
src/
├── app/                    # Next.js routes
├── components/             # generic UI (shadcn-derived)
├── editor/                 # React Flow canvas, custom nodes, edges
│   ├── canvas.tsx
│   ├── nodes/              # one folder per block-type, mirrors src/blocks/
│   └── connections.ts      # type-checking on connect (canConnect)
├── engine/                 # evaluation engine (DAG topo-sort, memoization)
│   ├── evaluator.ts
│   ├── cache.ts
│   └── workers/            # Pyodide/SymPy worker + Comlink wiring
├── math/                   # MathValue types + adapters to engines
│   ├── types.ts            # MathValue discriminated union
│   ├── mathjs-adapter.ts
│   └── sympy-adapter.ts
├── blocks/                 # block definitions — the heart of the system
│   ├── linear-algebra/
│   ├── statistics/
│   ├── calculus/
│   └── common/
├── viz/                    # visualization components per domain
├── store/                  # Zustand stores (graph, ui, prefs)
├── lib/                    # shared utilities
└── styles/                 # tokens, globals.css
docs/                       # source of truth, read these often
tests/                      # cross-cutting tests; per-block tests live next to the block
design-handoff/             # Claude Design exports land here (see workflow doc)
```

## Code style

- ESM only, no CommonJS.
- **Named exports only**. No `index.ts` re-export barrels — they hurt tree-shaking and hide origins. Plugin entry `index.ts` files (e.g. `src/blocks/<domain>/index.ts`) that export a single `register(registry)` function are not barrels and are allowed.
- TypeScript `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.
- Prefer `type` over `interface` unless declaration merging is required.
- Discriminated unions instead of `any` / unchecked casts.
- React Server Components by default; mark client components with `"use client"` only where needed.
- No `export default` for React components.
- Tailwind utility-first; reach for `@apply` only when defining tokens.
- File naming: `kebab-case.ts(x)` for modules, `PascalCase` only inside JSX as component names.
- Tests colocated as `*.test.ts(x)` next to source. Stories as `*.stories.tsx`.
- Comments explain **why**, not what. No commented-out code.

## Workflow expectations

1. **Read the relevant docs first.** For block work: `docs/BLOCK_TAXONOMY.md` + `docs/TYPES.md`. For visual work: `docs/DESIGN_PRINCIPLES.md` + `docs/BRAND.md`. Always start a session by reading `docs/ROADMAP.md` to confirm the active slice.
2. **Plan, then code.** State the plan, list files to be added/changed, and flag risks. For non-trivial changes, wait for approval.
3. **Tests first for math.** Property-based tests with fast-check, cross-checked against SymPy where possible.
4. **Storybook story for every UI component**, including blocks. No exceptions.
5. **Validate at engine boundaries** with Zod (or hand-written guards). Inside the engine, types are trusted.
6. **One block per session/PR.** Don't batch unrelated blocks.

## What this project is NOT

- Not a general-purpose proof assistant — Lean, Coq, Isabelle do that.
- Not a replacement for a CAS — we **use** Mathematica-class engines (SymPy), we don't reimplement them.
- Not a children's tool — Scratch and Polypad cover K–12. Aesthetic and pacing target adult learners.
- Not gamified with points/badges. Engagement comes from aesthetic delight, mastery feedback, and autonomy. See `docs/DESIGN_PRINCIPLES.md`.

## Hardware note

Primary dev machine: Mac Mini M4 (16 GB).
- Run only one Pyodide worker per browser session.
- ≤ 3 concurrent Claude Code worktrees.
- Prefer Biome over ESLint+Prettier for speed.

## Where to look for what

| If you need to… | Read |
|---|---|
| Understand the product vision | `docs/PROJECT_VISION.md` |
| Add or modify a block | `docs/BLOCK_TAXONOMY.md` + `docs/TYPES.md` |
| Make architectural decisions | `docs/ARCHITECTURE.md` (+ open ADRs in `docs/adr/`) |
| Style or design UI | `docs/DESIGN_PRINCIPLES.md` + `docs/BRAND.md` |
| Know what to build next | `docs/ROADMAP.md` |
| Test mathematical correctness | `docs/TESTING.md` |
| Hand off to/from Claude Design | `docs/CLAUDE_DESIGN_WORKFLOW.md` |
| Run or understand the agent-team keep-working pattern | `docs/AGENT_TEAM_WORKFLOW.md` |

## When in doubt

If a request is ambiguous, ask before assuming. If a doc contradicts code, the doc is the source of truth and the code is the bug — unless an ADR overrides the doc.
