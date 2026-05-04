# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions map to phase milestones, not calendar releases.

---

## [Unreleased] — Phase 6 active: Discrete Mathematics & Combinatorics

Phase 5 complete: composite block foundation (core.subgraph, core.assert, core.benchmark),
stats.bayes-net (closes Phase 3 deferral), IndexedDB Layer 3 cache persistence (closes
Phase 4 deferral), user-defined block save/load UI, and Phase 5 exit criterion confirmed.
2047 tests green.

Phase 6 in progress: MathValue extended with Permutation/Combination/Graph/Modular kinds.
27 discrete blocks shipped (set ops, combinatorics, number theory, sequences, graph theory);
4 viz blocks pending (viz.graph-2d, viz.set-venn, viz.permutation-cycles, viz.modular-clock).

### Foundation (Phase 6)

- **Phase 6 type system extension** — four new `MathType` kinds added to `src/math/types.ts`: `Permutation` (one-line notation, `n: Shape`), `Combination` (`n: Shape`, `k: Shape`), `Graph` (`directed: boolean`, `weighted: boolean`), `Modular` (`modulus: Shape`). Five new payload types: `PermutationPayload` (one-line notation array), `CombinationPayload` (elements + size), `GraphPayload` (vertices + edges with optional weights), `ModularPayload` (value + modulus), `SetPayload` (ordered `ReadonlyArray<MathValue>`). All threaded through the `Payload<T>` conditional type. `canConnect` in `src/editor/connections.ts` extended with four per-kind checks: Permutation unifies `n`; Combination unifies `n` and `k`; Graph rejects undirected→directed with a hard error and unweighted→weighted with a soft warning; Modular unifies `modulus`. `discrete/index.ts` plugin entry registered in `src/blocks/index.ts`. (`1008750`, `a1d2bf7`)

### Discrete blocks (Phase 6)

