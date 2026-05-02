# Blocks

This directory holds **block definitions** — the heart of MathForge.

Each block is a folder containing:

- `definition.ts` — the `BlockDefinition` manifest
- `compute.ts` — the math, separately importable for tests
- `<name>.test.ts` — property-based tests (cross-checked against SymPy where feasible)
- `<name>.stories.tsx` — Storybook story
- `visualization.tsx` — optional in-node or full visualization

See `docs/BLOCK_TAXONOMY.md` for the full `BlockDefinition` interface and the worked
matrix-multiply example. See `docs/TYPES.md` for the type system blocks plug into and
`docs/TESTING.md` for how property tests should be structured.

**Phase 0:** empty. First real blocks land in Phase 1 (PoC matrix-transformation pipeline).
