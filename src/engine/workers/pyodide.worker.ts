// Pyodide Web Worker — Phase-1 scaffold + Phase-3 MGF extension.
//
// Phase-0 contract:
//   - This module is loaded ONLY when a Worker is spawned for it
//     (`new Worker(new URL("./pyodide.worker.ts", import.meta.url))`).
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
   * Computes the moment generating function M_X(t) = E[e^{tX}] symbolically
   * via SymPy for the given distribution family and parameters.
   *
   * Returns the MGF as a SymPy-stringified expression in terms of `t`.
   * Throws if the family is unsupported or SymPy fails.
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
from sympy import symbols, exp, sqrt, Rational, simplify, pi
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
from sympy import symbols, Rational
t = symbols('t')
p = Rational('${p}')
mgf = 1 - p + p * __import__('sympy').exp(t)
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
from sympy import symbols, exp, Rational
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
from sympy import symbols, exp, Rational
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
from sympy import symbols, Rational
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
from sympy import symbols, Rational
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
from sympy import symbols, exp, hyper, Rational, factorial
t = symbols('t')
alpha = ${alpha}
beta = ${beta}
# M_X(t) = 1F1(alpha; alpha+beta; t) hypergeometric
from sympy import hyper
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
