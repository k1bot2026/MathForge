// opt.lp-standard — LP instance builder.
//
// Payload design choice (surfaced per backlog instruction):
//
// Option A (chosen): Tuple<Vector(c), Matrix(A,m,n), Vector(b,m)>
//   Pros: zero new MathType kinds, composes directly with la.* (e.g., la.matvec
//   to verify Ax ≤ b manually), canConnect rules unchanged, Tuple convention
//   mirrors BLOCK_AUTHORING_GUIDE §3a.
//   Cons: downstream opt.simplex must unpack the Tuple by position (not by name).
//
// Option B (rejected): new { kind: "LPInstance" } MathType
//   Pros: named fields (c, A, b) are self-documenting at connection points.
//   Cons: requires types.ts + canConnect extension, more machinery for a
//   format only consumed by 3-4 blocks; premature before we know if LP
//   extends (e.g., integer constraints, equality constraints).
//
// Decision: Tuple for now. If Phase 7 grows beyond simplex/dual/feasible-region
// the named-payload path can be revisited with a proper ADR.

import type { BlockDefinition } from "~/blocks/types";
import type { MathValue, MatrixPayload, VectorPayload } from "~/math/types";

export class LpStandardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LpStandardError";
  }
}

const VECTOR_TYPE = { kind: "Vector" as const, n: "any" as const, field: "real" as const };
const MATRIX_TYPE = {
  kind: "Matrix" as const,
  m: "any" as const,
  n: "any" as const,
  field: "real" as const,
};

export const LpStandardBlock: BlockDefinition = {
  id: "opt.lp-standard",
  label: "LP (Standard Form)",
  symbol: "LP",
  category: "source",
  domain: "optimization",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    { id: "c", label: "c (cost)", type: VECTOR_TYPE },
    { id: "A", label: "A (constraints)", type: MATRIX_TYPE },
    { id: "b", label: "b (RHS)", type: VECTOR_TYPE },
  ],
  outputs: [
    {
      id: "lp",
      label: "LP",
      type: {
        kind: "Tuple",
        elements: [VECTOR_TYPE, MATRIX_TYPE, VECTOR_TYPE],
      },
    },
  ],
  compute(inputs): MathValue {
    const c = inputs.c;
    const A = inputs.A;
    const b = inputs.b;

    if (c === undefined) throw new LpStandardError("opt.lp-standard: c (cost vector) is required");
    if (A === undefined)
      throw new LpStandardError("opt.lp-standard: A (constraint matrix) is required");
    if (b === undefined) throw new LpStandardError("opt.lp-standard: b (RHS vector) is required");

    const cVec = c.payload as VectorPayload;
    const AMat = A.payload as MatrixPayload;
    const bVec = b.payload as VectorPayload;

    const n = cVec.length;
    const m = bVec.length;

    if (AMat.length !== m) {
      throw new LpStandardError(
        `opt.lp-standard: A has ${AMat.length} rows but b has ${m} entries — must match`,
      );
    }

    const firstRow = AMat[0];
    if (firstRow !== undefined && firstRow.length !== n) {
      throw new LpStandardError(
        `opt.lp-standard: A has ${firstRow.length} columns but c has ${n} entries — must match`,
      );
    }

    return {
      type: {
        kind: "Tuple",
        elements: [
          { kind: "Vector", n, field: "real" },
          { kind: "Matrix", m, n, field: "real" },
          { kind: "Vector", n: m, field: "real" },
        ],
      },
      payload: [c, A, b],
      provenance: {
        blockId: "opt.lp-standard",
        inputs: ["c", "A", "b"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Packages a linear program in standard form: minimize cᵀx subject to Ax ≤ b, x ≥ 0. Outputs a Tuple(c, A, b) for downstream opt.simplex.",
    why: "Standard form is the canonical representation for LP solvers. Separating problem definition from solution lets you wire the same LP instance into multiple solvers or the dual formulation.",
    effect: (inputs) => {
      const c = inputs.c;
      const A = inputs.A;
      const b = inputs.b;
      if (c === undefined || A === undefined || b === undefined)
        return "Connect cost vector c, constraint matrix A, and RHS vector b.";
      const n = (c.payload as VectorPayload).length;
      const m = (b.payload as VectorPayload).length;
      return `LP: minimize cᵀx, subject to Ax ≤ b. Variables: ${n}, constraints: ${m}.`;
    },
    impact: (_inputs, output) => {
      const elements = output.type.kind === "Tuple" ? output.type.elements : [];
      const cType = elements[0];
      const bType = elements[2];
      const n = cType?.kind === "Vector" && typeof cType.n === "number" ? cType.n : "?";
      const m = bType?.kind === "Vector" && typeof bType.n === "number" ? bType.n : "?";
      return `Outputs LP(${n} vars, ${m} constraints). Wire to opt.simplex to solve.`;
    },
  },
};
