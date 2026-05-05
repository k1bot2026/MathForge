# User Guide

MathForge is a visual environment for composing mathematical operations as type-safe directed graphs. This guide covers the core workflows for building, exploring, saving, and sharing mathematical pipelines.

---

## Contents

1. [The canvas](#1-the-canvas)
2. [Blocks and connections](#2-blocks-and-connections)
3. [The inspector panel](#3-the-inspector-panel)
4. [Common workflows](#4-common-workflows)
5. [Importing existing formulas](#5-importing-existing-formulas)
6. [Saving and sharing graphs](#6-saving-and-sharing-graphs)
7. [Composite blocks (core.subgraph)](#7-composite-blocks-coresubgraph)
8. [Domain examples](#8-domain-examples)

---

## 1. The canvas

The canvas is a React Flow workspace. Every node is a block; every edge is a typed wire carrying a `MathValue` between blocks.

### Navigation

| Action | Gesture |
|---|---|
| Pan | Click and drag on empty canvas |
| Zoom | Scroll wheel or pinch |
| Select a block | Click the node |
| Multi-select | Shift+click, or drag a selection rectangle |
| Delete selected | Backspace or Delete |

### Adding blocks

Open the block palette (left side panel or keyboard shortcut) and drag a block onto the canvas. Alternatively, double-click on empty canvas to open a quick-add search.

### Connecting blocks

Drag from an output handle (right side of a node) to an input handle (left side). The connection validator checks type compatibility in real time:

- **Green handles** — compatible types; connection is accepted.
- **Red handles with tooltip** — type mismatch; the tooltip explains why (e.g. "Cannot connect Matrix to Scalar").
- **Yellow warning icon** — soft mismatch (e.g. exact precision flowing into approximate slot); accepted with a warning.

To disconnect an edge, click on it and press Backspace, or drag the target end off the input handle.

---

## 2. Blocks and connections

### What a block is

Each block is a pure function with:

- **Typed inputs** — slots that accept specific `MathValue` kinds (Scalar, Vector, Matrix, Function, Distribution, Set, …).
- **Typed outputs** — one or more computed results.
- **Parameters** — values editable in the inspector that are not wired in from upstream blocks.
- **Explanation** — a four-tab panel (What / Why / Effect / Impact) that describes the operation and its current output.

### Type system basics

The type system prevents domain errors at edit time. Key rules:

- **Kind must match.** A `Matrix` output does not flow into a `Vector` input.
- **Shape variables unify.** A `Matrix<m,n>` output connected to a `Matrix<m,k>` input binds `n = k` — if a later connection tries to feed a `Matrix<3,4>` into that slot when `n` was already bound to `5`, the connection is rejected.
- **Field subtyping.** `boolean ⊂ integer ⊂ rational ⊂ real ⊂ complex`. An `integer` value flows into a `real` slot.
- **Precision.** `exact → exact` is accepted. `exact → approximate` is accepted with a yellow warning. `approximate → exact` is accepted with a warning (precision will be lost downstream).

See `docs/TYPES.md` for the complete specification.

### Finding the right block

Blocks are organized by domain prefix:

| Prefix | Domain |
|---|---|
| `core.*` | Shared utilities (constant, scalar-input, assert, benchmark, subgraph) |
| `la.*` | Linear algebra (matrices, vectors, decompositions) |
| `stats.*` | Statistics (distributions, sampling, Bayesian inference) |
| `calc.*` | Calculus (derivatives, integrals, limits, ODEs) |
| `discrete.*` | Discrete mathematics (sets, combinatorics, number theory, graph theory) |
| `viz.*` | Visualization (plots, animations, overlays) |

See `docs/BLOCK_TAXONOMY.md` for the complete block list per phase.

---

## 3. The inspector panel

Click any block to open the inspector. It has four sections.

### Explanation tabs

- **What** — one sentence defining the operation.
- **Why** — one sentence explaining the mathematical intuition.
- **Effect** — a live summary of what the current inputs produced (e.g. "3×4 matrix with det = 0").
- **Impact** — what downstream blocks should expect.

### Parameters

Editable values that are not connected from upstream. Each parameter type renders as:

- **Number slider** — for scalars with min/max.
- **Integer field** — for counts and indices.
- **Text field** — for symbolic expressions (e.g. the `expression` param in `calc.function`).
- **Toggle** — for boolean params.

Changing a parameter re-evaluates the block and all downstream blocks immediately.

### Preview renderer

Some blocks render a live mini-visualization beneath the explanation tabs:

- `la.eigen` — SVG eigenvector arrows (2×2) or react-three-fiber arrows (3×3).
- `la.det` — SVG parallelogram (2×2) or 3D parallelepiped (3×3) colored by sign.

### Save as block

When a node is backed by a `SubgraphDefinition` (a user-defined composite block), the inspector shows a **Save as block** panel. See [Section 6](#6-composite-blocks-coresubgraph).

---

## 4. Common workflows

### Building a linear algebra pipeline

**Goal:** multiply two matrices, compute the determinant, and visualise the transformation.

1. Add `la.matrix` (source). Set `rows=2, cols=2`. Enter values in the parameter grid.
2. Add a second `la.matrix` with the same dimensions.
3. Add `la.matmul`. Connect matrix A to the `A` input and matrix B to the `B` input.
4. Add `la.det`. Connect the `AB` output of `la.matmul` to the `A` input of `la.det`.
5. Add `viz.unit-grid` (or `viz.unit-grid-3d` for 3D). Connect the `AB` output to `M`.

The grid visualizer updates live as you edit matrix values.

### Building a calculus pipeline

**Goal:** differentiate a function, visualise the tangent, and compute a definite integral.

1. Add `calc.function`. Set `expression = "sin(x)"`.
2. Add `calc.derivative`. Connect `fn` output of `calc.function` to `fn` input.
3. Add `viz.tangent`. Connect `fn` from `calc.function` to the `fn` port and `fn` from `calc.derivative` to the `derivative` port.
4. Add `calc.definite-integrate`. Connect `fn` from `calc.function`. Set `a = 0`, `b = 3.14159`.

The tangent line updates as you drag the contact point in `viz.tangent`.

### Building a Bayesian inference pipeline

**Goal:** update a Beta prior on evidence from Bernoulli trials.

1. Add `stats.beta` (prior). Set `α=1, β=1` (uniform prior).
2. Add `stats.posterior`. Connect the Beta distribution to the `prior` port. Set `likelihood` to `"Bernoulli"`, `n_obs=10`, `k_hits=7`.
3. Add `viz.posterior-update`. Connect `prior` and `posterior` outputs.

Adjust `k_hits` with the slider to see the posterior update in real time.

### Using `core.assert` to verify properties

`core.assert` connects `actual` and `expected` values and turns the node red when they diverge.

1. Add `la.det` on matrix A.
2. Add `la.det` on matrix B.
3. Add `la.matmul` → `la.det` on A·B.
4. Add `la.scalar-mul` (or `core.constant`) to compute `det(A) · det(B)`.
5. Add `core.assert`. Connect `det(A·B)` to `actual` and `det(A)·det(B)` to `expected`. Set `tolerance = 1e-10`.

If the assertion fires (node turns red), you have a bug in your pipeline.

### Benchmarking a function

1. Add `calc.function` with any expression.
2. Add `core.benchmark`. Connect the `fn` output to `fn`. Set `samples=20, warmup=5`.
3. The `ms_per_call` output shows mean evaluation time.

Note: `core.benchmark` has `determinism: stochastic` — its output varies across evaluations.

---

## 5. Importing existing formulas

The **Import** tab in the left panel converts a written formula into a block graph automatically. Open the tab, paste your expression, and click **Build Graph** (or press Cmd/Ctrl+Enter).

### Plain-math import

Write any expression using standard math.js syntax. The importer recognises top-level `diff` and `integrate` calls and decomposes them into a two-block chain; everything else becomes a single `calc.function` block.

**Example 1 — scalar expression**

Input: `sin(x) + cos(x)`

Result: one `calc.function` block with `expression = "sin(x) + cos(x)"` and `variable = "x"`.

**Example 2 — derivative chain**

Input: `diff(sin(x), x)`

Result: a `calc.function` block (`expression = "sin(x)"`, `variable = "x"`) wired into a `calc.derivative` block via the `fn` handle. The derivative block evaluates `d/dx sin(x) = cos(x)`.

**Example 3 — integral chain**

Input: `integrate(x^2, x)`

Result: a `calc.function` block (`expression = "x^2"`) wired into a `calc.integrate` block.

### LaTeX import

Switch the format toggle to **LaTeX** and paste LaTeX source. The importer pre-processes common LaTeX macros before building the graph.

Supported macros: `\frac`, `\sqrt`, `\sin`, `\cos`, `\tan`, `\ln`, `\log`, `\exp`, `\pi`, `\infty`, `\cdot`, `\times`, `^`.

**Example 4 — LaTeX expression**

Input: `\frac{x^2 - 1}{x + 1}`

Result: one `calc.function` block with `expression = "(x^2 - 1)/(x + 1)"`.

### LaTeX matrix import

When the LaTeX input contains a matrix environment (`\begin{bmatrix}`, `\begin{pmatrix}`, or `\begin{matrix}`), the importer builds an `la.matrix` block directly — bypassing the expression preprocessor.

Rules:
- Rows are separated by `\\`.
- Columns within a row are separated by `&`.
- All cell values must be numeric (integer or decimal). Symbolic cells are not supported; the importer falls back to the expression path if a non-numeric cell is encountered.
- Maximum supported dimension is 8×8.

**Example 5 — 2×2 matrix**

Input: `\begin{bmatrix}1 & 2 \\ 3 & 4\end{bmatrix}`

Result: one `la.matrix` block with `rows=2`, `cols=2`, `r0c0=1`, `r0c1=2`, `r1c0=3`, `r1c1=4`.

After import, open the inspector to edit individual cell values using the scrub grid — drag horizontally to change a value, double-click to type.

### Positioning

Imported blocks are centered on the current viewport. Multi-block graphs (e.g. the derivative chain) are positioned so the midpoint of the entire subgraph lands at the viewport centre, not just the leftmost block.

---

## 6. Saving and sharing graphs

### URL sharing

Every graph is encoded as a compressed URL hash. The hash updates automatically as you edit the graph. To share:

1. Copy the current URL from the browser address bar.
2. Send it to another user.
3. They open the URL — the graph is decoded and rendered immediately. No account required.

URL capacity: approximately 5 KB of graph JSON after compression. Graphs with many nodes or large matrix parameters may exceed this limit; use local save for large graphs.

### Local save (IndexedDB)

User-defined composite blocks are persisted locally in IndexedDB under the key prefix `mathforge:user-blocks`. They survive page reloads and are re-hydrated into the block registry on every mount. This is local to your browser — not synced across devices.

---

## 7. Composite blocks (`core.subgraph`)

A composite block packages a sub-graph of blocks into a single reusable block with its own named typed ports. It appears in the registry alongside built-in blocks once registered.

### Building and saving a composite (end-to-end)

#### Step 1 — Build the inner graph

On the canvas, build the sub-graph you want to encapsulate. Verify it produces the expected result in the inspector.

#### Step 2 — Wrap it programmatically (Phase 5)

Call `buildSubgraphDefinition()` with the inner `GraphSpec` and proxy node mappings, then register with `registerOrReplace()`:

```ts
import { buildSubgraphDefinition } from "~/blocks/common/subgraph/definition";
import { blockRegistry } from "~/blocks";

blockRegistry.registerOrReplace(
  buildSubgraphDefinition({
    id: "user.my-block",
    label: "My Block",
    category: "operation",
    domain: "common",
    color: "function",
    inputs: [{ id: "fn", label: "f(x)", type: fnType }],
    outputs: [{ id: "result", label: "result", type: fnType }],
    subgraph: {
      inner: innerGraph,
      inputProxies:  [{ proxyNodeId: "ip-fn",     portId: "fn"     }],
      outputProxies: [{ proxyNodeId: "op-result",  portId: "result" }],
    },
  })
);
```

See `docs/BLOCK_AUTHORING_GUIDE.md §7b` for the full pattern including proxy node setup.

#### Step 3 — Save via the inspector

1. Select the composite block node on the canvas.
2. In the inspector, scroll to the **Save as block** section.
3. Edit the name if desired.
4. Click **Save**. The record is written to IndexedDB.

#### Step 4 — Reload the page

On reload, `hydrateUserBlocksIntoRegistry()` re-registers all saved blocks from IndexedDB. Your composite is available in the registry as if it were a built-in.

#### Step 5 — Share via URL (v3 schema)

When a graph containing a user block is shared via URL, the `SerializedNode.data.subgraph` field carries the full `SubgraphPayload` inline. The recipient's browser decodes the URL, reconstitutes the `SubgraphDefinition`, calls `registerOrReplace()`, and evaluates the graph normally — no local save required on the recipient's side.

### Nesting composites

Composite blocks can contain other composite blocks. The evaluator enforces a recursion depth limit of 8 (`MAX_SUBGRAPH_DEPTH`). At depth > 8, `compute()` throws `SubgraphError("Max subgraph nesting depth exceeded")`.

Design composites so that typical usage stays within 3–4 nesting levels.

### Output ports

Composite blocks use **named output ports** — one port per `core.output-proxy` node inside the inner graph. Do not use a single `Tuple` output; named ports let the user wire each output directly.

---

## 8. Domain examples

### Linear algebra: eigendecomposition

> Visualise eigenvectors and eigenvalues of a 2×2 matrix.

1. `la.matrix` (2×2) — e.g. `[[2, 1], [1, 2]]`.
2. `la.eigen` — outputs `eigenpairs` Tuple (eigenvalues + eigenvectors).
3. The `la.eigen` inspector shows an SVG preview with eigenvector arrows and their scaling.

The `la.eigen` block throws `EigenError` for matrices with complex eigenvalues. Use a symmetric matrix to guarantee real eigenvalues.

### Statistics: sampling from a Normal distribution

1. `stats.normal` — set `μ=0, σ=1`.
2. `stats.sample` — connect `dist` input; set `n=500`.
3. `viz.histogram` — connect `samples` input; set `kde=true`.

The histogram updates as you change `n` or `σ`.

### Calculus: Taylor series convergence

1. `calc.function` — set `expression = "exp(x)"`.
2. `calc.taylor` — connect `fn`; set `order=5, center=0`.
3. `viz.taylor` — connect `fn` (original) and `taylor` (from `calc.taylor`).
4. Add a `core.scalar-input` for `order`, connect to `calc.taylor`'s `order` port.

Drag the slider to animate convergence as order increases. The `viz.taylor` block shows the original function (solid) and the polynomial approximation (dashed).

### Discrete mathematics: GCD and LCM relationship

> Verify that `gcd(a, b) · lcm(a, b) = |a · b|`.

1. `core.constant` (value `12`) → connect to `discrete.gcd` and `discrete.lcm` input A.
2. `core.constant` (value `18`) → connect to `discrete.gcd` and `discrete.lcm` input B.
3. `core.scalar-mul` — multiply gcd output × lcm output.
4. `core.scalar-mul` — multiply 12 × 18 (absolute value of a·b).
5. `core.assert` — connect both products; set `tolerance=0`.

The assertion turns green, confirming the invariant holds.

### Discrete mathematics: set operations pipeline

1. `discrete.set` (set A) — `count=3`, elements `{1, 2, 3}`.
2. `discrete.set` (set B) — `count=3`, elements `{2, 3, 4}`.
3. `discrete.union` — connect A and B; inspect `S = {1, 2, 3, 4}`.
4. `discrete.intersection` — connect A and B; inspect `S = {2, 3}`.
5. `discrete.difference` — connect A and B; inspect `S = {1}` (A ∖ B).
6. `discrete.cartesian-product` — connect A and B; inspect `S` (9 pairs: (1,2), (1,3), …).

---

## Further reading

| Topic | Document |
|---|---|
| Type system and connection rules | `docs/TYPES.md` |
| Block authoring (adding new blocks) | `docs/BLOCK_AUTHORING_GUIDE.md` |
| Composite block architecture | `docs/ARCHITECTURE.md` (Composite blocks section) |
| Composite block design rationale | `docs/adr/0004-composite-blocks-via-subgraph.md` |
| Phase roadmap and block status | `docs/ROADMAP.md` |
| Complete block catalogue | `docs/BLOCK_TAXONOMY.md` |
| Testing guidelines | `docs/TESTING.md` |
