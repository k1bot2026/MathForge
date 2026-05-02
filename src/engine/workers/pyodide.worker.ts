// Pyodide Web Worker — scaffold only.
//
// Phase-0 contract:
//   - This module is loaded ONLY when a Worker is spawned for it
//     (`new Worker(new URL("./pyodide.worker.ts", import.meta.url))`).
//   - `loadPyodide()` is dynamic-imported inside `init()` so that the
//     ~10 MB Pyodide runtime is fetched only when something explicitly
//     calls into the worker — never on app start.
//
// Phase-1 will extend the API with `evaluate(expr)`, `simplify(expr)`,
// `matmul(A, B)`, etc., plus the IndexedDB result cache.

import * as Comlink from "comlink";

let pyodideInstance: unknown = null;

const workerApi = {
  async init(): Promise<void> {
    if (pyodideInstance !== null) return;
    const { loadPyodide } = await import("pyodide");
    pyodideInstance = await loadPyodide();
  },
  isReady(): boolean {
    return pyodideInstance !== null;
  },
};

export type WorkerApi = typeof workerApi;

Comlink.expose(workerApi);
