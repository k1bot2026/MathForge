import type { BlockDefinition } from "~/blocks/types";
import type { MathValue, MatrixPayload, VectorPayload } from "~/math/types";
import { SimplexError, solveLP } from "./compute";

export { SimplexError };

const LP_TYPE = {
  kind: "Tuple" as const,
  elements: [
    { kind: "Vector" as const, n: "any" as const, field: "real" as const },
    { kind: "Matrix" as const, m: "any" as const, n: "any" as const, field: "real" as const },
    { kind: "Vector" as const, n: "any" as const, field: "real" as const },
  ],
};

function makeScalar(v: number): MathValue {
  return {
    type: { kind: "Scalar", field: "real", precision: "approximate" },
    payload: v,
    provenance: { blockId: "opt.simplex", inputs: [], computedAt: Date.now(), engine: "native" },
  };
}

function makeVector(vals: ReadonlyArray<number>): MathValue {
  return {
    type: { kind: "Vector", n: vals.length, field: "real" },
    payload: vals as VectorPayload,
    provenance: { blockId: "opt.simplex", inputs: [], computedAt: Date.now(), engine: "native" },
  };
}

export const SimplexBlock: BlockDefinition = {
  id: "opt.simplex",
  label: "Simplex",
  symbol: "LP*",
  category: "operation",
  domain: "optimization",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    {
      id: "lp",
      label: "LP",
      type: LP_TYPE,
    },
  ],
  outputs: [
    {
      id: "result",
      label: "Result",
      type: {
        kind: "Tuple",
        elements: [
          { kind: "Vector", n: "any", field: "real" },
          { kind: "Scalar", field: "real", precision: "approximate" },
        ],
      },
    },
  ],
  compute(inputs): MathValue {
    const lp = inputs.lp;
    if (lp === undefined) throw new SimplexError("opt.simplex: LP input is required");

    const [cVal, AVal, bVal] = lp.payload as [MathValue, MathValue, MathValue];
    if (cVal === undefined || AVal === undefined || bVal === undefined) {
      throw new SimplexError("opt.simplex: LP Tuple must contain (c, A, b)");
    }

    const c = cVal.payload as VectorPayload;
    const A = AVal.payload as MatrixPayload;
    const b = bVal.payload as VectorPayload;

    const { x, objectiveValue } = solveLP(
      c as ReadonlyArray<number>,
      A as ReadonlyArray<ReadonlyArray<number>>,
      b as ReadonlyArray<number>,
    );

    const xVec = makeVector(x);
    const objScalar = makeScalar(objectiveValue);

    return {
      type: {
        kind: "Tuple",
        elements: [
          { kind: "Vector", n: x.length, field: "real" },
          { kind: "Scalar", field: "real", precision: "approximate" },
        ],
      },
      payload: [xVec, objScalar],
      provenance: {
        blockId: "opt.simplex",
        inputs: ["lp"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Solves a linear program in standard form using Dantzig's simplex method with Bland's pivot rule. Returns the optimal solution vector x and optimal objective value cᵀx.",
    why: "The simplex method is the standard algorithm for LP — efficient in practice despite exponential worst-case. Bland's rule guarantees termination by preventing cycling.",
    effect: (inputs) => {
      if (inputs.lp === undefined) return "Connect an LP (from opt.lp-standard) to port lp.";
      return "Solving LP via simplex...";
    },
    impact: (_inputs, output) => {
      const [xOut, objOut] = output.payload as [MathValue, MathValue];
      const n = xOut ? (xOut.payload as VectorPayload).length : 0;
      const val = objOut ? (objOut.payload as number) : 0;
      return `Optimal x ∈ ℝ${n}, objective value = ${val.toPrecision(6)}.`;
    },
  },
};
