import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import { OutputProxyBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

const scalar: MathValue = {
  type: { kind: "Scalar", field: "real", precision: "exact" },
  payload: 42,
  provenance: { blockId: "core.constant", inputs: [], computedAt: 0, engine: "native" },
};

describe("OutputProxyBlock", () => {
  test("has id core.output-proxy", () => {
    expect(OutputProxyBlock.id).toBe("core.output-proxy");
  });

  test("has stability internal", () => {
    expect(OutputProxyBlock.stability).toBe("internal");
  });

  test("has one input port named value", () => {
    expect(OutputProxyBlock.inputs).toHaveLength(1);
    expect(OutputProxyBlock.inputs[0]?.id).toBe("value");
  });

  test("has zero outputs", () => {
    expect(OutputProxyBlock.outputs).toHaveLength(0);
  });

  test("has portId param", () => {
    expect(OutputProxyBlock.params?.portId?.kind).toBe("string");
  });

  test("compute returns the connected value (identity)", () => {
    const result = OutputProxyBlock.compute({ value: scalar }, { portId: "out" }, ctx);
    expect(result).toBe(scalar);
  });

  test("compute throws when value input is absent", () => {
    expect(() => OutputProxyBlock.compute({}, { portId: "out" }, ctx)).toThrow(
      "core.output-proxy: no value connected",
    );
  });

  test("explain.effect returns forwarding message including output stringification", () => {
    const msg = OutputProxyBlock.explain.effect?.({}, scalar);
    expect(msg).toMatch(/Output proxy — forwards/);
  });
});
