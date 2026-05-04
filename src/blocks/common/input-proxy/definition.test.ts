import { describe, expect, test } from "vitest";
import { InputProxyBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

describe("InputProxyBlock", () => {
  test("has id core.input-proxy", () => {
    expect(InputProxyBlock.id).toBe("core.input-proxy");
  });

  test("has stability internal", () => {
    expect(InputProxyBlock.stability).toBe("internal");
  });

  test("has zero inputs", () => {
    expect(InputProxyBlock.inputs).toHaveLength(0);
  });

  test("has one output port named value", () => {
    expect(InputProxyBlock.outputs).toHaveLength(1);
    expect(InputProxyBlock.outputs[0]?.id).toBe("value");
  });

  test("has portId param", () => {
    expect(InputProxyBlock.params?.portId?.kind).toBe("string");
  });

  test("compute throws when called standalone", () => {
    expect(() => InputProxyBlock.compute({}, { portId: "p1" }, ctx)).toThrow(
      "core.input-proxy must be used inside a core.subgraph",
    );
  });
});
