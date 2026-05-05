/**
 * Typed accessors for SymPy fixture files in tests/fixtures/sympy/.
 *
 * These fixtures are generated offline by `pnpm generate:fixtures` and
 * committed to the repository. Vitest loads them as static JSON — no
 * browser Worker, no network, no Pyodide boot time in CI.
 *
 * To regenerate:
 *   pnpm generate:fixtures
 *
 * To add a new fixture set:
 *   1. Add a generator function to scripts/generate-sympy-fixtures.mjs.
 *   2. Add a corresponding type + loader here.
 *   3. Commit both the updated script and the new JSON file.
 *
 * Usage in tests:
 *   import { vectorFixture, matrixFixture } from "../../tests/sympy-reference";
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const FIXTURES = resolve(import.meta.dirname ?? __dirname, "fixtures/sympy");

/** @internal exported for testing the error-path only. */
export function loadFixtureJson<T>(name: string): T {
  return loadJson<T>(name);
}

function loadJson<T>(name: string): T {
  const path = resolve(FIXTURES, `${name}.json`);
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    throw new Error(
      `SymPy fixture "${name}" not found at ${path}. Run \`pnpm generate:fixtures\` to regenerate.`,
    );
  }
  return JSON.parse(raw) as T;
}

// ──────────────────────────────────────────────────────────────────────────
// la.vector fixture types
// ──────────────────────────────────────────────────────────────────────────

export type VectorCase = {
  a: number[];
  b: number[];
  dot: number;
  normASq: number;
  normBSq: number;
};

export type VectorFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: VectorCase[];
};

export function loadVectorFixture(): VectorFixture {
  return loadJson<VectorFixture>("la-vector");
}

// ──────────────────────────────────────────────────────────────────────────
// la.matrix fixture types
// ──────────────────────────────────────────────────────────────────────────

export type MatrixSquareCase = {
  A: number[][];
  B: number[][];
  v: number[];
  AB: number[][];
  Av: number[];
  At: number[][];
  trA: number;
  detA: number;
};

export type MatrixNonSquareCase = {
  A: number[][];
  B: number[][];
  AB: number[][];
};

export type MatrixFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  squareCases: MatrixSquareCase[];
  nonSquareCases: MatrixNonSquareCase[];
};

export function loadMatrixFixture(): MatrixFixture {
  return loadJson<MatrixFixture>("la-matrix");
}

// ──────────────────────────────────────────────────────────────────────────
// la.det multiplicativity fixture types
// ──────────────────────────────────────────────────────────────────────────

export type DetMultiplicativityCase = {
  A: number[][];
  B: number[][];
  detA: number;
  detB: number;
  AB: number[][];
  detAB: number;
};

export type DetMultiplicativityFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: DetMultiplicativityCase[];
};

export function loadDetMultiplicativityFixture(): DetMultiplicativityFixture {
  return loadJson<DetMultiplicativityFixture>("la-det-multiplicativity");
}

// ──────────────────────────────────────────────────────────────────────────
// la.transpose fixture types
// ──────────────────────────────────────────────────────────────────────────

export type TransposeCase = {
  A: number[][];
  At: number[][];
};

export type TransposeFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: TransposeCase[];
};

export function loadTransposeFixture(): TransposeFixture {
  return loadJson<TransposeFixture>("la-transpose");
}

// ──────────────────────────────────────────────────────────────────────────
// la.add / la.sub / la.trace fixture types
// ──────────────────────────────────────────────────────────────────────────

export type AddSubTraceCase = {
  A: number[][];
  B: number[][];
  ApB: number[][];
  AmB: number[][];
  /** Present only for square matrices. */
  trA?: number;
  /** Present only for square matrices. */
  trB?: number;
  /** Present only for square matrices. tr(A+B) = tr(A) + tr(B). */
  trApB?: number;
};

export type AddSubTraceFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: AddSubTraceCase[];
};

export function loadAddSubTraceFixture(): AddSubTraceFixture {
  return loadJson<AddSubTraceFixture>("la-add-sub-trace");
}

// ──────────────────────────────────────────────────────────────────────────
// la.inverse fixture types
// ──────────────────────────────────────────────────────────────────────────

export type InverseCase = {
  A: number[][];
  Ainv: number[][];
  detA: number;
};

export type InverseFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: InverseCase[];
};

export function loadInverseFixture(): InverseFixture {
  return loadJson<InverseFixture>("la-inverse");
}

