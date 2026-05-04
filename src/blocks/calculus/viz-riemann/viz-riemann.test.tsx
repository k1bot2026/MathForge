import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { FunctionPayload, MathValue } from "~/math/types";
import { VizRiemannBlock } from "./definition";
import { RiemannVisualization } from "./visualization";

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

function makeScalarValue(v: number): MathValue {
  return {
    type: { kind: "Scalar", field: "real", precision: "approximate" },
    payload: v,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("viz.riemann definition", () => {
  test("compute passes fn through when connected", () => {
    const fn = makeFunctionValue("x**2");
    const result = VizRiemannBlock.compute(
      { fn },
      {},
      {
        signal: new AbortController().signal,
      },
    ) as MathValue;
    expect(result).toBe(fn);
  });

  test("compute throws when fn is not connected", () => {
    expect(() => VizRiemannBlock.compute({}, {}, { signal: new AbortController().signal })).toThrow(
      "requires f(x)",
    );
  });
});

describe("RiemannVisualization", () => {
  test("renders placeholder when fn not connected", () => {
    render(<RiemannVisualization inputs={{}} output={undefined} />);
    expect(screen.getByTestId("viz-riemann-placeholder")).toBeTruthy();
  });

  test("renders SVG with role=img when fn is connected", () => {
    const fn = makeFunctionValue("x**2");
    render(<RiemannVisualization inputs={{ fn }} output={fn} params={{ a: 0, b: 1 }} />);
    expect(screen.getByTestId("viz-riemann-root")).toBeTruthy();
    expect(screen.getByRole("img")).toBeTruthy();
  });

  test("renders SVG when a and b input scalars are connected", () => {
    const fn = makeFunctionValue("sin(x)");
    render(
      <RiemannVisualization
        inputs={{ fn, a: makeScalarValue(0), b: makeScalarValue(Math.PI) }}
        output={fn}
      />,
    );
    expect(screen.getByTestId("viz-riemann-root")).toBeTruthy();
  });

  test("renders invalid message when a equals b (zero-width interval)", () => {
    const fn = makeFunctionValue("x**2");
    render(
      <RiemannVisualization
        inputs={{ fn, a: makeScalarValue(2), b: makeScalarValue(2) }}
        output={fn}
      />,
    );
    expect(screen.getByTestId("viz-riemann-invalid")).toBeTruthy();
  });

  test("renders n slider and method radios", () => {
    const fn = makeFunctionValue("x**2");
    render(<RiemannVisualization inputs={{ fn }} output={fn} params={{ a: 0, b: 1 }} />);
    expect(screen.getByRole("slider", { name: /Number of rectangles/i })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "left" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "midpoint" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "right" })).toBeTruthy();
  });
});
