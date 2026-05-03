// Main-thread client for the Pyodide worker.
//
// Phase-0 contract:
//   - Importing this module MUST NOT spawn the worker. The worker is
//     created lazily on the first `init()` call so a page that never
//     touches symbolic math never pays the runtime download cost.
//   - `isReady()` is safe to call at any time and returns `false` until
//     `init()` has been called and resolved.

import * as Comlink from "comlink";
import type { WorkerApi } from "./pyodide.worker";

let proxy: Comlink.Remote<WorkerApi> | null = null;

function ensureProxy(): Comlink.Remote<WorkerApi> {
  if (proxy !== null) return proxy;
  if (typeof Worker === "undefined") {
    throw new Error(
      "Pyodide client: Worker is not available in this environment. " +
        "The Pyodide engine only runs in a browser.",
    );
  }
  const worker = new Worker(new URL("./pyodide.worker.ts", import.meta.url), {
    type: "module",
    name: "pyodide",
  });
  proxy = Comlink.wrap<WorkerApi>(worker);
  return proxy;
}

export async function init(): Promise<void> {
  await ensureProxy().init();
}

export async function isReady(): Promise<boolean> {
  if (proxy === null) return false;
  return proxy.isReady();
}

export async function sympify(expression: string, variables: string[]): Promise<string> {
  return ensureProxy().sympify(expression, variables);
}

export async function diff(
  expression: string,
  variables: string[],
  diffVar: string,
): Promise<string> {
  return ensureProxy().diff(expression, variables, diffVar);
}

export async function integrate(
  expression: string,
  variables: string[],
  integVar: string,
): Promise<string> {
  return ensureProxy().integrate(expression, variables, integVar);
}

export async function definiteIntegrate(
  expression: string,
  variables: string[],
  integVar: string,
  a: number,
  b: number,
): Promise<number> {
  return ensureProxy().definiteIntegrate(expression, variables, integVar, a, b);
}

export async function limit(
  expression: string,
  variables: string[],
  limitVar: string,
  point: number | string,
): Promise<string> {
  return ensureProxy().limit(expression, variables, limitVar, point);
}

export async function taylor(
  expression: string,
  variables: string[],
  seriesVar: string,
  center: number,
  order: number,
): Promise<string> {
  return ensureProxy().taylor(expression, variables, seriesVar, center, order);
}

export async function mgf(family: string, parameters: Record<string, number>): Promise<string> {
  return ensureProxy().mgf(family, parameters);
}

// Test-only: reset module state. Vitest can call this between tests
// to ensure the lazy-spawn invariant is checked from a clean slate.
export function __resetForTests(): void {
  proxy = null;
}