// ──────────────────────────────────────────────────────────────────────────
// la.rref / la.rank fixture types
// ──────────────────────────────────────────────────────────────────────────

export type RrefRankCase = {
  A: number[][];
  rref: number[][];
  rank: number;
  pivots: number[];
};

export type RrefRankFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: RrefRankCase[];
};

export function loadRrefRankFixture(): RrefRankFixture {
  return loadJson<RrefRankFixture>("la-rref-rank");
}

// ──────────────────────────────────────────────────────────────────────────
// la.lu fixture types
// ──────────────────────────────────────────────────────────────────────────

export type LuCase = {
  A: number[][];
  L: number[][];
  U: number[][];
  P: number[][];
};

export type LuFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: LuCase[];
};

export function loadLuFixture(): LuFixture {
  return loadJson<LuFixture>("la-lu");
}

// ──────────────────────────────────────────────────────────────────────────
// la.qr fixture types
// ──────────────────────────────────────────────────────────────────────────

export type QrCase = {
  A: number[][];
  Q: number[][];
  R: number[][];
};

export type QrFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: QrCase[];
};

export function loadQrFixture(): QrFixture {
  return loadJson<QrFixture>("la-qr");
}

// ──────────────────────────────────────────────────────────────────────────
// la.eigen fixture types
// ──────────────────────────────────────────────────────────────────────────

export type EigenCase = {
  A: number[][];
  eigenvalues: number[];
  /** Each entry is a unit eigenvector (1-D array) for the corresponding eigenvalue. */
  eigenvectors: number[][];
};

export type EigenFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: EigenCase[];
};

export function loadEigenFixture(): EigenFixture {
  return loadJson<EigenFixture>("la-eigen");
}

// ──────────────────────────────────────────────────────────────────────────
// la.solve fixture types
// ──────────────────────────────────────────────────────────────────────────

export type SolveCase = {
  A: number[][];
  b: number[];
  x: number[];
};

export type SolveFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: SolveCase[];
};

export function loadSolveFixture(): SolveFixture {
  return loadJson<SolveFixture>("la-solve");
}

// ──────────────────────────────────────────────────────────────────────────
// la.svd fixture types
// ──────────────────────────────────────────────────────────────────────────

export type SvdCase = {
  A: number[][];
  singularValues: number[];
};

export type SvdFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: SvdCase[];
};

export function loadSvdFixture(): SvdFixture {
  return loadJson<SvdFixture>("la-svd");
}

// ──────────────────────────────────────────────────────────────────────────
// la.basis-change fixture types
// ──────────────────────────────────────────────────────────────────────────

export type BasisChangeCase = {
  T: number[][];
  P: number[][];
  result: number[][];
  /** tr(T) = tr(P⁻¹·T·P) — similarity invariant. */
  trT: number;
  /** det(T) = det(P⁻¹·T·P) — similarity invariant. */
  detT: number;
};

export type BasisChangeFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: BasisChangeCase[];
};

export function loadBasisChangeFixture(): BasisChangeFixture {
  return loadJson<BasisChangeFixture>("la-basis-change");
}

// ──────────────────────────────────────────────────────────────────────────
// la.kernel fixture types
// ──────────────────────────────────────────────────────────────────────────

export type KernelCase = {
  A: number[][];
  rank: number;
  nullity: number;
  /** K columns form a basis for ker(A). Empty array when nullity = 0. */
  K: number[][];
};

export type KernelFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: KernelCase[];
};

export function loadKernelFixture(): KernelFixture {
  return loadJson<KernelFixture>("la-kernel");
}

// ──────────────────────────────────────────────────────────────────────────
// la.image fixture types
// ──────────────────────────────────────────────────────────────────────────

export type ImageCase = {
  A: number[][];
  rank: number;
  /** Im columns form a SymPy basis for col(A). Empty array when rank = 0. */
  Im: number[][];
};

export type ImageFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: ImageCase[];
};

export function loadImageFixture(): ImageFixture {
  return loadJson<ImageFixture>("la-image");
}

// ──────────────────────────────────────────────────────────────────────────
// la.project fixture types
// ──────────────────────────────────────────────────────────────────────────

export type ProjectCase = {
  A: number[][];
  v: number[];
  /** SymPy result of A·(AᵀA)⁻¹·Aᵀ·v. */
  Pv: number[];
};

export type ProjectFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: ProjectCase[];
};

