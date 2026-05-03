import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { FunctionPayload, MathValue } from "~/math/types";
import { VizTaylorBlock } from "./definition";
import { TaylorVisualization } from "./visualization";

function makeFunctionValue(expression: string, variable = "x"): MathValue {
  const payload: FunctionPayload = { expression, variables: [variable] };
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

describe("viz.taylor definition", () => {
  test("compute passes fn through when connected", () => {
    const fn = makeFunctionValue("sin(x)");
    const result = VizTaylorBlock.compute(
      { fn },
      {},
      {
        signal: new AbortController().signal,
      },
    ) as MathValue;
    expect(result).toBe(fn);
  });

  test("compute throws when fn is not connected", () => {
    expect(() => VizTaylorBlock.compute({}, {}, { signal: new AbortController().signal })).toThrow(
      "requires f(x)",
    );
  });

  test("explain.effect returns placeholder when fn missing", () => {
    const effect = VizTaylorBlock.explain.effect;
    if (typeof effect !== "function") throw new Error("effect must be a function");
    expect(effect({}, makeFunctionValue("0"))).toMatch(/Connect f\(x\)/);
  });

  test("explain.effect returns overlay message when both connected", () => {
    const effect = VizTaylorBlock.explain.effect;
    if (typeof effect !== "function") throw new Error("effect must be a function");
    const result = effect(
      { fn: makeFunctionValue("sin(x)"), taylor: makeFunctionValue("x") },
      makeFunctionValue("sin(x)"),
    );
    expect(result).toMatch(/Taylor approximation overlay/);
  });
});

describe("TaylorVisualization", () => {
  test("renders placeholder when fn not connected", () => {
    render(<TaylorVisualization inputs={{}} output={undefined} />);
    expect(screen.getByTestId("viz-taylor-placeholder")).toBeTruthy();
  });

  test("renders SVG when fn is connected", () => {
    const fn = makeFunctionValue("sin(x)");
    render(<TaylorVisualization inputs={{ fn }} output={fn} />);
    expect(screen.getByTestId("viz-taylor-root")).toBeTruthy();
  });

  test("renders SVG root when fn and taylor are both connected", () => {
    const fn = makeFunctionValue("sin(x)");
    const taylor = makeFunctionValue("x - x**3/6");
    render(<TaylorVisualization inputs={{ fn, taylor }} output={fn} />);
    expect(screen.getByTestId("viz-taylor-root")).toBeTruthy();
    expect(screen.getByRole("img")).toBeTruthy();
  });
});
