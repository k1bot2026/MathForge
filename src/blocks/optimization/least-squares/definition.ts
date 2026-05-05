import { det, lusolve, multiply, transpose } from "mathjs";
import type { BlockDefinition } from "~/blocks/types";
import type { MathValue } from "~/math/types";

export class LeastSquaresError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeastSquaresError";
  }
}

const EPS = 1e-10;

export const LeastSquaresBlock: BlockDefinition = {
  id: "opt.least-squares",
  label: "Least Squares",
  symbol: "‖Ax−b‖²",
  category: "operation",
  domain: "optimization",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    {
      id: "A",
      label: "A (matrix)",
      type: { kind: "Matrix", m: "any", n: "any", field: "real" },
    },
    {
      id: "b",
      label: "b (right-hand side)",
      type: { kind: "Vector", n: "any", field: "real" },
    },
  ],
  outputs: [
    {
      id: "x",
      label: "x (least-squares solution)",
      type: { kind: "Vector", n: "any", field: "real" },
    },
  ],
  params: {},
  compute(inputs): MathValue {
    const Aval = inputs.A;
    const bVal = inputs.b;

    if (Aval === undefined) throw new LeastSquaresError("opt.least-squares: matrix A is required");
    if (bVal === undefined) throw new LeastSquaresError("opt.least-squares: vector b is required");

    const A = Aval.payload as ReadonlyArray<ReadonlyArray<number>>;
    const b = bVal.payload as ReadonlyArray<number>;

    const m = A.length;
    const n = A[0]?.length ?? 0;

    if (b.length !== m) {
      throw new LeastSquaresError(
        `opt.least-squares: dimension mismatch — A has ${m} rows but b has ${b.length} elements`,
      );
    }
    if (m < n) {
      throw new LeastSquaresError(
        `opt.least-squares: underdetermined system (${m} rows, ${n} columns); need m ≥ n for unique least-squares solution`,
      );
    }

    // Normal equations: (AᵀA) x = Aᵀb
    const At = transpose(A as number[][]) as number[][];
    const AtA = multiply(At, A as number[][]) as number[][];
    const Atb = multiply(At, b as number[]) as number[];

    const d = det(AtA) as number;
    if (Math.abs(d) < EPS) {
      throw new LeastSquaresError(
        "opt.least-squares: A is rank-deficient (columns are linearly dependent); normal equations singular",
      );
    }

    const raw = lusolve(AtA, Atb) as number[][];
    const x = raw.map((row) => row[0] ?? 0);

    return {
      type: { kind: "Vector", n, field: "real" },
      payload: x,
      provenance: {
        blockId: "opt.least-squares",
        inputs: ["A", "b"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Solves the least-squares problem min ‖Ax − b‖² using the normal equations (AᵀA)x = Aᵀb. When A is square and full-rank, this is the exact solution; when m > n, it is the best fit.",
    why: "Least-squares is the foundational tool for data fitting. It generalises opt.linear-regression (just pass the design matrix directly). Used for curve fitting, signal processing, and parameter estimation in physics and engineering.",
    effect: (inputs) => {
      if (inputs.A === undefined || inputs.b === undefined) return "Connect matrix A and vector b.";
      const A = inputs.A.payload as ReadonlyArray<ReadonlyArray<number>>;
      const m = A.length;
      const n = A[0]?.length ?? 0;
      return `Solving ${m}×${n} least-squares system...`;
    },
    impact: (_inputs, output) => {
      const x = output.payload as ReadonlyArray<number>;
      return `x = [${x.map((v) => v.toPrecision(6)).join(", ")}]`;
    },
  },
};
