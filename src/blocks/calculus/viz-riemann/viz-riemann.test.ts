import { describe, expect, test } from "vitest";
import type { FunctionPayload, MathValue } from "~/math/types";

const ctx = { signal: new AbortController().signal };

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

describe("viz.riemann compute", () => {
  test("returns fn passthrough when fn is provided", async () => {
    const { VizRiemannBlock } = await import("./definition");
    const fn = makeFn("sin(x)");
    expect(VizRiemannBlock.compute({ fn }, {}, ctx)).toBe(fn);
  });

  test("throws when fn input is missing", async () => {
    const { VizRiemannBlock } = await import("./definition");
    expect(() => VizRiemannBlock.compute({}, {}, ctx)).toThrow(
      "viz.riemann requires f(x) on the fn port",
    );
  });
});

describe("viz.riemann definition explain", () => {
  test("effect returns connect prompt when fn is missing", async () => {
    const { VizRiemannBlock } = await import("./definition");
    const effect = VizRiemannBlock.explain.effect;
    if (effect === undefined) throw new Error("effect undefined");
    expect(effect({}, undefined as never)).toMatch(/Connect f\(x\)/);
  });

  test("effect returns slider prompt when fn is connected", async () => {
    const { VizRiemannBlock } = await import("./definition");
    const effect = VizRiemannBlock.explain.effect;
    if (effect === undefined) throw new Error("effect undefined");
    const msg = effect({ fn: makeFn("sin(x)") }, undefined as never);
    expect(msg).toMatch(/slider/);
  });
});
