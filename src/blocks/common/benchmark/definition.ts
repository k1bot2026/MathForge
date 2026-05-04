import type { BlockDefinition } from "~/blocks/types";
import type { FunctionPayload, MathType } from "~/math/types";
import { BenchmarkError, runBenchmark } from "./compute";

const fnType: MathType = {
  kind: "Function",
  arity: 1,
  domain: { kind: "Scalar", field: "real", precision: "approximate" },
  codomain: { kind: "Scalar", field: "real", precision: "approximate" },
};

const scalarReal: MathType = { kind: "Scalar", field: "real", precision: "approximate" };
const scalarMs: MathType = { kind: "Scalar", field: "real", precision: "approximate" };

export const BenchmarkBlock: BlockDefinition = {
  id: "core.benchmark",
  label: "Benchmark",
  symbol: "⏱",
  category: "operation",
  domain: "common",
  determinism: "stochastic",
  stability: "experimental",
  engine: "native",
  color: "control",
  inputs: [
    { id: "fn", label: "f(x)", type: fnType },
    { id: "x", label: "x (eval point)", type: scalarReal, required: false },
  ],
  outputs: [{ id: "ms_per_call", label: "ms / call", type: scalarMs }],
  params: {
    samples: { kind: "integer", default: 10, min: 1, label: "Samples" },
    warmup: { kind: "integer", default: 2, min: 0, label: "Warmup" },
  },
  compute(inputs, params) {
    const fn = inputs.fn;
    if (fn === undefined) {
      throw new BenchmarkError("core.benchmark requires a Function on the fn port");
    }
    if (fn.type.kind !== "Function") {
      throw new BenchmarkError("core.benchmark: fn input must be a Function value");
    }

    const payload = fn.payload as FunctionPayload;
    const xVal =
      inputs.x !== undefined && inputs.x.type.kind === "Scalar" ? (inputs.x.payload as number) : 0;

    const samples = typeof params.samples === "number" ? Math.floor(params.samples) : 10;
    const warmup = typeof params.warmup === "number" ? Math.floor(params.warmup) : 2;

    const msPerCall = runBenchmark(payload, xVal, samples, warmup);

    return {
      type: scalarMs,
      payload: msPerCall,
      provenance: {
        blockId: "core.benchmark",
        inputs: ["fn"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Measures the mean wall-clock time (ms) to evaluate a Function at a point.",
    why: "Use to profile how expensive a mathematical expression is to evaluate numerically.",
    effect: (_inputs, output) => {
      const ms = output.payload as number;
      return `${ms.toFixed(4)} ms per call`;
    },
  },
};