export function loadProjectFixture(): ProjectFixture {
  return loadJson<ProjectFixture>("la-project");
}

// ──────────────────────────────────────────────────────────────────────────
// stats.bernoulli fixture types
// ──────────────────────────────────────────────────────────────────────────

export type DistSample = { x: number; value: number };

export type BernoulliCase = {
  family: "Bernoulli";
  parameters: { p: number };
  moments: {
    mean: number;
    variance: number;
    m1: number;
    m2: number;
    m3: number;
    m4: number;
  };
  /** pmf at x=0 and x=1 */
  pmf: DistSample[];
  /** CDF at x=-1, 0, 0.5, 1, 2 */
  cdf: DistSample[];
};

export type BernoulliFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: BernoulliCase[];
};

export function loadBernoulliFixture(): BernoulliFixture {
  return loadJson<BernoulliFixture>("stats-bernoulli");
}

// ──────────────────────────────────────────────────────────────────────────
// stats.binomial fixture types
// ──────────────────────────────────────────────────────────────────────────

export type BinomialCase = {
  family: "Binomial";
  parameters: { n: number; p: number };
  moments: { mean: number; variance: number };
  /** pmf at x=0, x=floor(n/2), x=n */
  pmf: DistSample[];
  /** CDF at x=-1, 0, floor(n/2), n, n+1 */
  cdf: DistSample[];
};

export type BinomialFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: BinomialCase[];
};

export function loadBinomialFixture(): BinomialFixture {
  return loadJson<BinomialFixture>("stats-binomial");
}

// ──────────────────────────────────────────────────────────────────────────
// stats.uniform fixture types
// ──────────────────────────────────────────────────────────────────────────

export type UniformDistCase = {
  family: "Uniform";
  parameters: { a: number; b: number };
  moments: { mean: number; variance: number };
  /** PDF at x=a, x=(a+b)/2, x=b */
  pdf: DistSample[];
  /** CDF at x=a, x=(a+b)/2, x=b */
  cdf: DistSample[];
};

export type UniformDistFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: UniformDistCase[];
};

export function loadUniformDistFixture(): UniformDistFixture {
  return loadJson<UniformDistFixture>("stats-uniform");
}

// ──────────────────────────────────────────────────────────────────────────
// stats.normal fixture types
// ──────────────────────────────────────────────────────────────────────────

export type NormalDistCase = {
  family: "Normal";
  parameters: { mu: number; sigma: number };
  moments: { mean: number; variance: number };
  /** PDF at x=mu-sigma, x=mu, x=mu+sigma */
  pdf: DistSample[];
  /** CDF at x=mu-sigma, x=mu, x=mu+sigma */
  cdf: DistSample[];
};

export type NormalDistFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: NormalDistCase[];
};

export function loadNormalDistFixture(): NormalDistFixture {
  return loadJson<NormalDistFixture>("stats-normal");
}

// ──────────────────────────────────────────────────────────────────────────
// stats.poisson fixture types
// ──────────────────────────────────────────────────────────────────────────

export type PoissonCase = {
  family: "Poisson";
  parameters: { lambda: number };
  moments: { mean: number; variance: number };
  /** pmf at x=0, x=floor(lambda), x=floor(lambda)+1 */
  pmf: DistSample[];
  /** CDF at x=0, x=floor(lambda) */
  cdf: DistSample[];
};

export type PoissonFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: PoissonCase[];
};

export function loadPoissonFixture(): PoissonFixture {
  return loadJson<PoissonFixture>("stats-poisson");
}

// ──────────────────────────────────────────────────────────────────────────
// stats.beta fixture types
// ──────────────────────────────────────────────────────────────────────────

export type BetaDistCase = {
  family: "Beta";
  parameters: { alpha: number; beta: number };
  moments: { mean: number; variance: number };
  /** CDF at x=0, x=0.5, x=1 */
  cdf: DistSample[];
};

export type BetaDistFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: BetaDistCase[];
};

export function loadBetaDistFixture(): BetaDistFixture {
  return loadJson<BetaDistFixture>("stats-beta");
}

// ──────────────────────────────────────────────────────────────────────────
// stats.gamma fixture types
// ──────────────────────────────────────────────────────────────────────────

export type GammaDistCase = {
  family: "Gamma";
  parameters: { alpha: number; beta: number };
  moments: { mean: number; variance: number };
};

export type GammaDistFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: GammaDistCase[];
};

