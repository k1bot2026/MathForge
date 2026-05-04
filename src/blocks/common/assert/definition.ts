import type { BlockDefinition } from "~/blocks/types";
import type { MathType } from "~/math/types";
import { computeAssert } from "./compute";

const anyScalar: MathType = { kind: "Scalar", field: "real", precision: "approximate" };
const boolOutput: MathType = { kind: "Scalar", field: "boolean", precision: "exact" };

export const AssertBlock: BlockDefinition = {
  id: "core.assert",
  label: "Assert",
  symbol: "✓",
  category: "operation",
  domain: "common",
  determinism: "pure",
  stability: "stable",
  engine: "native",
  color: "operation",
  inputs: [
    { id: "actual", label: "actual", type: anyScalar },
    { id: "expected", label: "expected", type: anyScalar },
  ],
  outputs: [{ id: "pass", label: "pass", type: boolOutput }],
  params: {
    tolerance: {
      kind: "number",
      default: 0,
      min: 0,
      label: "Tolerance",
    },
  },
  compute(inputs, params) {
    const actual = inputs.actual;
    const expected = inputs.expected;
    if (actual === undefined || expected === undefined) {
      throw new Error("core.assert: both inputs must be connected");
    }
    const tol = typeof params.tolerance === "number" ? params.tolerance : 0;
    const pass = computeAssert(actual, expected, tol);
    return {
      type: boolOutput,
      payload: pass,
      provenance: {
        blockId: "core.assert",
        inputs: ["actual", "expected"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Asserts that two values are equal (within tolerance). Outputs true on pass, false on failure.",
    why: "Use to verify invariants in a graph: check that a computed result matches an expected value.",
    effect: (_inputs, output) =>
      output.payload === true ? "Assertion passed." : "Assertion FAILED.",
  },
};
