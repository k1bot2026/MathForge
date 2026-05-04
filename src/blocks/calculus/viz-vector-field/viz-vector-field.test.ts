import { describe, expect, test } from "vitest";
import type { FunctionPayload, MathValue } from "~/math/types";

const ctx = { signal: new AbortController().signal };

function makeFn2(expression: string): MathValue {
  const payload: FunctionPayload = { expression, variables: ["x", "y"] };
  return {
    type: {
      kind: "Function",
      arity: 2,
      domain: { kind: "Scalar", field: "real", precision: "approximate" },
      codomain: { kind: "Scalar", field: "real", precision: "approximate" },
    },
    payload: payload as unknown as number,
    provenance: { blockId: "calc.partial", inputs: [], computedAt: 0, engine: "sympy" },
  };
}

describe("viz.vector-field compute", () => {
  test("returns Fx passthrough when Fx is provided", async () => {
    const { VizVectorFieldBlock } = await import("./definition");
    const fx = makeFn2("x");
    expect(VizVectorFieldBlock.compute({ Fx: fx }, {}, ctx)).toBe(fx);
  });

  test("throws when Fx input is missing", async () => {
    const { VizVectorFieldBlock } = await import("./definition");
    expect(() => VizVectorFieldBlock.compute({}, {}, ctx)).toThrow(
      "viz.vector-field requires Fx(x,y) on the Fx port",
    );
  });
});

describe("viz.vector-field definition explain", () => {
  test("effect returns connect prompt when Fx is missing", async () => {
    const { VizVectorFieldBlock } = await import("./definition");
    const effect = VizVectorFieldBlock.explain.effect;
    if (effect === undefined) throw new Error("effect undefined");
    expect(effect({}, undefined as never)).toMatch(/Connect Fx/);
  });

  test("effect shows Fx expression and Fy prompt when only Fx connected", async () => {
    const { VizVectorFieldBlock } = await import("./definition");
    const effect = VizVectorFieldBlock.explain.effect;
    if (effect === undefined) throw new Error("effect undefined");
    const msg = effect({ Fx: makeFn2("2*x") }, undefined as never);
    expect(msg).toMatch(/2\*x/);
    expect(msg).toMatch(/connect Fy/i);
  });

  test("effect shows full F(x,y) expression when both Fx and Fy connected", async () => {
    const { VizVectorFieldBlock } = await import("./definition");
    const effect = VizVectorFieldBlock.explain.effect;
    if (effect === undefined) throw new Error("effect undefined");
    const msg = effect({ Fx: makeFn2("2*x"), Fy: makeFn2("3*y") }, undefined as never);
    expect(msg).toMatch(/2\*x/);
    expect(msg).toMatch(/3\*y/);
    expect(msg).toMatch(/F\(x,y\)/);
  });
});