export function loadGammaDistFixture(): GammaDistFixture {
  return loadJson<GammaDistFixture>("stats-gamma");
}

// ──────────────────────────────────────────────────────────────────────────
// stats.posterior fixture types
// ──────────────────────────────────────────────────────────────────────────

export type PosteriorCase = {
  conjugatePair: "Beta-Bernoulli" | "Beta-Binomial" | "Normal-Normal" | "Gamma-Poisson";
  prior: { family: string; alpha?: number; beta?: number; mu?: number; sigma?: number };
  likelihood?: { family: string; sigma?: number };
  evidence: { k_hits?: number; n_obs: number; x_obs?: number };
  posterior: {
    family: string;
    alpha?: number;
    beta?: number;
    mu?: number;
    sigma?: number;
    moments: { mean: number; variance: number };
  };
};

export type PosteriorFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: PosteriorCase[];
};

export function loadPosteriorFixture(): PosteriorFixture {
  return loadJson<PosteriorFixture>("stats-posterior");
}

// ──────────────────────────────────────────────────────────────────────────
// stats.mgf fixture types
// ──────────────────────────────────────────────────────────────────────────

export type MgfCase = {
  family: string;
  parameters: Record<string, number>;
  sympyStr: string;
};

export type MgfFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: MgfCase[];
};

export function loadMgfFixture(): MgfFixture {
  return loadJson<MgfFixture>("stats-mgf");
}

// ──────────────────────────────────────────────────────────────────────────
// calc.function fixture types
// ──────────────────────────────────────────────────────────────────────────

export type CalcFunctionCase = {
  inputExpr: string;
  variable: string;
  canonical: string;
};

export type CalcFunctionFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: CalcFunctionCase[];
};

export function loadCalcFunctionFixture(): CalcFunctionFixture {
  return loadJson<CalcFunctionFixture>("calc-function");
}

// ──────────────────────────────────────────────────────────────────────────
// calc.derivative fixture types
// ──────────────────────────────────────────────────────────────────────────

export type CalcDerivativeCase = {
  expression: string;
  variable: string;
  diffVar: string;
  derivative: string;
};

export type CalcDerivativeFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: CalcDerivativeCase[];
};

export function loadCalcDerivativeFixture(): CalcDerivativeFixture {
  return loadJson<CalcDerivativeFixture>("calc-derivative");
}

// ──────────────────────────────────────────────────────────────────────────
// calc.integrate fixture types
// ──────────────────────────────────────────────────────────────────────────

export type CalcIntegrateCase = {
  expression: string;
  variable: string;
  integVar: string;
  integral: string;
};

export type CalcIntegrateFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: CalcIntegrateCase[];
};

export function loadCalcIntegrateFixture(): CalcIntegrateFixture {
  return loadJson<CalcIntegrateFixture>("calc-integrate");
}

// ──────────────────────────────────────────────────────────────────────────
// calc.limit fixture types
// ──────────────────────────────────────────────────────────────────────────

export type CalcLimitCase = {
  expression: string;
  variable: string;
  limitVar: string;
  point: string;
  limit: string;
};

export type CalcLimitFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: CalcLimitCase[];
};

export function loadCalcLimitFixture(): CalcLimitFixture {
  return loadJson<CalcLimitFixture>("calc-limit");
}

// ──────────────────────────────────────────────────────────────────────────
// calc.taylor fixture types
// ──────────────────────────────────────────────────────────────────────────

export type CalcTaylorCase = {
  expression: string;
  variable: string;
  seriesVar: string;
  center: number;
  order: number;
  taylor: string;
};

export type CalcTaylorFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: CalcTaylorCase[];
};

export function loadCalcTaylorFixture(): CalcTaylorFixture {
  return loadJson<CalcTaylorFixture>("calc-taylor");
}

// ──────────────────────────────────────────────────────────────────────────
// calc.definite-integrate fixture types
// ──────────────────────────────────────────────────────────────────────────

export type CalcDefiniteIntegrateCase = {
  expression: string;
  variable: string;
  integVar: string;
  a: number;
  b: number;
  result: number;
};

export type CalcDefiniteIntegrateFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: CalcDefiniteIntegrateCase[];
};

export function loadCalcDefiniteIntegrateFixture(): CalcDefiniteIntegrateFixture {
  return loadJson<CalcDefiniteIntegrateFixture>("calc-definite-integrate");
}

