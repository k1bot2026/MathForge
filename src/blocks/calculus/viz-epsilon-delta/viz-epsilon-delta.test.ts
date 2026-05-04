import { describe, expect, test } from "vitest";
import type { FunctionPayload, MathValue } from "~/math/types";

const ctx = { signal: new AbortController().signal };

function makeFn(expression: string, variables: string[] = ["x"]): MathValue {
  const payload: FunctionPayload = { expression, variables };
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

function makeScalar(value: number): MathValue {
  return {
    type: { kind: "Scalar", field: "real", precision: "approximate" },
    payload: value,
    provenance: { blockId: "some.block", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("viz.epsilon-delta compute", () => {
  test("returns fn passthrough when fn is provided", async () => {
    const { VizEpsilonDeltaBlock } = await import("./definition");
    const fn = makeFn("sin(x)");
    expect(VizEpsilonDeltaBlock.compute({ fn }, {}, ctx)).toBe(fn);
  });

  test("throws when fn input is missing", async () => {
    const { VizEpsilonDeltaBlock } = await import("./definition");
    expect(() => VizEpsilonDeltaBlock.compute({}, {}, ctx)).toThrow(
      "viz.epsilon-delta requires f(x) on the fn port",
    );
  });
});

describe("viz.epsilon-delta definition explain", () => {
  test("effect returns connect prompt when fn is missing", async () => {
    const { VizEpsilonDeltaBlock } = await import("./definition");
    const effect = VizEpsilonDeltaBlock.explain.effect;
    if (effect === undefined) throw new Error("effect undefined");
    expect(effect({}, undefined as never)).toMatch(/Connect f\(x\)/);
  });

  test("effect returns c prompt when fn connected but c missing", async () => {
    const { VizEpsilonDeltaBlock } = await import("./definition");
    const effect = VizEpsilonDeltaBlock.explain.effect;
    if (effect === undefined) throw new Error("effect undefined");
    const msg = effect({ fn: makeFn("sin(x)") }, undefined as never);
    expect(msg).toMatch(/connect c/);
  });

  test("effect shows limit point when fn and c connected, L missing", async () => {
    const { VizEpsilonDeltaBlock } = await import("./definition");
    const effect = VizEpsilonDeltaBlock.explain.effect;
    if (effect === undefined) throw new Error("effect undefined");
    const msg = effect({ fn: makeFn("sin(x)"), c: makeScalar(0) }, undefined as never);
    expect(msg).toMatch(/0\.00/);
    expect(msg).toMatch(/f\(c\)/);
  });

  test("effect shows L value when fn, c, and L all connected", async () => {
    const { VizEpsilonDeltaBlock } = await import("./definition");
    const effect = VizEpsilonDeltaBlock.explain.effect;
    if (effect === undefined) throw new Error("effect undefined");
    const msg = effect(
      { fn: makeFn("sin(x)"), c: makeScalar(0), L: makeScalar(1) },
      undefined as never,
    );
    expect(msg).toMatch(/0\.00/);
    expect(msg).toMatch(/1\.000/);
  });
});