- **`discrete.set`** — explicit integer set. No inputs; params `count` (0–16, default 3) + `e0..e15` integer element values (range ±1,000,000). Output port `S: Set<Scalar(integer, exact)>`. Deduplicates and sorts elements silently. Category: source; stability: experimental; symbol: `{}`. Property tests: idempotence (re-entering the same elements), order-independence (element order in params doesn't affect output), size invariant (`|S| ≤ count`), no duplicates. Establishes the `discrete.*` domain plugin pattern. (`a1d2bf7`)

### Testing (Phase 6)

- **Discrete fixture infrastructure** — `scripts/generate-sympy-fixtures.mjs` extended with six SymPy-backed generators: `generateGcdCases()` (36 cases including coprime, same-number, zero), `generateIsPrimeCases()` (30 cases: primes, composites, edge cases including 0/1/2), `generateFactorintCases()` (25 cases: primes, prime powers, composites), `generateTotientCases()` (28 cases covering multiplicativity), `generateBinomialCases()` (40 cases including Pascal's identity triples), `generateModularCases()` (31 cases: modpow + modular-inverse). Corresponding fixture JSON files: `discrete-gcd.json`, `discrete-prime.json`, `discrete-factorint.json`, `discrete-totient.json`, `discrete-binomial.json`, `discrete-modular.json`. Six typed loaders added to `tests/sympy-reference.ts`. All values are integer-exact; no floating-point tolerance needed. (`acd093a`)

### Discrete blocks (Phase 6 / Combinatorics)

- **`discrete.factorial`** — n! as an exact integer. Input `n: Scalar(integer, exact)`; output `result: Scalar(integer, exact)`. Symbol: `n!`. Throws `CombinatoricsError` for n exceeding `FACTORIAL_MAX_N`. Shared `combinatorics.ts` utility module (`factorial`, `binomial`, `multinomial`, `makeScalar`). Stability: experimental. (`7273ac1`)
- **`discrete.binomial`** — binomial coefficient C(n, k) = n! / (k!(n−k)!). Inputs `n: Scalar(integer, exact)`, `k: Scalar(integer, exact)`; output `result: Scalar(integer, exact)`. Symbol: `C(n,k)`. Cross-checked against SymPy `discrete-binomial.json` fixture (40 cases including Pascal's identity triples). (`7273ac1`)
- **`discrete.multinomial`** — multinomial coefficient (k₀+k₁+…)! / (k₀!·k₁!·…). No inputs; params `groups` (1–8, default 3) + `k0..k7` group sizes. Output `result: Scalar(integer, exact)`. Symbol: `M`. Up to 8 groups; total n ≤ `FACTORIAL_MAX_N`. Generalizes the binomial coefficient for more than two groups. 189 tests across all three combinatorics blocks (unit cases, error paths, fast-check properties: Pascal's identity, C(n,0)=C(n,n)=1, multinomial sum). (`7273ac1`)

### Discrete blocks (Phase 6 / Combinatorics — permutations + combinations)

- **`discrete.permutations`** — enumerates all ordered k-tuples drawn from a set S without repetition. Inputs `S: Set<Scalar(integer, exact)>`, `k: Scalar(integer, exact)`; output `result: Set<Tuple<Scalar(integer)×k>>`. Throws `PermutationsError` if k > |S| or result exceeds 5040 tuples. (`0ff2c81`)
- **`discrete.combinations`** — enumerates all unordered k-subsets drawn from a set S without repetition. Inputs `S: Set<Scalar(integer, exact)>`, `k: Scalar(integer, exact)`; output `result: Set<Tuple<Scalar(integer)×k>>`. Elements sorted ascending before enumeration. Throws `CombinationsError` if k > |S| or result exceeds 5040 tuples. (`0ff2c81`)

### Discrete blocks (Phase 6 / Number theory)

Nine number-theory blocks shipped together in `52d4fc8`. All share the `number-theory.ts` utility module (`NumberTheoryError`, `gcd`, `lcm`, `modpow`, `isPrime`, `factor`, `divisors`, `totient`, `primeFactorize`, `modularInverse`, `makeSetOfIntegers`). All use `engine: "native"`, `stability: "experimental"`.

- **`discrete.gcd`** — greatest common divisor via Euclidean algorithm. Inputs `a, b: Scalar(integer, exact)`; output `result: Scalar(integer, exact)`. Symbol: `gcd`. Cross-checked against SymPy `discrete-gcd.json`. (`52d4fc8`)
- **`discrete.lcm`** — least common multiple = |a·b| / gcd(a,b). Inputs `a, b: Scalar(integer, exact)`; output `result: Scalar(integer, exact)`. Symbol: `lcm`. (`52d4fc8`)
- **`discrete.modpow`** — modular exponentiation aᵉ mod m via repeated squaring. Inputs `base, exp, m: Scalar(integer, exact)`; output `result: Scalar(integer, exact)`. Symbol: `aᵉ mod m`. (`52d4fc8`)
- **`discrete.is-prime`** — trial-division primality test. Input `n: Scalar(integer, exact)`; output `result: Scalar(boolean, exact)`. Symbol: `prime?`. Uses `makeBooleanScalar`. (`52d4fc8`)
- **`discrete.factor`** — distinct prime factors of n (no multiplicity, e.g. 12 → {2, 3}). Input `n: Scalar(integer, exact)`; output `result: Set<Scalar(integer, exact)>`. Symbol: `factors`. Uses `makeSetOfIntegers`. (`52d4fc8`)
- **`discrete.totient`** — Euler's totient φ(n): count of integers in [1, n] coprime to n. Input `n: Scalar(integer, exact)`; output `result: Scalar(integer, exact)`. Symbol: `φ(n)`. SymPy cross-check. (`52d4fc8`)
- **`discrete.divisors`** — all positive divisors of n in ascending order. Input `n: Scalar(integer, exact)`; output `result: Set<Scalar(integer, exact)>`. Symbol: `div`. Uses `makeSetOfIntegers`. (`52d4fc8`)
- **`discrete.prime-factorize`** — prime factorization with multiplicity (e.g. 12 → {2, 2, 3}). Input `n: Scalar(integer, exact)`; output `result: Set<Scalar(integer, exact)>`. Symbol: `p-fact`. Distinct from `discrete.factor`: includes repeated factors. (`52d4fc8`)
- **`discrete.modular-inverse`** — modular multiplicative inverse a⁻¹ mod m. Inputs `a, m: Scalar(integer, exact)`; output `result: Scalar(integer, exact)`. Requires gcd(a, m) = 1; throws `NumberTheoryError` when not coprime. Symbol: `a⁻¹ mod m`. (`52d4fc8`)

### Discrete blocks (Phase 6 / Sequences)

- **`discrete.fibonacci`** — generates the first n terms of the Fibonacci sequence F(0), F(1), …, F(n-1). No inputs; param `n` (integer, 0–78, default 10). Output `result: Vector<n, integer>`. Exact integers up to F(78) ≤ MAX_SAFE_INTEGER. Throws `FibonacciError` for n > 78. (`4d2a9c2`)
- **`discrete.partial-sum`** — running prefix sums of a sequence: S(k) = a(0) + a(1) + … + a(k). Input `seq: Vector<any, integer>`; output `result: Vector<n, integer>`. Throws `PartialSumError` on missing input. (`4d2a9c2`)
- **`discrete.recurrence`** — evaluates a general linear recurrence a(n) = c₁·a(n-1) + c₂·a(n-2) + d with configurable initial conditions. No inputs; params `terms` (0–50, default 10), `a0` (default 0), `a1` (default 1), `c1` (default 1), `c2` (default 1), `d` (default 0). Output `result: Vector<n, real>`. Throws `RecurrenceError` on divergence. Fibonacci is a special case (c₁=1, c₂=1, d=0, a0=0, a1=1). Stability: experimental. (`4d2a9c2`)

### Testing (Phase 6 / Number theory cross-engine)

- **Fermat's little theorem property** — `1f85c40` adds a fast-check property: for prime p and a not divisible by p, `modpow(a, p-1, p) === 1`. Runs against the native engine.
- **Number-theory cross-engine tests** — `1f85c40` adds SymPy fixture-driven tests for gcd, isPrime, primeFactorize, totient, modpow, and modularInverse against `discrete-gcd.json`, `discrete-prime.json`, `discrete-factorint.json`, `discrete-totient.json`, `discrete-modular.json`.
- **Binomial cross-engine tests** — `d7cd6b3` adds SymPy fixture-driven tests for `discrete.binomial` against `discrete-binomial.json` (40 cases, includes Pascal's identity triples).
- **Set-op property invariants** — union associativity + identity (`8731b1f`), intersection associativity + distributivity (`5dc811d`), cartesian-product annihilation + pair-membership (`ede07d9`). Explain.effect callbacks and missing error-path tests added for gcd, lcm, is-prime, union (`b5c05d8`).
- **Fibonacci SymPy cross-engine + sequence property tests** — `86ca40a` adds SymPy fixture-driven tests for `discrete.fibonacci`; recurrence cross-check (Fibonacci as special case); sum identity (partial-sum of constant-1 sequence = n); monotonicity property for ascending sequences.

### Discrete blocks (Phase 6 / Graph theory)

Six graph-theory blocks shipped in `86ca40a`/`de7d6f4`. All share the `graph-theory.ts` utility module (`GraphError`, `makeGraph`, `dijkstra`, `kruskal`, `connectedComponents`, `greedyColoring`). All use `engine: "native"`, `stability: "experimental"`.

- **`discrete.graph`** — explicit graph source block. No inputs; params `directed: boolean`, `weighted: boolean`, `vertex_count` (0–12), `edge_count` (0–20), per-vertex integer labels, per-edge `from/to/weight` params. Output `G: Graph(directed, weighted)`. Symbol: `G`. (`86ca40a`)
- **`discrete.adjacency-matrix`** — converts a graph to its n×n adjacency matrix: A[i][j] = edge weight (or 1 for unweighted) if an edge exists, 0 otherwise. Input `G: Graph`; output `A: Matrix<n,n,integer>`. Bridges discrete and linear-algebra domains. (`86ca40a`)
- **`discrete.shortest-path`** — Dijkstra's algorithm from a source vertex. Input `G: Graph`; param `source: integer` (vertex index); output `distances: Set<Scalar(integer)>` — distance in vertex-index order; unreachable vertices represented as −1. (`86ca40a`)
- **`discrete.minimum-spanning-tree`** — Kruskal's MST algorithm. Input `G: Graph(weighted)`; output `MST: Graph` (same vertices, minimum-weight spanning edges; n−1 edges for a connected n-vertex graph). (`86ca40a`)
- **`discrete.connected-components`** — BFS-based connected-component count. Input `G: Graph`; output `k: Scalar(integer)`. (`86ca40a`)
- **`discrete.coloring`** — greedy graph coloring (Welsh-Powell heuristic). Input `G: Graph`; output `k: Scalar(integer)` — chromatic number upper bound. (`86ca40a`)

### Testing (Phase 6 / Graph theory)

- **Graph-theory unit + smoke tests** — `86ca40a`/`de7d6f4` add 29 tests in `graph-theory.test.ts`: dijkstra (source = 0, nearest neighbor, optimal path, disconnected = Infinity), kruskal (n−1 edges, lightest edges, single vertex), connectedComponents (1/3/0-component, isolated vertices), greedyColoring (triangle = 3 colors, no adjacent same color, empty = 0), and block smoke tests for all six graph-theory blocks.

### Discrete blocks (Phase 6 / Set operations)

- **`discrete.union`** — set union A ∪ B. Inputs `A, B: Set<Scalar(integer, exact)>`; output `S: Set<Scalar(integer, exact)>`. Symbol: ∪. Shared `set-ops.ts` utility module (`setUnion`, `setIntersection`, `setDifference`, `setCartesianProduct`); all four set-op blocks register from `discrete/index.ts`. Throws `SetOpError` on missing inputs. (`a085ac1`)
- **`discrete.intersection`** — set intersection A ∩ B. Inputs `A, B: Set<Scalar(integer, exact)>`; output `S`. Symbol: ∩. (`a085ac1`)
- **`discrete.difference`** — set difference A ∖ B (elements in A not in B). Inputs `A, B: Set<Scalar(integer, exact)>`; output `S`. Symbol: ∖. Property test: `|A∖B| + |A∩B| = |A|`. (`a085ac1`)
- **`discrete.cartesian-product`** — Cartesian product A × B. Inputs `A, B: Set<Scalar(integer, exact)>`; output `S: Set<Tuple(Scalar(integer), Scalar(integer))>`. Symbol: ×. Property test: `|A×B| = |A|·|B|`. 31 tests across all four blocks (unit behavior, error paths, fast-check properties: commutativity of union/intersection, idempotence, size invariants). (`a085ac1`)

### Composite blocks (Phase 5 / Ecosystem)

- **`stats.bayes-net`** — Bayesian network composite block shipped as a `core.subgraph` instance pre-configured with Beta prior + Binomial likelihood + Poisson–Gamma conjugate pair; registered via `BlockRegistry.registerOrReplace()`. Closes the Phase 3 deferral that required `core.subgraph` to exist first. (`60e234b`)
- **Block versioning + save/load UI** — `saveUserBlock` / `loadUserBlocks` / `deleteUserBlock` / `hydrateUserBlocks` backed by idb-keyval store `"mathforge:user-blocks"`. `hydrateUserBlocksIntoRegistry()` called on canvas mount (SSR-guarded). `SaveAsBlockButton` added to the inspector panel for `SubgraphDefinition` nodes. Graph-codec bumped to v3: `SerializedNode.data` gains an optional `subgraph` field so composite blocks serialized in a shared URL survive round-trips without needing a live registry. `migrateV2toV3` passthrough preserves all pre-v3 graphs unchanged. (`f887afc`)
- **Phase 5 exit criterion walkthrough** — §9 "End-to-end composite walkthrough" added to `docs/BLOCK_AUTHORING_GUIDE.md`: step-by-step guide to build → save → share → use a composite block, confirming the Phase 5 exit criterion ("a user can build a composite block, save it, share it, and another user can use it as a first-class block"). (`53db869`)

### Persistence (Phase 5)

- **`IndexedDBCache` (Layer 3)** — cross-reload `EvalCache` persistence via idb-keyval write-through. `IndexedDBCache` class added to `src/engine/cache.ts`; `hydrateFromIDB()` loads persisted results on startup; cache entries are keyed on `hash(blockId + inputHashes + paramsHash + engineVersion)` so engine upgrades automatically invalidate stale entries; cache entries are tagged with graph hash for per-graph invalidation when the graph URL changes. 146-test suite (`src/engine/idb-cache.test.ts`). Completes the three-layer cache architecture: (1) in-memory memoization, (2) sessionStorage on idle, (3) IndexedDB cross-reload. Closes the Phase 4 deferral. (`ee43548`)

### Foundation (Phase 5)

- **`core.input-proxy`** — internal source block marking a subgraph input port. Output port `value: Scalar(real, approximate)`; param `portId` (string). Stability: `"internal"` — not intended for direct user placement. The `compute` function throws if called outside a `core.subgraph` context; in normal evaluation the sub-evaluator pre-populates the result map before running the inner graph. (`5400d37`)
- **`core.output-proxy`** — internal sink block marking a subgraph output port. Input port `value: Scalar(real, approximate)`; param `portId` (string). Stability: `"internal"`. Identity pass-through; `core.subgraph`'s compute reads the result of each output-proxy node to expose it as a named outer port. (`5400d37`)
- **`BlockRegistry.registerOrReplace()`** — new registration method for user-defined composite blocks. Built-in blocks (registered via `register()`) are tracked in a `builtinIds` Set and cannot be overwritten (throws). Replacing an existing user-defined block emits a `console.warn` to surface accidental re-registration. 51 tests in `registry.test.ts`. (`e1159c4`)
- **`core.assert`** — assertion block: inputs `actual: Scalar(real, approximate)`, `expected: Scalar(real, approximate)`; optional param `tolerance: number` (default 0, exact equality); output port `pass: Scalar(boolean, exact)`. `computeAssert` handles Scalar (numeric ± tolerance), Vector (element-wise), Matrix (element-wise), and Expression (serialized string comparison) kinds; kind mismatch returns false without throwing. Node output is `false` on assertion failure — connect downstream to visualise pass/fail in the graph. Engine: native; stability: stable. 192 tests. (`209c4cf`)
- **`core.subgraph`** — composite block engine (ADR 0004 accepted). `buildSubgraphDefinition(id, label, payload, inputPorts, outputPorts, registry)` factory creates a runtime-registered `BlockDefinition` whose `compute()` recursively calls `evaluate()` on an inner `GraphSpec`. `SubgraphPayload` carries the inner graph plus `inputProxies` / `outputProxies` maps (both arrays of `{ proxyNodeId, portId }`). Outer inputs are pre-seeded into the sub-evaluator's result map as virtual results for `core.input-proxy` nodes; `core.output-proxy` results are read back as named outer output ports. Recursion bounded by `MAX_SUBGRAPH_DEPTH = 8` via `EvalContext.depth`. Sub-evaluator creates a fresh `EvalCache` per call. Evaluator extended with `initialResults` and `depth` params; skip-already-seeded bug fixed. Stability: experimental; throws `SubgraphError`. (`6eb1bd6`)
- **`core.benchmark`** — wall-clock profiler for a `Function`. Inputs: `fn: Function(arity=1, real→real)`, optional `x: Scalar(real)` (eval point, default 0). Output: `ms_per_call: Scalar(real, approximate)`. Params: `samples` (default 10, min 1), `warmup` (default 2, min 0). Runs warmup evals silently, then measures `samples` timed calls via `performance.now()`, returns mean ms/call. Determinism: stochastic (wall-clock varies). Stability: experimental. Throws `BenchmarkError` for missing/wrong-kind input or invalid sample/warmup counts. 17 tests (OS-jitter-tolerant threshold: 200× expected runtime). (`8758c79`)

### Testing (Phase 5 — coverage push)

- **Explain callback coverage** — `explain.effect` and `explain.impact` callbacks added to test suites for all `la.*` blocks (`0217f92`) and all `stats.*` blocks (`4916392`). Coverage gaps in non-obvious string formatting paths now exercised.
- **Stats viz block tests** — `viz.histogram`, `viz.pdf-cdf`, `viz.joint-heatmap` passthrough and param-variant tests added (`4d68226`).
- **Evaluator branch coverage** — optional-input handling, depth guard, and `initialResults` path exercised in `evaluator.test.ts` (+98 tests, `c3e391e`).
- **Graph-codec edge validation** — non-string handle field tests added to `graph-codec.test.ts` (+40 tests, `7aedba0`).
- **Subgraph depth boundary and error-path tests** — `definition.test.ts` for `core.subgraph` extended with nesting-depth limit and error propagation cases (+73 tests, `5b066e5`).
- **Test count milestone: 2001 tests** (up from 1756 at Phase 4 close).

### [previously] Phase 4 complete: 10 calc ops + 5 viz blocks + cache gate

Phase 2 fully complete: all 17 linear algebra operation blocks, 3 visualization items
(viz.unit-grid-3d, eigenvector highlighting, det area/volume animation), SymPy
cross-engine fixtures for every operation, and 100-node perf gate green.

Phase 3 complete: 8 distributions + 7 operations + 4 visualization blocks. Bayesian
inference pipeline (prior + likelihood → posterior → viz) works end-to-end.
`stats.mgf` establishes the SymPy Pyodide worker RPC pattern for Phase 4 calculus.
1338 tests green. `stats.bayes-net` deferred to Phase 5 (requires `core.subgraph`).

Phase 4 complete: 10 calc operation blocks (including multivariable partial/gradient/ODE),
5 visualization blocks, cross-engine test coverage for all ops, and the cache hit-rate gate
(>50% on a 13-node calc graph). 1756 tests green. Advancing to Phase 5.

### Calculus (Phase 4)

- **`calc.function`** — symbolic expression entry via SymPy sympify(). Params: `expression` (string, default "sin(x)"), `variable` (string, default "x"). Output port `fn: Function(arity=1, real→real)`. `FunctionPayload` stores canonical SymPy str() form and ordered variable list. Also extends `src/engine/workers/pyodide.{client,worker}.ts` with sympify, diff, integrate, definiteIntegrate, limit, and taylor RPCs — pre-wired for all Phase 4 blocks. Throws `FunctionError`. (`02b5512`)
- **`calc.derivative`** — symbolic differentiation d/dx via SymPy diff(). Input `fn: Function`; param `variable` (blank = infer from `payload.variables[0]`); output `fn: Function` (differentiated expression). Chainable for higher-order derivatives. Throws `DerivativeError`. (`cc3542d`)
- **`calc.integrate`** — indefinite integral ∫f dx via SymPy integrate(). Input `fn: Function`; param `variable`; output `fn: Function` (antiderivative; constant of integration omitted). Throws `IntegrateError`. Compose with calc.derivative to verify the Fundamental Theorem. (`8d41219`)
- **`calc.definite-integrate`** — ∫ₐᵇ f dx via SymPy N(integrate(f,(x,a,b))). Inputs: `fn: Function`, optional `a: Scalar(real)` (lower bound), optional `b: Scalar(real)` (upper bound). Params: `a` (default 0), `b` (default 1), `variable`. Output `value: Scalar(real, approximate)`. Bound input ports override param defaults — upstream Scalar blocks drive integration limits dynamically. Throws `DefiniteIntegrateError`. (`5cbf696`)
- **`calc.limit`** — lim_{x→c} f(x) via SymPy limit(). Inputs: `fn: Function`, optional `point: Scalar(real)`. Params: `point` (default 0), `variable`. Output `value: Expression(freeVars=[])`. Returns `Scalar(real)` for finite numeric results; `Expression` for symbolic answers (oo, zoo, indeterminate forms). Throws `LimitError`. (`3ceb98f`)
- **`calc.series`** — partial sum Σ_{n=from}^{to} aₙ via SymPy Sum().doit(). Inputs: `fn: Function` (general term), optional `from: Scalar`, optional `to: Scalar`. Params: `from` (default 0), `to` (default 10), `index` (blank = infer). Output `value: Scalar` for numeric sums; `fn: Function` for parametric terms. Bound inputs override params for slider-driven convergence exploration. Throws `SeriesError`. (`505b00a`)
- **`calc.taylor`** — degree-n Taylor polynomial via SymPy series().removeO(). Inputs: `fn: Function`, optional `center: Scalar(real)`, optional `order: Scalar(real)`. Params: `center` (default 0), `order` (1–20, default 5), `variable`. Output `fn: Function` (polynomial expression, big-O term removed). Throws `TaylorError`. Phase 4 exit-criterion centerpiece — connects to viz.taylor for convergence animation. (`99b529f`)
- **`calc.partial`** — partial derivative ∂f/∂xᵢ via SymPy diff(). Input `fn: Function`; param `variable` (explicit required — can't infer for multivariate). Output `fn: Function`; full variables list preserved in FunctionPayload so downstream blocks see all free variables. Throws `PartialError`. (`75339ae`)
- **`calc.gradient`** — gradient ∇f = [∂f/∂x₁, …, ∂f/∂xₙ] via parallel SymPy diff per variable. Input `fn: Function` (variables list from payload determines dimension). Output `gradient: Vector<n, real>`. Connect Fx/Fy outputs to viz.vector-field to visualise gradient fields of scalar functions. Throws `GradientError`. (`264322c`)
- **`calc.ode-solve`** — ODE solver via SymPy dsolve(). ODE expressed in prime notation (e.g. "y' - y"). Optional IVP inputs `x0: Scalar(real)`, `y0: Scalar(real)` pin the arbitrary constant. Params: `ode` (string), `depVar` (default "y"), `indepVar` (default "x"), `x0` (default 0), `y0` (default 1). Output `solution: Function` (explicit) or `solution: Expression` (implicit/piecewise). Extends Pyodide client with dsolve RPC. Throws `OdeSolveError`. (`a569a71`)

### Visualization (Phase 4)

- **`viz.taylor`** — Taylor convergence overlay: plots f(x) (solid) and Tₙ(x) (dashed) on the same SVG canvas. Inputs: `fn: Function` (original), optional `taylor: Function` (from calc.taylor); passthrough output `fn`. Evaluates expression strings via mathjs.evaluate(). Introduces `src/blocks/calculus/viz-calc.ts` with shared `evalAt`/`sampleExpr`/`yRange` helpers for all calculus viz blocks. Connect calc.taylor's order port to a slider to animate convergence — the Phase 4 exit-criterion demo. (`18e7d58`)
- **`viz.tangent`** — interactive tangent line on a Mafs curve plot. Inputs: `fn: Function`, optional `derivative: Function` (exact slope from calc.derivative; falls back to numerical central-difference when absent); passthrough output `fn: Function`. Click anywhere on the plot to reposition the contact point. Engine: native. (`e0ad80d`)
- **`viz.riemann`** — animated Riemann sum approximation. Input `fn: Function`, optional `a: Scalar(real)`, optional `b: Scalar(real)`; params `a` (default 0), `b` (default π). Interactive n-slider (rectangle count) and left/right/midpoint endpoint method selector. Passthrough output `fn: Function`. Visually bridges discrete summation and continuous integration as n → ∞. Engine: native. (`3da90ee`)
- **`viz.epsilon-delta`** — ε–δ limit definition visualiser. Input `fn: Function`, optional `c: Scalar(real)` (limit point), optional `L: Scalar(real)` (limit value). Yellow horizontal ε-strip + blue vertical δ-strip rendered as interactive sliders; overlap turns green when the chosen δ satisfies |x − c| < δ ⟹ |f(x) − L| < ε. Passthrough output `fn: Function`. Engine: native. (`9583503`)
- **`viz.vector-field`** — 2D arrow-grid vector field. Inputs: `Fx: Function(arity=2)` (x-component, required), optional `Fy: Function(arity=2)` (y-component). Zoom slider param. Arrow direction shows field direction; arrow length and opacity encode magnitude. Passthrough output `Fx: Function`. Connect calc.partial outputs as Fx/Fy to visualise the gradient field ∇f. Engine: native. (`81aace9`)

### Testing (Phase 4)

- **Calculus fixture infrastructure** — five fixture sets committed: `calc-function.json`, `calc-derivative.json`, `calc-integrate.json`, `calc-limit.json`, `calc-taylor.json`. Five typed loaders added to `tests/sympy-reference.ts` (`loadCalcFunctionFixture` through `loadCalcTaylorFixture`). Cross-engine test `function-sympy.test.ts` (22 tests via mocked sympify). Generators added to `scripts/generate-sympy-fixtures.mjs`. (`679fcd0`)
- **Pyodide client error-path coverage** — all new RPC methods (sympify, diff, integrate, definiteIntegrate, limit, taylor) covered in `src/engine/workers/pyodide.client.test.ts`. (`3ad4736`)
- **`calc.derivative` cross-engine tests** — `derivative-sympy.test.ts` loads `calc-derivative.json` fixture; asserts derivative expressions match SymPy diff() output for polynomial, trigonometric, exponential, and composite functions. (`9bc0382`)
- **`calc.integrate` cross-engine tests** — `integrate-sympy.test.ts` includes standard antiderivative assertions and the `derivative(integrate(f)) = f` compositional invariant (Fundamental Theorem of Calculus verification). (`41d7fca`)
- **`calc.taylor` cross-engine tests** — `taylor-sympy.test.ts` (202 tests); includes Taylor convergence property test: at order 30, the polynomial approximation of exp/sin evaluated at x ∈ [−2, 2] matches the true value to within 1e-10. (`92714af`)
- **`calc.series` cross-engine tests** — `series-sympy.test.ts` (22 tests); `calc-series.json` (8 cases: geometric series, harmonic partial sums, alternating series). (`3155450`)
- **Calculus compositional invariants** — `calc-invariants.test.ts` (261 lines): Taylor convergence at order 30 for exp and sin; finite-difference consistency (central-difference slope matches SymPy derivative at sampled points). (`a1b5228`)
- **`calc.gradient` cross-engine tests** — `gradient-sympy.test.ts` (19 tests); `calc-gradient.json` (7 cases: univariate, bivariate, trivariate functions). (`732dbd3`)
- **`calc.partial` + `calc.ode-solve` cross-engine tests** — `partial-sympy.test.ts` (28 tests, `calc-partial.json` 10 cases); `ode-solve-sympy.test.ts` (19 tests, `calc-ode-solve.json`). (`b9c352b`)
- **`calc.limit` cross-engine tests** — `limit-sympy.test.ts` (133 tests); covers numeric limits, symbolic results (oo, zoo), and one-sided limits. (`6f00d6c`)

### Performance (Phase 4)

- **Cache hit-rate gate** — `EvalCache` extended with hit and miss counters; `__getCacheStats()` and `__resetCacheStats()` test-only helpers added. `cache-hit-rate.test.ts` (5 tests): single-leaf evaluation, multi-leaf mutation, and cascading-invalidation scenarios on a 13-node calc-style graph confirm >50% hit rate. Phase 4 exit criterion satisfied. IndexedDB (Layer 3) persistence deferred to Phase 5. (`243fd91`)

### Distributions (Phase 3)

- **`stats.bernoulli`** — Bernoulli(p) distribution. Source block (no inputs); param `p ∈ [0,1]` via slider. Output port `dist: Distribution(Bernoulli)`. Establishes the `DistributionPayload` pattern (`distribution-payload.ts`): discriminated `parameters` union, eager closed-form `moments` (mean, variance, skewness?, excessKurtosis?), typed `support`. 14 property tests. (`7fed327`)
- **`stats.binomial`** — Binomial(n, p) distribution. Params: `n ∈ ℕ₀` (integer), `p ∈ [0,1]`. E[X]=n·p, Var[X]=n·p·(1−p). 12 property tests including Bernoulli-as-Binomial(1,p) consistency. (`96b7fd7`)
- **`stats.normal`** — Normal(μ, σ) distribution. Params `μ` (mean), `σ > 0` (standard deviation). E[X]=μ, Var[X]=σ², skewness=0, excess kurtosis=0. (`8630ce9`)
- **`stats.uniform`** — Uniform(a, b) continuous distribution. Params `a < b` (validated). E[X]=(a+b)/2, Var[X]=(b-a)²/12, skewness=0, excess kurtosis=−1.2. 9 property tests including standard U(0,1) identity. Also ships `bernoulli-sympy.test.ts` (cross-engine test using `stats-bernoulli.json` fixture). (`66d0e3b`)
- **`stats.poisson`** — Poisson(λ) distribution. Param `λ > 0`. E[X]=Var[X]=λ (equidispersion). Discrete support 0..⌈λ+6√λ⌉ (captures >99.9999998% probability mass). 7 property tests including equidispersion identity. (`d8c5069`)
- **`stats.beta`** — Beta(α, β) distribution on [0,1]. Params `α, β > 0`. Closed-form skewness and excess kurtosis (no gamma function needed). Beta(1,1)=Uniform(0,1) identity verified. 8 property tests. Conjugate prior for Bernoulli/Binomial. (`180ceff`)
- **`stats.gamma`** — Gamma(α, β) shape/rate distribution on [0, ∞). Params `α, β > 0`. E[X]=α/β, Var[X]=α/β². Gamma(1,β)=Exponential(β) identity verified. 9 property tests. Conjugate prior for Poisson. (`111afc5`)
- **`stats.empirical`** — wraps a sample Vector as Distribution(Empirical). Input `samples: Vector<n, real>`. E[X]=sample mean, Var[X]=population variance (÷n, not n−1). Support carries the original sample array for viz.histogram. 8 property tests. (`870d195`)

### Operations (Phase 3)

- **`stats.sample`** — draws n independent samples from a distribution using a seeded PCG32 PRNG (BigInt 64-bit state) for full reproducibility. Output `samples: Vector<n, real>`. Params: `n` (count), `seed`. Supports Bernoulli, Binomial, Uniform, Normal (Box-Muller), Poisson (Knuth), Beta (ratio of Gamma draws), Gamma (Marsaglia-Tsang), Empirical. Removes catch-all from `DistributionParameters` union for correct TypeScript narrowing. 10 tests. (`78f7e51`)
- **`stats.expect`** — E[X]: reads `moments.mean` directly from `DistributionPayload`; engine: native. Input `dist: Distribution`; output `mean: Scalar(real)`. Cross-engine tested against SymPy for 5 families. (`a0555ce`)
- **`stats.var`** — Var[X]: reads `moments.variance` directly from `DistributionPayload`; engine: native. Input `dist: Distribution`; output `variance: Scalar(real)`. Cross-engine tested against SymPy for 7 families. (`56bddd1`)
- **`stats.cov`** — Cov[X, Y] = E[(X−E[X])(Y−E[Y])]. Assumes independence (returns 0) unless X and Y are the same random variable. Inputs `X: Distribution`, `Y: Distribution`; output `cov: Scalar(real)`. (`c5ed65f`)
- **`stats.cor`** — Pearson Cor[X, Y] = Cov/(√Var[X]·√Var[Y]) ∈ [−1, 1]. Three inputs: `cov: Scalar`, `X: Distribution`, `Y: Distribution`; output `cor: Scalar(real)`. (`7451bef`)
- **`stats.mgf`** — M_X(t) = E[e^{tX}] computed symbolically via SymPy Pyodide worker; output `mgf: Expression(t)`. Engine: sympy; stability: beta. Introduces `ExpressionPayload` type for SymPy-backed symbolic outputs. First block using the Pyodide worker RPC pattern — establishes the template for Phase 4 calculus blocks. (`13a1760`)
- **`stats.posterior`** — conjugate Bayesian update: prior + likelihood evidence → posterior. Params `n_obs`, `k_hits`, `x_obs`. Four supported conjugate pairs: Beta–Bernoulli, Beta–Binomial, Normal–Normal (known σ), Gamma–Poisson. Closed-form posterior parameters computed exactly. 18 property tests. Stability: beta. (`4e856fe`)

### Visualization (Phase 3)

- **`viz.pdf-cdf`** — plots PDF (or PMF for discrete distributions) and CDF side-by-side using Observable Plot. Input `X: Distribution`; passthrough output. Handles both discrete (PMF/step-CDF) and continuous (density/smooth-CDF) distributions. (`ebbf0ce`)
- **`viz.histogram`** — Observable Plot histogram with optional Gaussian KDE density overlay; input `samples: Vector<n, real>`; passthrough output. Params: `bins` (integer, 0=auto), `kde` (boolean toggle). (`6054a7e`)
- **`viz.joint-heatmap`** — SVG joint density heatmap p(x,y)=p_X(x)·p_Y(y) assuming independence. Inputs `X: Distribution`, `Y: Distribution`; passthrough output `X`. Grid computed from marginal PDFs/PMFs. (`3cd3863`)
- **`viz.posterior-update`** — overlays prior and posterior Beta distributions on the same axis. Inputs `prior: Distribution(Beta)`, `posterior: Distribution(Beta)` (wire from stats.posterior); passthrough output `posterior`. Separation of Bayesian computation (stats.posterior) from visualization (this block). Stability: beta. (`cc75e44`; refactored to consume stats.posterior via input port in `427a2ac`)

### Refactors (Phase 3)

- **`viz-math.ts` shared utility** — extracted `pdfAt`, `pmfAt`, `cdfAt`, and KDE helpers from pdf-cdf, joint-heatmap, and posterior-update visualizations into `src/blocks/statistics/viz-math.ts`. Eliminates duplicate distribution math across 3 visualization modules. (`e20084f`)

### Testing (Phase 3)

- **`sympy.stats` fixture pattern** — `stats-bernoulli.json` (9 cases: moments, PMF, CDF for p ∈ {0, 1/5, …, 1}); `loadBernoulliFixture()` typed accessor in `sympy-reference.ts`. Sets the per-distribution cross-engine test pattern for Phase 3. (`6470cf5`)
- **LLN tests upgraded** — `sample-lln.test.ts` updated with statistically principled ±2σ/√n mean bands and ±5% variance convergence checks for all 7 parametric families (Bernoulli(0.3), Binomial(20,0.4), Uniform(0,10), Normal(0,1), Poisson(5), Beta(2,3), Gamma(2,1)). Each family uses a unique seed (42–48). Replaces the previous flat ±1% tolerance. (`5793827`)
- **Cross-engine tests for stats.expect + stats.var** — `expect-sympy.test.ts`: E[X] pipeline test for 5 families chained through computeX → computeExpect. `var-sympy.test.ts`: Var[X] pipeline test for 7 parametric families. Tests count: 1190 → 1271 (+81). (`39582d0`)

### Foundation (Phase 3)

- **`ExpressionPayload` type** — defined in `src/math/types.ts` (shipped with `stats.mgf`) for blocks that return SymPy-computed symbolic expressions. Fields: `form` ("sympy" | "latex"), `serialized` (expression string), `freeVars` (bound variable names). (`13a1760`)
- **`DistributionPayload` convention** — documented in `docs/TYPES.md`: `parameters` discriminated union by family, eager closed-form `moments`, `support` typed union. Payload cast idiom. (`33a978e`)

### Operations (Phase 2)

- **`la.transpose`** — `Matrix<m,n> → Matrix<n,m>`. Polymorphic output type. Property tests: involution, shape reversal, `(A·B)ᵀ = BᵀAᵀ`. (`ed24132`)
- **`la.add`** — element-wise matrix addition; same shape required (typed error for mismatch). (`061f40a`)
- **`la.sub`** — element-wise matrix subtraction; same shape required. (`0ccaae9`)
- **`la.trace`** — sum of main diagonal; square-matrix only with typed error for non-square inputs. (`7704e07`)
- **`la.det`** — matrix determinant via math.js LU; square-matrix only. SymPy cross-engine fixture: `det(A·B) = det(A)·det(B)`. (`c50ade4`)
- **`la.inverse`** — matrix inverse with `SingularMatrixError` guard; square + full-rank required. (`eba6346`)
- **`la.rref`** — reduced row echelon form via partial-pivoting Gauss-Jordan. (`7cdcadc`)
- **`la.rank`** — matrix rank via non-zero row count of RREF output. (`74a34d0`)
- **`la.lu`** — LU decomposition with partial pivoting; outputs `L`, `U`, `P`. Property tests: `P·A = L·U`, L lower-triangular with unit diagonal, U upper-triangular. (`9f0fcea`)
- **`la.qr`** — QR decomposition via Householder reflections; outputs `Q`, `R`. Property tests: `A = Q·R`, `Qᵀ·Q = I`, R upper-triangular. (`f654d61`)
- **`la.eigen`** — eigendecomposition (real eigenvalues only); single `Tuple` output port `eigenpairs` wrapping `EigenPayload { eigenvalues: number[], eigenvectors: number[][] }`. Column k of the eigenvector matrix is the eigenvector for `eigenvalues[k]` (column-major layout, eigenvector-highlight-friendly). Throws `EigenError` for complex eigenvalues or eigenvector components. Square input only. (`5809167` + compute fix `d03f9ad`)
- **`la.solve`** — solves the linear system `Ax = b` via math.js `lusolve`; inputs `A: Matrix<n,n>`, `b: Vector<n>`, output `x: Vector<n>`. Throws `SolveError` if `|det(A)| < 1e-10` (singular guard) or if the system is otherwise inconsistent. (`fd1a9ec`)
- **`la.svd`** — singular value decomposition via `eigs(AᵀA)`; single `Tuple` output port `USV` wrapping `SvdPayload { U: Matrix<m,m>, S: Vector<min(m,n)>, V: Matrix<n,n> }`. U and V are orthogonal; S holds singular values in descending order. Reconstruction: `U·diag(S)·Vᵀ ≈ A`. Handles rank-deficient and rectangular (m≥n) inputs; U-orthogonality holds even when all singular values are zero. SymPy cross-engine fixture: 12 cases. (`d9d84cd`)
- **`la.basis-change`** — change of basis `P⁻¹·T·P`; inputs `T: Matrix<n,n>` (transformation in standard basis) + `P: Matrix<n,n>` (columns = new basis vectors); output `TPrime: Matrix<n,n>`. Similarity invariants preserved: `trace(T′) = trace(T)`, `det(T′) = det(T)`. Throws `BasisChangeError` for singular P. Property tests: 9 cases including identity basis, chained changes, and both invariants. (`552f5b4`)
- **`la.kernel`** — null space basis via RREF; input `A: Matrix<m,n>`; output `K: Matrix<n,k>` where k = nullity(A) = n − rank(A). Columns are basis vectors for ker(A). Returns `n×0` matrix when A has full column rank. Property tests verify `A·K ≈ 0` and rank-nullity theorem. Engine: native. (`0f2db97`)
- **`la.image`** — column space basis via RREF pivot columns; input `A: Matrix<m,n>`; output `B: Matrix<m,r>` where r = rank(A). Columns are pivot columns of A forming a basis for im(A). Returns `m×0` matrix for zero map. Property tests verify column count equals rank. Engine: native. (`5b0f444`)
- **`la.project`** — orthogonal projection `A·(AᵀA)⁻¹·Aᵀ·v`; inputs `A: Matrix<m,n>` (subspace basis, full column rank required) + `v: Vector<m>`; output `Pv: Vector<m>`. Property tests: idempotence `P(P·v) = P·v`, orthogonality `(v − P·v) ⊥ col(A)`. Throws if `AᵀA` is singular. (`e34f2c3`)

### Visualization (Phase 2)

- **`viz.unit-grid-3d`** — renders the unit cube [0,1]³ and its image under a 3×3 matrix M as an interactive 3D wireframe (react-three-fiber + @react-three/drei, OrbitControls). Basis arrows M·e₁/e₂/e₃ shown in distinct colors. Input: `M: Matrix<3,3>`; passthrough output for pipeline chaining. Four Storybook stories: identity, rotation-Z-45°, shear, scale. Dependencies added (pinned exact): `three@0.184.0`, `@react-three/fiber@9.6.1`, `@react-three/drei@10.7.7`, `@types/three@0.184.0`. (`cb64ca3`)
- **Eigenvector highlighting** — `EigenPreviewRenderer` added to `la.eigen` definition as `previewRenderer`. Renders SVG 2D arrows for 2×2 inputs and react-three-fiber 3D arrows for 3×3 inputs; text fallback for other sizes. Displayed in the inspector-preview section between the explanation tabs and the value strip. Introduced `BlockDefinition.previewRenderer?: ComponentType<{ value: MathValue }>` optional field. (`4cd42b4`)
- **Determinant area/volume animation** — `DetPreviewRenderer` added to `la.det` definition as `previewRenderer`. Renders an SVG parallelogram (2×2) or react-three-fiber parallelepiped (3×3) colored by sign: blue (positive), orange (negative, with orientation-flip label), red (zero/singular). Extended `previewRenderer` signature to include `inputs: ResolvedInputs` so the renderer can access the original matrix, not just the scalar det output. (`16ea77a`)

### Bug fixes / Phase-1 gap closures

- **React Flow event-handler wiring** — user-driven node drags, deletions, and edge-draws now flow into the Construction Protocol replay log. `useGraphStore` gained `onNodesChange` (emits `node-removed` + `node-moved` on drag-end) and `onEdgesChange` (emits `edge-removed`); all three canvas handlers are no-ops in replay mode to prevent the live log from being corrupted during scrubbing. (`db12d38`)

### Foundation (Shape polymorphism)

- **`la.vector`** — N-D real vector block (0–16 dimensions via `dim` parameter). Replaces `la.vector2`. Output type `Vector<"any">` at static registration; concrete `n` resolved at runtime from `dim`. (`be81b5d`)
- **`la.matrix`** — m×n real matrix block (up to 8×8 via `rows`/`cols` parameters). Replaces `la.matrix2x2`. (`934febd`)
- **`la.matvec` updated** — now polymorphic: `Matrix<m,n> × Vector<n> → Vector<m>` for arbitrary dimensions. Existing 2×2 tests continue to pass. (`31ca46b`)
- **`la.matmul` updated** — polymorphic `Matrix<m,k> × Matrix<k,n> → Matrix<m,n>` (was already polymorphic; tests extended for Phase 2 coverage). (`c2d841a`)
- **Seed graph migration** — `src/store/graph-store.ts` default graph updated from `la.vector2`/`la.matrix2x2` to `la.vector`/`la.matrix`. (`53efe0c`)
- **Template migration** — all three Phase 1 templates (rotation, shear, eigen-demo) rebuilt with `la.vector`/`la.matrix`. (`37ea8ea`)
- **URL `schemaVersion` 1 → 2** — `src/lib/graph-codec.ts` bumped. `migrateV1toV2` maps `la.vector2 {x,y}` → `la.vector {dim:2, c0, c1}` and `la.matrix2x2 {a,b,c,d}` → `la.matrix {rows:2, cols:2, r0c0…r1c1}`. Old shared URLs continue to open. (`9b92c6b`)
- **`la.vector2` / `la.matrix2x2` retired** — source files deleted, removed from block registry. Only knowledge of old IDs is in `graph-codec.ts` migrator. (`45d1ee0`)

### Testing infrastructure

- **SymPy fixture infrastructure** — `scripts/generate-sympy-fixtures.mjs` drives Pyodide offline and writes JSON to `tests/fixtures/sympy/`. `tests/sympy-reference.ts` provides typed loaders. `pnpm generate:fixtures` regenerates on demand. (`31ca46b`)
- **`la.vector` cross-engine tests** — `vector-sympy.test.ts` (46 cases): dot product and squared norm against `la-vector.json` SymPy fixtures; Cauchy-Schwarz property; perpendicular-pair check. (`31ca46b`)
- **`la.matrix` cross-engine tests** — `matrix-sympy.test.ts` (41 cases): A·B, A·v, Aᵀ, tr(A), det(A) for 1×1 through 4×4 square inputs and 2×3·3×2 non-square inputs. Involution, det(I)=1, trace linearity. (`31ca46b`)
- **Canvas event-handler e2e tests** — four Playwright tests (`e2e/canvas-event-wiring.spec.ts`) verify that node drags flow through `onNodesChange` into the Construction Protocol: URL hash updates after drag, scrubber max exceeds seed count, last step description contains "moved". Adds `data-testid="replay-step-description"` to `<ReplayBar />` as a stable test anchor. (`13fef11`)
- **`la.lu` / `la.qr` / `la.eigen` / `la.solve` cross-engine fixtures** — 8 LU cases, 8 QR cases, 8 eigen cases, 10 solve cases with typed loaders and cross-engine test files. LU note: P·A = L·U invariant verified (pivot strategies differ between engines). QR note: Q·R reconstruction and Qᵀ·Q orthogonality verified (column signs differ between engines). Eigen note: eigenvalues sorted before comparison; A·v = λ·v verified for all eigenpairs from both engines. (`a95df65`)
- **`la.basis-change` cross-engine fixture** — 7 cases (2×2/3×3/4×4, unimodular P). Tests: direct result match, trace/det similarity invariants, P·result·P⁻¹ = T round-trip. (`5999209`)
- **`la.matmul` / `la.matvec` cross-engine tests** — matmul: 9 cases (7 square + 2 non-square); matvec: 7 cases. Both use existing `la-matrix.json` fixture reference values. (`e1565f1`)
- **`la.kernel` cross-engine fixture** — 11 cases (full-rank, rank-deficient, all-zero, rectangular). Tests verify nullity count, `A·K ≈ 0` for SymPy and our kernel columns, rank-nullity theorem, trivial null space output shape. (`7c76040`)
- **`la.image` / `la.project` cross-engine fixtures** — `la.image`: 10 cases verifying column count = rank(A) and pivot-column identity. `la.project`: 10 cases (1D/2D subspaces of R²/R³/R⁴) verifying `P·v` against SymPy, idempotence `P(P·v) = P·v`, and `v − P·v ⊥ col(A)`. (`5fd15f8`)

### Performance

- **100-node performance gate** — linear-chain ~101-node wallclock guard added to `evaluator-perf.test.ts`. Threshold: 800 ms hard failure; 16.67 ms (60 fps frame budget) soft `console.warn`. Satisfies the Phase 2 exit criterion of 60 fps with 100 nodes on Mac Mini M4. (`ea13fd0`)

### Documentation

- `docs/TYPES.md` — Shape polymorphism documented: corrected `ConnectResult` signature, all four `unifyShape` cases, Phase 2 examples for `la.vector`, `la.matvec`, `la.matmul`, `la.transpose`, and square-matrix constraint pattern. (`7c4322a`)
- `docs/BLOCK_TAXONOMY.md` — `la.vector2`/`la.matrix2x2` marked retired; all Phase 2 blocks listed with type signatures and status markers. (`7cece91`)
- `docs/ROADMAP.md` — Phase 2 progress tracker added and checkboxes ticked for shipped items. (`e689cda`, `ae748e4`)
- `docs/TESTING.md` — SymPy fixture workflow, property testing pattern, `@cross-engine` tag convention, and `tests/arbitraries.ts` reference all documented. (`1071c9e`, `999596d`, `449b944`, `7d0eafe`)
- `docs/ARCHITECTURE.md` — Phase 2 drift fixed: `ConnectResult` type corrected, "zstd" → "deflate (fflate)", migration location corrected to `graph-codec.ts`, v1→v2 schema history added. (`c5c5209`)
- `docs/BLOCK_AUTHORING_GUIDE.md` — new: canonical pattern for adding a block, with `la.transpose` as the worked example; 8-item pre-commit checklist. (`decef3d`)
- `docs/TESTING.md` — `pnpm check:fixtures` guard documented: regenerate-and-diff workflow, when to run, what non-zero exit means. (`f9de82a`)
- `docs/ARCHITECTURE.md` — `useUiStore` workspace-scoped UI state pattern documented: UiState type, lifecycle distinction from graph/history stores, why workspace-scoped. (`199fc14`)
- `README.md` — updated to Phase 2 status with shipped block table and links to new docs. (`9e0c892`)
- `CHANGELOG.md` — initialized (this file). (`12f7cf3`)
- `docs/TESTING.md` — evaluator-perf wallclock guards documented: 25-node and 50-node wallclock fixtures, 16 ms/frame budget rationale, how to add a new threshold tier. (`fde5b82`)
- `docs/BLOCK_AUTHORING_GUIDE.md` — §3a Tuple convention table updated to confirm `la.qr` and `la.eigen` output port names and payload types; la.eigen `eigenpairs` port name reflected. (`97b6117`)

---

## [1.0.0] — 2026-05-03 — Phase 1: Matrix transformation pipeline

Phase 1 exit criteria met. A user can build a matrix transformation pipeline
from scratch, share it via URL, and replay the construction step-by-step.

### Added

**Blocks (Phase 1)**

- `core.constant` — literal scalar value with a MathLive inline editor.
- `core.scalar-input` — labelled scalar parameter, editable at runtime.
- `la.vector2` — 2D column vector `Vector<2, real>`.
- `la.matrix2x2` — 2×2 real matrix `Matrix<2, 2, real>`.
- `la.matvec` — matrix-vector product `Matrix<2,2> × Vector<2> → Vector<2>`.
- `la.matmul` — matrix-matrix product `Matrix<2,2> × Matrix<2,2> → Matrix<2,2>`.
- `viz.unit-grid` — Mafs-rendered unit grid with live linear transformation overlay.

**Type system**

- `MathValue` discriminated union: `Scalar`, `Vector<n>`, `Matrix<m,n>`, `Function`,
  `Expression`, `RandomVariable`, `Distribution`. Defined in `src/math/types.ts`.
- `canConnect(out, into): ConnectResult` in `src/editor/connections.ts` — type-checks
  connections at edit time using a shape-variable unifier.
- Field subtyping: `boolean ⊂ integer ⊂ rational ⊂ real ⊂ complex`.
- Precision propagation: `exact → approximate` permitted with a UI warning;
  `approximate → exact` is flagged at the node boundary.

**Engine**

- Reactive evaluator with topological sort, async streaming, and in-memory
  memoization keyed on `(blockId + inputHashes + paramsHash)`.
- math.js adapter (default) + Pyodide/SymPy worker scaffold (Comlink-typed RPC,
  lazy-loaded on first SymPy-requiring block).
- Three-layer cache: in-memory memoization, sessionStorage on idle, IndexedDB
  for SymPy results via idb-keyval.

**UI**

- React Flow canvas with custom `BlockNode`, typed handles, and connection
  rejection animation (shake + tooltip with reason).
- Right-rail inspector with four explanation tabs: What / Why / Effect / Impact.
- Resizable right rail (`useResizable` hook).
- Workspace-scoped UI store (panel state, theme).
- Brand token extensions: `focus-ring`, `soft-tint`, `block-*` palette tokens.
- `StateChip` for panel-level compute state (idle / computing / error / stale).

**Construction Protocol (replay timeline)**

- `useHistoryStore` records every graph mutation as a typed `ConstructionEvent`
  discriminated union: `node-added`, `node-removed`, `node-moved`, `params-updated`,
  `edge-added`, `edge-removed`, `graph-reset`.
- `projectGraph(events, step)` — pure reducer returning graph state at any step.
- `<ReplayBar />` in the bottom bar with play / pause / scrub at 400 ms per step.
- Canvas glow on nodes touched by the current replay step.
- `replaceGraph` synthesizes `graph-reset` + `node-added` + `edge-added` events so
  template loads produce a meaningful "watch it construct itself" replay.

**Sharing**

- URL-hash graph codec: JSON → fflate (zstd) → base64url, `schemaVersion: 1`.
- `useGraphSync` hook keeps the URL hash in sync with the graph store.

**Templates**

- "Rotation" — 2D rotation matrix applied to a unit vector.
- "Shear" — horizontal shear transformation.
- "Eigenvector demonstration" — 2×2 matrix with eigenvector overlay.

**Testing**

- Property-based tests (fast-check) for `la.matvec` and `la.matmul` cross-checked
  against a SymPy reference. `-0` normalization fixed for IEEE 754 consistency.
- Storybook stories for all 7 Phase 1 blocks.
- Playwright e2e: construction protocol round-trip, hello-block smoke test.

**Infrastructure**

- Next.js 16 App Router + React 19 + TypeScript 6 strict.
- Tailwind v4 + shadcn/ui (`new-york`).
- Biome for lint and format (replaces ESLint + Prettier).
- GitHub Actions CI: typecheck + lint + test + build.
- Vercel preview deploy on PR.
- ADR 0001: Next 16 + TypeScript 6 (accepted).
- ADR 0002: fflate for URL sharing (accepted).

### Architecture decisions

**ADR 0003 — Canvas paradigm** (opened and resolved 2026-05-03): evaluated an
inline-formula document model (Claude Design block-kit prototype) against the
existing typed-DAG canvas. Decided to stay DAG for Phase 2. The inline-formula
prototype is archived in `design-handoff/2026-05-02-block-kit/`; it may be
revisited for a read/share mode in a later phase. See `docs/adr/0003-canvas-paradigm.md`.

---

## [0.1.0] — 2026-05-02 — Phase 0: Bootstrap

Runnable app with full toolchain, one placeholder node, and CI green.

### Added

- Next.js app shell with Tailwind v4 tokens.
- React Flow canvas with placeholder node.
- math.js adapter and smoke test (`[[1,2],[3,4]] · [[5,6],[7,8]]`).
- Pyodide worker scaffold (loads on-demand, responds "ready").
- Zustand graph store with undo/redo skeleton.
- Vitest + fast-check + Playwright + Storybook configured.
- GitHub Actions CI pipeline.
- Vercel preview deploy on PR.
- `docs/` foundation: ROADMAP, ARCHITECTURE, TYPES, BLOCK_TAXONOMY, TESTING,
  DESIGN_PRINCIPLES, BRAND, PROJECT_VISION, CLAUDE_DESIGN_WORKFLOW.