// ──────────────────────────────────────────────────────────────────────────
// calc.series fixture types
// ──────────────────────────────────────────────────────────────────────────

export type CalcSeriesCase = {
  expression: string;
  index: string;
  from: number;
  to: number;
  result: string;
  numericResult: number | null;
};

export type CalcSeriesFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: CalcSeriesCase[];
};

export function loadCalcSeriesFixture(): CalcSeriesFixture {
  return loadJson<CalcSeriesFixture>("calc-series");
}

// ──────────────────────────────────────────────────────────────────────────
// calc.gradient fixture types
// ──────────────────────────────────────────────────────────────────────────

export type CalcGradientCase = {
  expression: string;
  variables: string[];
  partials: string[];
  gradient: number[] | null;
  note?: string;
};

export type CalcGradientFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: CalcGradientCase[];
};

export function loadCalcGradientFixture(): CalcGradientFixture {
  return loadJson<CalcGradientFixture>("calc-gradient");
}

// ──────────────────────────────────────────────────────────────────────────
// calc.partial fixture types
// ──────────────────────────────────────────────────────────────────────────

export type CalcPartialCase = {
  expression: string;
  variables: string[];
  diffVar: string;
  partial: string;
};

export type CalcPartialFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: CalcPartialCase[];
};

export function loadCalcPartialFixture(): CalcPartialFixture {
  return loadJson<CalcPartialFixture>("calc-partial");
}

// ──────────────────────────────────────────────────────────────────────────
// calc.ode-solve fixture types
// ──────────────────────────────────────────────────────────────────────────

export type CalcOdeSolveCase = {
  ode: string;
  depVar: string;
  indepVar: string;
  ics: { x0: number; y0: number } | null;
  rhs: string;
  implicit: boolean;
};

export type CalcOdeSolveFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: CalcOdeSolveCase[];
};

export function loadCalcOdeSolveFixture(): CalcOdeSolveFixture {
  return loadJson<CalcOdeSolveFixture>("calc-ode-solve");
}

// ──────────────────────────────────────────────────────────────────────────
// discrete.gcd fixture types
// ──────────────────────────────────────────────────────────────────────────

export type GcdCase = {
  a: number;
  b: number;
  gcd: number;
};

export type GcdFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: GcdCase[];
};

export function loadGcdFixture(): GcdFixture {
  return loadJson<GcdFixture>("discrete-gcd");
}

// ──────────────────────────────────────────────────────────────────────────
// discrete.is-prime fixture types
// ──────────────────────────────────────────────────────────────────────────

export type PrimeCase = {
  n: number;
  isPrime: boolean;
};

export type PrimeFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: PrimeCase[];
};

export function loadPrimeFixture(): PrimeFixture {
  return loadJson<PrimeFixture>("discrete-prime");
}

// ──────────────────────────────────────────────────────────────────────────
// discrete.factor fixture types
// ──────────────────────────────────────────────────────────────────────────

export type FactorintCase = {
  n: number;
  /** Sorted [prime, exponent] pairs. Empty for n=1. */
  factors: [number, number][];
};

export type FactorintFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: FactorintCase[];
};

export function loadFactorintFixture(): FactorintFixture {
  return loadJson<FactorintFixture>("discrete-factorint");
}

// ──────────────────────────────────────────────────────────────────────────
// discrete.totient fixture types
// ──────────────────────────────────────────────────────────────────────────

export type TotientCase = {
  n: number;
  totient: number;
};

export type TotientFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: TotientCase[];
};

export function loadTotientFixture(): TotientFixture {
  return loadJson<TotientFixture>("discrete-totient");
}

// ──────────────────────────────────────────────────────────────────────────
// discrete.binomial fixture types
// ──────────────────────────────────────────────────────────────────────────

export type DiscreteBinomialCase = {
  n: number;
  k: number;
  value: number;
};

export type DiscreteBinomialFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: DiscreteBinomialCase[];
};

export function loadDiscreteBinomialFixture(): DiscreteBinomialFixture {
  return loadJson<DiscreteBinomialFixture>("discrete-binomial");
}

// ──────────────────────────────────────────────────────────────────────────
// discrete.modular fixture types
// ──────────────────────────────────────────────────────────────────────────

export type ModularInverseCase = {
  a: number;
  m: number;
  inverse: number;
};

export type ModpowCase = {
  a: number;
  b: number;
  m: number;
  result: number;
};

