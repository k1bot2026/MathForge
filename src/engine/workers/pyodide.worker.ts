// Pyodide Web Worker — Phase-1 scaffold + Phase-3 MGF + Phase-4 Calculus.
//
// Phase-0 contract:
//   - This module is loaded ONLY when a Worker is spawned for it.
//   - `loadPyodide()` is dynamic-imported inside `init()` so that the
//     ~10 MB Pyodide runtime is fetched only when something explicitly
//     calls into the worker — never on app start.

import * as Comlink from "comlink";

type PyodideInterface = {
  runPython: (code: string) => unknown;
  loadPackage: (packages: string[]) => Promise<unknown>;
};

let pyodideInstance: PyodideInterface | null = null;
let sympyLoaded = false;

async function ensurePyodide(): Promise<PyodideInterface> {
  if (pyodideInstance !== null) return pyodideInstance;
  const { loadPyodide } = await import("pyodide");
  pyodideInstance = (await loadPyodide()) as unknown as PyodideInterface;
  return pyodideInstance;
}

async function ensureSympy(): Promise<PyodideInterface> {
  const py = await ensurePyodide();
  if (!sympyLoaded) {
    await py.loadPackage(["sympy"]);
    sympyLoaded = true;
  }
  return py;
}

const workerApi = {
  async init(): Promise<void> {
    await ensurePyodide();
  },

  isReady(): boolean {
    return pyodideInstance !== null;
  },

  /**
   * Validates and normalises an expression string via SymPy sympify().
   * Returns the canonical SymPy str() form, or throws if the expression
   * is syntactically invalid or references undefined symbols.
   *
   * variables: declared symbolic variable names (e.g. ["x"]).
   */
  async sympify(expression: string, variables: string[]): Promise<string> {
    const py = await ensureSympy();
    const varDecl = variables.map((v) => `${v} = symbols('${v}')`).join("\n");
    const code = `
from sympy import symbols, sympify
${varDecl}
_expr = sympify(${JSON.stringify(expression)})
str(_expr)
`.trim();
    const result = py.runPython(code);
    if (typeof result !== "string") {
      throw new Error(`sympify returned unexpected type: ${typeof result}`);
    }
    return result;
  },

  /**
   * Computes the symbolic derivative df/dvar via SymPy diff().
   * Returns the canonical SymPy str() form of the derivative.
   */
  async diff(expression: string, variables: string[], diffVar: string): Promise<string> {
    const py = await ensureSympy();
    const varDecl = variables.map((v) => `${v} = symbols('${v}')`).join("\n");
    const code = `
from sympy import symbols, sympify, diff
${varDecl}
_expr = sympify(${JSON.stringify(expression)})
_result = diff(_expr, ${diffVar})
str(_result)
`.trim();
    const result = py.runPython(code);
    if (typeof result !== "string") {
      throw new Error(`diff returned unexpected type: ${typeof result}`);
    }
    return result;
  },

  /**
   * Computes the indefinite integral ∫f dvar via SymPy integrate().
   * Returns the canonical SymPy str() form (no constant of integration).
   */
  async integrate(expression: string, variables: string[], integVar: string): Promise<string> {
    const py = await ensureSympy();
    const varDecl = variables.map((v) => `${v} = symbols('${v}')`).join("\n");
    const code = `
from sympy import symbols, sympify, integrate
${varDecl}
_expr = sympify(${JSON.stringify(expression)})
_result = integrate(_expr, ${integVar})
str(_result)
`.trim();
    const result = py.runPython(code);
    if (typeof result !== "string") {
      throw new Error(`integrate returned unexpected type: ${typeof result}`);
    }
    return result;
  },

  /**
   * Computes the definite integral ∫_a^b f dvar via SymPy integrate().
   * Returns the numeric result as a float string.
   */
  async definiteIntegrate(
    expression: string,
    variables: string[],
    integVar: string,
    a: number,
    b: number,
  ): Promise<number> {
    const py = await ensureSympy();
    const varDecl = variables.map((v) => `${v} = symbols('${v}')`).join("\n");
    const code = `
from sympy import symbols, sympify, integrate, N
${varDecl}
_expr = sympify(${JSON.stringify(expression)})
_result = integrate(_expr, (${integVar}, ${a}, ${b}))
float(N(_result))
`.trim();
    const result = py.runPython(code);
    if (typeof result !== "number") {
      throw new Error(`definiteIntegrate returned unexpected type: ${typeof result}`);
    }
    return result;
  },

  /**
   * Computes the limit lim_{limitVar → point} f via SymPy limit().
   * Returns the canonical SymPy str() form.
   */
  async limit(
    expression: string,
    variables: string[],
    limitVar: string,
    point: number | string,
  ): Promise<string> {
    const py = await ensureSympy();
    const varDecl = variables.map((v) => `${v} = symbols('${v}')`).join("\n");
    const pointStr = typeof point === "string" ? point : String(point);
    const code = `
from sympy import symbols, sympify, limit, oo, zoo
${varDecl}
_expr = sympify(${JSON.stringify(expression)})
_result = limit(_expr, ${limitVar}, ${pointStr})
str(_result)
`.trim();
    const result = py.runPython(code);
    if (typeof result !== "string") {
      throw new Error(`limit returned unexpected type: ${typeof result}`);
    }
    return result;
  },

  /**
   * Computes the Taylor series of f around center up to order n.
   * Returns the canonical SymPy str() form of the series polynomial.
   */
  async taylor(
    expression: string,
    variables: string[],
    seriesVar: string,
    center: number,
    order: number,
  ): Promise<string> {
    const py = await ensureSympy();
    const varDecl = variables.map((v) => `${v} = symbols('${v}')`).join("\n");
    const code = `
from sympy import symbols, sympify, series, O
${varDecl}
_expr = sympify(${JSON.stringify(expression)})
_s = series(_expr, ${seriesVar}, ${center}, ${order + 1}).removeO()
str(_s)
`.trim();
    const result = py.runPython(code);
    if (typeof result !== "string") {
      throw new Error(`taylor returned unexpected type: ${typeof result}`);
    }
    return result;
  },

  /**
   * Computes the moment generating function M_X(t) = E[e^{tX}] symbolically
   * via SymPy for the given distribution family and parameters.
   */
  async mgf(family: string, parameters: Record<string, number>): Promise<string> {
    const py = await ensureSympy();
    const pyCode = buildMgfCode(family, parameters);
    const result = py.runPython(pyCode);
    if (typeof result !== "string") {
      throw new Error(`MGF computation returned unexpected type: ${typeof result}`);
    }
    return result;
  },
};

