import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { FunctionPayload, MathValue } from "~/math/types";
import { VizTangentBlock } from "./definition";
import { TangentVisualization } from "./visualization";

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

describe("viz.tangent definition", () => {
  test("compute passes fn through when connected", () => {
    const fn = makeFunctionValue("sin(x)");
    const result = VizTangentBlock.compute(
      { fn },
      {},
      {
        signal: new AbortController().signal,
      },
    ) as MathValue;
    expect(result).toBe(fn);
  });

  test("compute throws when fn is not connected", () => {
    expect(() => VizTangentBlock.compute({}, {}, { signal: new AbortController().signal })).toThrow(
      "requires f(x)",
    );
  });
});

describe("TangentVisualization", () => {
  test("renders placeholder when fn not connected", () => {
    render(<TangentVisualization inputs={{}} output={undefined} />);
    expect(screen.getByTestId("viz-tangent-placeholder")).toBeTruthy();
  });

  test("renders SVG when fn is connected", () => {
    const fn = makeFunctionValue("sin(x)");
    render(<TangentVisualization inputs={{ fn }} output={fn} />);
    expect(screen.getByTestId("viz-tangent-root")).toBeTruthy();
    expect(screen.getByRole("img")).toBeTruthy();
  });

  test("renders SVG when fn and derivative are both connected", () => {
    const fn = makeFunctionValue("sin(x)");
    const deriv = makeFunctionValue("cos(x)");
    render(<TangentVisualization inputs={{ fn, derivative: deriv }} output={fn} />);
    expect(screen.getByTestId("viz-tangent-root")).toBeTruthy();
  });
});
