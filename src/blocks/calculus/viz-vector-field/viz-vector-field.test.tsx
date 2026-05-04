import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { FunctionPayload, MathValue } from "~/math/types";
import { VizVectorFieldBlock } from "./definition";
import { VectorFieldVisualization } from "./visualization";

function makeFunctionValue(expression: string, variables: string[]): MathValue {
  const payload: FunctionPayload = { expression, variables };
  return {
    type: {
      kind: "Function",
      arity: variables.length,
      domain: { kind: "Scalar", field: "real", precision: "approximate" },
      codomain: { kind: "Scalar", field: "real", precision: "approximate" },
    },
    payload: payload as unknown as number,
    provenance: { blockId: "calc.function", inputs: [], computedAt: 0, engine: "sympy" },
  };
}

describe("viz.vector-field definition", () => {
  test("compute passes Fx through when connected", () => {
    const fx = makeFunctionValue("y", ["x", "y"]);
    const result = VizVectorFieldBlock.compute(
      { Fx: fx },
      {},
      { signal: new AbortController().signal },
    ) as MathValue;
    expect(result).toBe(fx);
  });

  test("compute throws when Fx is not connected", () => {
    expect(() =>
      VizVectorFieldBlock.compute({}, {}, { signal: new AbortController().signal }),
    ).toThrow("requires Fx(x,y)");
  });
});

describe("VectorFieldVisualization", () => {
  test("renders placeholder when Fx not connected", () => {
    render(<VectorFieldVisualization inputs={{}} output={undefined} />);
    expect(screen.getByTestId("viz-vector-field-placeholder")).toBeTruthy();
  });

  test("renders SVG with role=img when Fx is connected", () => {
    const fx = makeFunctionValue("y", ["x", "y"]);
    render(<VectorFieldVisualization inputs={{ Fx: fx }} output={fx} />);
    expect(screen.getByTestId("viz-vector-field-root")).toBeTruthy();
    expect(screen.getByRole("img")).toBeTruthy();
  });

  test("renders when both Fx and Fy are connected", () => {
    const fx = makeFunctionValue("y", ["x", "y"]);
    const fy = makeFunctionValue("-x", ["x", "y"]);
    render(<VectorFieldVisualization inputs={{ Fx: fx, Fy: fy }} output={fx} />);
    expect(screen.getByTestId("viz-vector-field-root")).toBeTruthy();
  });

  test("renders zoom slider", () => {
    const fx = makeFunctionValue("x", ["x", "y"]);
    render(<VectorFieldVisualization inputs={{ Fx: fx }} output={fx} />);
    expect(screen.getByRole("slider", { name: /View range/i })).toBeTruthy();
  });

  test("shows warning when Fy is not connected", () => {
    const fx = makeFunctionValue("x", ["x", "y"]);
    const { container } = render(<VectorFieldVisualization inputs={{ Fx: fx }} output={fx} />);
    expect(container.querySelector("svg")?.textContent).toMatch(/Connect Fy/);
  });

  test("does not show Fy warning when both components connected", () => {
    const fx = makeFunctionValue("y", ["x", "y"]);
    const fy = makeFunctionValue("-x", ["x", "y"]);
    const { container } = render(
      <VectorFieldVisualization inputs={{ Fx: fx, Fy: fy }} output={fx} />,
    );
    expect(container.querySelector("svg")?.textContent).not.toMatch(/Connect Fy/);
  });
});