function buildMgfCode(family: string, params: Record<string, number>): string {
  switch (family) {
    case "Normal": {
      const mu = params.mu ?? 0;
      const sigma = params.sigma ?? 1;
      return `
from sympy import symbols, exp
t = symbols('t')
mu = ${mu}
sigma = ${sigma}
mgf = exp(mu * t + sigma**2 * t**2 / 2)
str(mgf)
`.trim();
    }
    case "Bernoulli": {
      const p = params.p ?? 0.5;
      return `
from sympy import symbols, Rational, exp
t = symbols('t')
p = Rational('${p}')
mgf = 1 - p + p * exp(t)
str(mgf)
`.trim();
    }
    case "Binomial": {
      const n = Math.round(params.n ?? 1);
      const p = params.p ?? 0.5;
      return `
from sympy import symbols, Rational, exp
t = symbols('t')
n = ${n}
p = Rational('${p}')
mgf = (1 - p + p * exp(t))**n
str(mgf)
`.trim();
    }
    case "Poisson": {
      const lambda_ = params.lambda ?? 1;
      return `
from sympy import symbols, exp
t = symbols('t')
lam = ${lambda_}
mgf = exp(lam * (exp(t) - 1))
str(mgf)
`.trim();
    }
    case "Uniform": {
      const a = params.a ?? 0;
      const b = params.b ?? 1;
      return `
from sympy import symbols, exp
t = symbols('t')
a = ${a}
b = ${b}
mgf = (exp(b*t) - exp(a*t)) / ((b - a) * t)
str(mgf)
`.trim();
    }
    case "Exponential": {
      const lambda_ = params.lambda ?? 1;
      return `
from sympy import symbols
t = symbols('t')
lam = ${lambda_}
mgf = lam / (lam - t)
str(mgf)
`.trim();
    }
    case "Gamma": {
      const alpha = params.alpha ?? 1;
      const beta = params.beta ?? 1;
      return `
from sympy import symbols
t = symbols('t')
alpha = ${alpha}
beta = ${beta}
mgf = (1 - t/beta)**(-alpha)
str(mgf)
`.trim();
    }
    case "Beta": {
      const alpha = params.alpha ?? 1;
      const beta = params.beta ?? 1;
      return `
from sympy import symbols, hyper
t = symbols('t')
alpha = ${alpha}
beta = ${beta}
mgf = hyper([alpha], [alpha + beta], t)
str(mgf)
`.trim();
    }
    default:
      throw new Error(`stats.mgf: unsupported distribution family "${family}"`);
  }
}

export type WorkerApi = typeof workerApi;

Comlink.expose(workerApi);
