import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { FunctionPayload, MathValue } from "~/math/types";
import { VizEpsilonDeltaBlock } from "./definition";
import { EpsilonDeltaVisualization } from "./visualization";

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

describe("viz.epsilon-delta definition", () => {
  test("compute passes fn through when connected", () => {
    const fn = makeFunctionValue("sin(x)");
    const result = VizEpsilonDeltaBlock.compute(
      { fn },
      {},
      { signal: new AbortController().signal },
    ) as MathValue;
    expect(result).toBe(fn);
  });

  test("compute throws when fn is not connected", () => {
    expect(() =>
      VizEpsilonDeltaBlock.compute({}, {}, { signal: new AbortController().signal }),
    ).toThrow("requires f(x)");
  });
});

describe("EpsilonDeltaVisualization", () => {
  test("renders placeholder when fn not connected", () => {
    render(<EpsilonDeltaVisualization inputs={{}} output={undefined} />);
    expect(screen.getByTestId("viz-epsilon-delta-placeholder")).toBeTruthy();
  });

  test("renders SVG with role=img when fn is connected", () => {
    const fn = makeFunctionValue("x**2");
    render(<EpsilonDeltaVisualization inputs={{ fn }} output={fn} />);
    expect(screen.getByTestId("viz-epsilon-delta-root")).toBeTruthy();
    expect(screen.getByRole("img")).toBeTruthy();
  });

  test("renders correctly with c and L inputs connected", () => {
    const fn = makeFunctionValue("x**2");
    render(
      <EpsilonDeltaVisualization
        inputs={{ fn, c: makeScalarValue(1), L: makeScalarValue(1) }}
        output={fn}
      />,
    );
    expect(screen.getByTestId("viz-epsilon-delta-root")).toBeTruthy();
  });

  test("renders epsilon and delta sliders", () => {
    const fn = makeFunctionValue("x");
    render(<EpsilonDeltaVisualization inputs={{ fn }} output={fn} />);
    expect(screen.getByRole("slider", { name: /Epsilon/i })).toBeTruthy();
    expect(screen.getByRole("slider", { name: /Delta/i })).toBeTruthy();
  });

  test("shows validity badge in SVG", () => {
    const fn = makeFunctionValue("x");
    const { container } = render(<EpsilonDeltaVisualization inputs={{ fn }} output={fn} />);
    // SVG text elements contain the badge
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg?.textContent).toMatch(/δ works for ε|δ too large/);
  });
});
