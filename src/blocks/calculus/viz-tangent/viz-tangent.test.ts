import { describe, expect, test } from "vitest";
import type { FunctionPayload, MathValue } from "~/math/types";

function makeFn(expression: string): MathValue {
  const payload: FunctionPayload = { expression, variables: ["x"] };
  return {
    type: {
      kind: "Function",
      arity: 1,
      domain: { kind: "Scalar", field: "real", precision: "approximate" },
      codomain: { kind: "Scalar", field: "real", precision: "approximate" },
    },
    payload: payload as unknown as number,
    provenance: { blockId: "calc.function", inputs: [], computedAt: 0, engine: "sympy" },
  };
}

describe("viz.tangent compute", () => {
  test("returns fn passthrough when fn is provided", async () => {
    const { VizTangentBlock } = await import("./definition");
    const fn = makeFn("x**2");
    expect(VizTangentBlock.compute({ fn }, {})).toBe(fn);
  });

  test("throws when fn input is missing", async () => {
    const { VizTangentBlock } = await import("./definition");
    expect(() => VizTangentBlock.compute({}, {})).toThrow(
      "viz.tangent requires f(x) on the fn port",
    );
  });
});

describe("viz.tangent definition explain", () => {
  test("effect returns connect prompt when fn is missing", async () => {
    const { VizTangentBlock } = await import("./definition");
    const effect = VizTangentBlock.explain.effect;
    if (effect === undefined) throw new Error("effect undefined");
    expect(effect({}, undefined as never)).toMatch(/Connect f\(x\)/);
  });

  test("effect returns click-plot prompt when fn is connected", async () => {
    const { VizTangentBlock } = await import("./definition");
    const effect = VizTangentBlock.explain.effect;
    if (effect === undefined) throw new Error("effect undefined");
    const msg = effect({ fn: makeFn("sin(x)") }, undefined as never);
    expect(msg).toMatch(/click/i);
  });
});
