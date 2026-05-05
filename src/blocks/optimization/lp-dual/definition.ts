import type { BlockDefinition } from "~/blocks/types";
import type { MathValue, MatrixPayload, VectorPayload } from "~/math/types";

export class LpDualError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LpDualError";
  }
}

const LP_TYPE = {
  kind: "Tuple" as const,
  elements: [
    { kind: "Vector" as const, n: "any" as const, field: "real" as const },
    { kind: "Matrix" as const, m: "any" as const, n: "any" as const, field: "real" as const },
    { kind: "Vector" as const, n: "any" as const, field: "real" as const },
  ],
};

function makeVector(values: ReadonlyArray<number>, blockId: string): MathValue {
  return {
    type: { kind: "Vector", n: values.length, field: "real" },
    payload: values as VectorPayload,
    provenance: { blockId, inputs: [], computedAt: Date.now(), engine: "native" },
  };
}

function makeMatrix(rows: ReadonlyArray<ReadonlyArray<number>>, blockId: string): MathValue {
  return {
    type: {
      kind: "Matrix",
      m: rows.length,
      n: rows[0]?.length ?? 0,
      field: "real",
    },
    payload: rows as MatrixPayload,
    provenance: { blockId, inputs: [], computedAt: Date.now(), engine: "native" },
  };
}

export const LpDualBlock: BlockDefinition = {
  id: "opt.lp-dual",
  label: "LP Dual",
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
      label: "LP (primal)",
      type: LP_TYPE,
    },
  ],
  outputs: [
    {
      id: "dual",
      label: "Dual LP",
      type: LP_TYPE,
    },
  ],
  compute(inputs): MathValue {
    const lp = inputs.lp;
    if (lp === undefined) throw new LpDualError("opt.lp-dual: LP input is required");

    const [cVal, AVal, bVal] = lp.payload as [MathValue, MathValue, MathValue];
    if (cVal === undefined || AVal === undefined || bVal === undefined) {
      throw new LpDualError("opt.lp-dual: LP Tuple must contain (c, A, b)");
    }

    const c = cVal.payload as ReadonlyArray<number>;
    const A = AVal.payload as ReadonlyArray<ReadonlyArray<number>>;
    const b = bVal.payload as ReadonlyArray<number>;

    const m = b.length; // primal constraints → dual variables
    const n = c.length; // primal variables → dual constraints

    // Dual LP: max b^T y s.t. A^T y ≤ c, y ≥ 0
    // In minimization form: min (-b)^T y s.t. A^T y ≤ c, y ≥ 0
    //   dual_c = -b  (length m)
    //   dual_A = A^T  (n × m)
    //   dual_b = c   (length n)

    const dualC = Array.from({ length: m }, (_, i) => -(b[i] ?? 0));

    const dualA: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: m }, (__, j) => A[j]?.[i] ?? 0),
    );

    const dualB = Array.from({ length: n }, (_, i) => c[i] ?? 0);

    const dualCVal = makeVector(dualC, "opt.lp-dual");
    const dualAVal = makeMatrix(dualA, "opt.lp-dual");
    const dualBVal = makeVector(dualB, "opt.lp-dual");

    return {
      type: {
        kind: "Tuple",
        elements: [
          { kind: "Vector", n: m, field: "real" },
          { kind: "Matrix", m: n, n: m, field: "real" },
          { kind: "Vector", n, field: "real" },
        ],
      },
      payload: [dualCVal, dualAVal, dualBVal],
      provenance: {
        blockId: "opt.lp-dual",
        inputs: ["lp"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Computes the dual LP of a primal linear program. Primal: minimize cᵀx s.t. Ax ≤ b, x ≥ 0. Dual: minimize (-b)ᵀy s.t. Aᵀy ≤ c, y ≥ 0. Strong duality: optimal primal and dual values are equal.",
    why: "The dual LP provides an upper bound on the primal objective (weak duality) and, by strong duality, the same optimal value. Dual variables are shadow prices — the marginal value of relaxing each constraint.",
    effect: (inputs) => {
      if (inputs.lp === undefined) return "Connect a primal LP (from opt.lp-standard) to port lp.";
      const [cVal, , bVal] = inputs.lp.payload as [MathValue, MathValue, MathValue];
      const n = cVal ? (cVal.payload as VectorPayload).length : 0;
      const m = bVal ? (bVal.payload as VectorPayload).length : 0;
      return `Dual LP: ${m} dual vars, ${n} dual constraints. Wire to opt.simplex to solve.`;
    },
    impact: (_inputs, output) => {
      const elements = output.type.kind === "Tuple" ? output.type.elements : [];
      const cType = elements[0];
      const bType = elements[2];
      const m = cType?.kind === "Vector" && typeof cType.n === "number" ? cType.n : "?";
      const n = bType?.kind === "Vector" && typeof bType.n === "number" ? bType.n : "?";
      return `Dual LP(${m} vars, ${n} constraints). Optimal dual value = optimal primal value.`;
    },
  },
};