export type ModularFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  inverseCases: ModularInverseCase[];
  powCases: ModpowCase[];
};

export function loadModularFixture(): ModularFixture {
  return loadJson<ModularFixture>("discrete-modular");
}

// ──────────────────────────────────────────────────────────────────────────
// discrete.fibonacci fixture types
// ──────────────────────────────────────────────────────────────────────────

export type FibonacciCase = {
  n: number;
  value: number;
};

export type FibonacciFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: FibonacciCase[];
};

export function loadFibonacciFixture(): FibonacciFixture {
  return loadJson<FibonacciFixture>("discrete-fibonacci");
}

// ──────────────────────────────────────────────────────────────────────────
// geom.distance fixture types
// ──────────────────────────────────────────────────────────────────────────

export type GeomRational = { n: number; d: number };

export type GeomPointPointCase = {
  p1: [number, number];
  p2: [number, number];
  distSq: number;
};

export type GeomPointLineCase = {
  point: [number, number];
  line: { p1: [number, number]; p2: [number, number] };
  distN: number;
  distD: number;
  note?: string;
};

export type GeomDistanceFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  pointPointCases: GeomPointPointCase[];
  pointLineCases: GeomPointLineCase[];
};

export function loadGeomDistanceFixture(): GeomDistanceFixture {
  return loadJson<GeomDistanceFixture>("geom-distance");
}

// ──────────────────────────────────────────────────────────────────────────
// geom.intersection fixture types
// ──────────────────────────────────────────────────────────────────────────

export type GeomLineSpec = { p1: [number, number]; p2: [number, number] };

export type GeomLineLineCase = {
  l1: GeomLineSpec;
  l2: GeomLineSpec;
  intersectionX: GeomRational;
  intersectionY: GeomRational;
  note?: string;
};

export type GeomParallelCase = {
  l1: GeomLineSpec;
  l2: GeomLineSpec;
  parallel: boolean;
  note?: string;
};

export type GeomLineCircleCase = {
  center: [number, number];
  radius: number;
  line: GeomLineSpec;
  intersectionCount: number;
  intersections: Array<{ x: GeomRational; y: GeomRational }>;
  note?: string;
};

export type GeomIntersectionFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  lineLineCases: GeomLineLineCase[];
  parallelLinesCases: GeomParallelCase[];
  lineCircleCases: GeomLineCircleCase[];
};

export function loadGeomIntersectionFixture(): GeomIntersectionFixture {
  return loadJson<GeomIntersectionFixture>("geom-intersection");
}

// ──────────────────────────────────────────────────────────────────────────
// geom.transformation fixture types
// ──────────────────────────────────────────────────────────────────────────

export type GeomPointResult = { x: GeomRational; y: GeomRational };

export type GeomTranslationCase = {
  point: [number, number];
  dx: number;
  dy: number;
  result: GeomPointResult;
  note?: string;
};

export type GeomReflectionCase = {
  point: [number, number];
  axis: "x" | "y" | "y=x" | "y=-x";
  result: GeomPointResult;
  note?: string;
};

export type GeomRotation90Case = {
  point: [number, number];
  angleDeg: number;
  result: GeomPointResult;
  note?: string;
};

export type GeomTransformationFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  translationCases: GeomTranslationCase[];
  reflectionCases: GeomReflectionCase[];
  rotation90Cases: GeomRotation90Case[];
};

export function loadGeomTransformationFixture(): GeomTransformationFixture {
  return loadJson<GeomTransformationFixture>("geom-transformation");
}

// ──────────────────────────────────────────────────────────────────────────
// geom.area fixture types
// ──────────────────────────────────────────────────────────────────────────

export type GeomTriangleAreaCase = {
  vertices: [[number, number], [number, number], [number, number]];
  areaN: number;
  areaD: number;
  note?: string;
};

export type GeomPolygonAreaCase = {
  vertices: Array<[number, number]>;
  areaN: number;
  areaD: number;
  note?: string;
};

export type GeomCircleAreaCase = {
  center: [number, number];
  radius: number;
  rSq: number;
  note?: string;
};

export type GeomAreaFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  triangleAreaCases: GeomTriangleAreaCase[];
  polygonAreaCases: GeomPolygonAreaCase[];
  circleAreaCases: GeomCircleAreaCase[];
};

export function loadGeomAreaFixture(): GeomAreaFixture {
  return loadJson<GeomAreaFixture>("geom-area");
}
