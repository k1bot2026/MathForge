# Templates

Phase-1 ships three pre-built graphs as templates. Each is a complete
graph encoded in the URL hash; load it by appending the hash to the
site origin (locally `http://localhost:3000`).

The hashes below are generated from the committed template definitions
in `src/lib/templates/`; `pnpm exec tsx scripts/print-template-hashes.ts`
re-prints them if the templates change. Until that script lands, regenerate
by importing `templateHash(t)` from `src/lib/templates` in a Node REPL.

## Catalog

| id | label | what it shows |
|---|---|---|
| `rotation` | Rotation 30° | A 30° rotation matrix applied to the unit x-vector, with the unit grid showing the new basis. |
| `shear` | Horizontal shear | M = [[1, 1], [0, 1]] applied to a slanted vector — the unit-square parallelogram tilts but area is preserved (det = 1). |
| `eigen-demo` | Eigenvector demonstration | M = [[2, 0], [0, 1]] applied to three vectors: the two eigenvectors (1, 0) and (0, 1), plus a non-eigenvector (1, 1). Comparing the outputs shows which directions M stretches without rotating. |

## Loading a template

Today: open the canvas, then in the browser console:

```js
const { templateHash } = await import("~/lib/templates");
const { rotationTemplate } = await import("~/lib/templates/rotation");
window.location.hash = templateHash(rotationTemplate);
```

After Claude Design hands off the templates rail UI, the picker will
do this for you in one click.

## Phase-2 plans

- In-app picker (rail or modal) — design hand-off pending.
- `?template=<id>` query parameter as a server-side redirect to the
  template's hash, so URLs like `/?template=rotation` work without
  any client-side hash manipulation.
- New templates as Phase-2/3 blocks land:
  - "Eigendecomposition" once `la.eigen` ships.
  - "Bayesian update" once `stats.posterior` ships.
  - "Tangent line" once `calc.derivative` ships.
