import { describe, expect, test } from "vitest";
import { BlockRegistry } from "./registry";
import type { BlockDefinition } from "./types";

const noopBlock = (id: string, domain: BlockDefinition["domain"] = "common"): BlockDefinition => ({
  id,
  label: id,
  category: "source",
  domain,
  determinism: "pure",
  stability: "stable",
  engine: "native",
  color: "source",
  inputs: [],
  outputs: [],
  compute: () => ({
    type: { kind: "Scalar", field: "real", precision: "exact" },
    payload: 0,
    provenance: { blockId: id, inputs: [], computedAt: 0, engine: "native" },
  }),
  explain: { what: "noop", why: "test fixture" },
});

describe("BlockRegistry", () => {
  test("register + get round-trips", () => {
    const r = new BlockRegistry();
    const block = noopBlock("test.a");
    r.register(block);
    expect(r.get("test.a")).toBe(block);
    expect(r.has("test.a")).toBe(true);
  });

  test("get returns undefined for unknown ids", () => {
    expect(new BlockRegistry().get("nope")).toBeUndefined();
  });

  test("duplicate registration throws", () => {
    const r = new BlockRegistry();
    r.register(noopBlock("test.a"));
    expect(() => r.register(noopBlock("test.a"))).toThrow(/Duplicate block id/);
  });

  test("list and byDomain filter correctly", () => {
    const r = new BlockRegistry();
    r.register(noopBlock("la.x", "linear-algebra"));
    r.register(noopBlock("la.y", "linear-algebra"));
    r.register(noopBlock("stats.z", "statistics"));
    expect(r.size()).toBe(3);
    expect(
      r
        .list()
        .map((b) => b.id)
        .sort(),
    ).toEqual(["la.x", "la.y", "stats.z"]);
    expect(
      r
        .byDomain("linear-algebra")
        .map((b) => b.id)
        .sort(),
    ).toEqual(["la.x", "la.y"]);
    expect(r.byDomain("statistics").map((b) => b.id)).toEqual(["stats.z"]);
  });
});
