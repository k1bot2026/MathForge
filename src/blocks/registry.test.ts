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

describe("BlockRegistry.registerOrReplace", () => {
  test("registers a new user block", () => {
    const r = new BlockRegistry();
    const block = noopBlock("user.composite-a");
    r.registerOrReplace(block);
    expect(r.get("user.composite-a")).toBe(block);
  });

  test("replaces an existing user block with the new definition", () => {
    const r = new BlockRegistry();
    const v1 = noopBlock("user.composite-a");
    const v2 = noopBlock("user.composite-a");
    r.registerOrReplace(v1);
    r.registerOrReplace(v2);
    expect(r.get("user.composite-a")).toBe(v2);
  });

  test("throws when attempting to overwrite a built-in block", () => {
    const r = new BlockRegistry();
    r.register(noopBlock("la.matmul"));
    expect(() => r.registerOrReplace(noopBlock("la.matmul"))).toThrow(
      /Cannot overwrite built-in block/,
    );
  });

  test("built-in block remains after failed overwrite attempt", () => {
    const r = new BlockRegistry();
    const builtin = noopBlock("la.matmul");
    r.register(builtin);
    try {
      r.registerOrReplace(noopBlock("la.matmul"));
    } catch {
      // expected
    }
    expect(r.get("la.matmul")).toBe(builtin);
  });

  test("emits console.warn when replacing an existing user block", () => {
    const r = new BlockRegistry();
    r.registerOrReplace(noopBlock("user.composite-b"));
    const warned: string[] = [];
    const original = console.warn;
    console.warn = (...args: unknown[]) => {
      warned.push(String(args[0]));
    };
    r.registerOrReplace(noopBlock("user.composite-b"));
    console.warn = original;
    expect(warned.some((m) => m.includes("user.composite-b"))).toBe(true);
  });
});
