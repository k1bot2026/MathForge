import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import type { ParamSpec } from "~/blocks/types";
import { ParamControl } from "./param-control";

function renderControl(spec: ParamSpec, value: unknown, onChange = vi.fn()) {
  render(<ParamControl name="testParam" spec={spec} value={value} onChange={onChange} />);
  return onChange;
}

describe("ParamControl — number", () => {
  test("renders a number input with the current value", () => {
    renderControl({ kind: "number", default: 0 }, 42);
    expect(screen.getByRole("spinbutton")).toHaveValue(42);
  });

  test("uses spec.default when value is non-finite", () => {
    renderControl({ kind: "number", default: 5 }, NaN);
    expect(screen.getByRole("spinbutton")).toHaveValue(5);
  });

  test("onChange parses number and calls callback", () => {
    const onChange = renderControl({ kind: "number", default: 0 }, 1);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "3.14" } });
    expect(onChange).toHaveBeenCalledWith(3.14);
  });

  test("onChange with empty string resets to default", () => {
    const onChange = renderControl({ kind: "number", default: 99 }, 1);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith(99);
  });

  test("integer kind: step is 1 and value is parsed with parseInt", () => {
    const onChange = renderControl({ kind: "integer", default: 0 }, 2);
    const input = screen.getByRole("spinbutton");
    expect(input).toHaveAttribute("step", "1");
    fireEvent.change(input, { target: { value: "7" } });
    expect(onChange).toHaveBeenCalledWith(7);
  });

  test("integer kind: non-numeric input resets to default", () => {
    const onChange = renderControl({ kind: "integer", default: 3 }, 1);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "abc" } });
    expect(onChange).toHaveBeenCalledWith(3);
  });

  test("renders label from spec.label when provided", () => {
    renderControl({ kind: "number", default: 0, label: "My Label" }, 0);
    expect(screen.getByText("My Label")).toBeInTheDocument();
  });

  test("falls back to name when spec.label is absent", () => {
    render(
      <ParamControl
        name="fallbackName"
        spec={{ kind: "number", default: 0 }}
        value={0}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("fallbackName")).toBeInTheDocument();
  });

  test("min and max are forwarded to input", () => {
    renderControl({ kind: "number", default: 0, min: -10, max: 10 }, 0);
    const input = screen.getByRole("spinbutton");
    expect(input).toHaveAttribute("min", "-10");
    expect(input).toHaveAttribute("max", "10");
  });
});

describe("ParamControl — boolean", () => {
  test("renders a checkbox with the current value", () => {
    renderControl({ kind: "boolean", default: false }, true);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  test("unchecked when value is false", () => {
    renderControl({ kind: "boolean", default: true }, false);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  test("onChange reports the new checked state", () => {
    const onChange = renderControl({ kind: "boolean", default: false }, false);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe("ParamControl — select", () => {
  const spec: ParamSpec = { kind: "select", options: ["alpha", "beta", "gamma"], default: "alpha" };

  test("renders a combobox with all options", () => {
    renderControl(spec, "beta");
    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("beta");
    expect(screen.getByRole("option", { name: "alpha" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "gamma" })).toBeInTheDocument();
  });

  test("onChange reports the selected value", () => {
    const onChange = renderControl(spec, "alpha");
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "gamma" } });
    expect(onChange).toHaveBeenCalledWith("gamma");
  });

  test("uses default when value is not a string", () => {
    renderControl(spec, 99);
    expect(screen.getByRole("combobox")).toHaveValue("alpha");
  });
});

describe("ParamControl — string", () => {
  test("renders a text input with the current value", () => {
    renderControl({ kind: "string", default: "" }, "hello");
    expect(screen.getByRole("textbox")).toHaveValue("hello");
  });

  test("onChange reports the new string value", () => {
    const onChange = renderControl({ kind: "string", default: "" }, "");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "world" } });
    expect(onChange).toHaveBeenCalledWith("world");
  });

  test("uses default when value is not a string", () => {
    renderControl({ kind: "string", default: "default-val" }, 123);
    expect(screen.getByRole("textbox")).toHaveValue("default-val");
  });
});
