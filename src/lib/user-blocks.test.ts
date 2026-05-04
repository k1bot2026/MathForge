import "fake-indexeddb/auto";

import { beforeEach, describe, expect, test } from "vitest";
import type { GraphSpec } from "~/engine/graph-spec";
import { buildRegistry } from "~/blocks";
import { deleteUserBlock, hydrateUserBlocks, loadUserBlocks, saveUserBlock } from "./user-blocks";
import type { UserBlockRecord } from "./user-blocks";

// Minimal empty inner graph for testing — no nodes, no edges
const emptyGraph: GraphSpec = { nodes: [], edges: [] };

function makeRecord(id: string, label: string): UserBlockRecord {
  return {
    id,
    label,
    version: 1,
    subgraph: {
      inner: emptyGraph,
      inputProxies: [],
      outputProxies: [],
    },
    inputPorts: [],
    outputPorts: [{ id: "out", label: "Output", type: { kind: "Scalar", field: "real", precision: "approximate" } }],
  };
}

beforeEach(async () => {
  // Clean slate: remove any records left from previous test
  const existing = await loadUserBlocks();
  for (const r of existing) {
    await deleteUserBlock(r.id);
  }
});

describe("saveUserBlock / loadUserBlocks", () => {
  test("saved record is returned by loadUserBlocks", async () => {
    const rec = makeRecord("user.test-a", "Test A");
    await saveUserBlock(rec);
    const all = await loadUserBlocks();
    expect(all).toHaveLength(1);
    expect(all[0]?.id).toBe("user.test-a");
    expect(all[0]?.label).toBe("Test A");
    expect(all[0]?.version).toBe(1);
  });

  test("saving a second record with same id overwrites the first", async () => {
    await saveUserBlock(makeRecord("user.dup", "Original"));
    await saveUserBlock({ ...makeRecord("user.dup", "Updated"), version: 2 });
    const all = await loadUserBlocks();
    const match = all.find((r) => r.id === "user.dup");
    expect(match?.label).toBe("Updated");
    expect(match?.version).toBe(2);
  });

  test("multiple distinct records are all returned", async () => {
    await saveUserBlock(makeRecord("user.x", "X"));
    await saveUserBlock(makeRecord("user.y", "Y"));
    const all = await loadUserBlocks();
    const ids = all.map((r) => r.id).sort();
    expect(ids).toContain("user.x");
    expect(ids).toContain("user.y");
  });

  test("loadUserBlocks returns empty array when no records saved", async () => {
    const all = await loadUserBlocks();
    expect(all).toHaveLength(0);
  });
});

describe("deleteUserBlock", () => {
  test("deleted record does not appear in subsequent loadUserBlocks", async () => {
    await saveUserBlock(makeRecord("user.to-delete", "Delete Me"));
    await deleteUserBlock("user.to-delete");
    const all = await loadUserBlocks();
    expect(all.find((r) => r.id === "user.to-delete")).toBeUndefined();
  });

  test("deleting a non-existent id does not throw", async () => {
    await expect(deleteUserBlock("user.does-not-exist")).resolves.toBeUndefined();
  });
});

describe("hydrateUserBlocks", () => {
  test("registered blocks are retrievable from the registry after hydration", async () => {
    const rec = makeRecord("user.hydrated", "Hydrated Block");
    await saveUserBlock(rec);

    const registry = buildRegistry();
    await hydrateUserBlocks(registry);

    expect(registry.has("user.hydrated")).toBe(true);
    expect(registry.get("user.hydrated")?.label).toBe("Hydrated Block");
  });

  test("hydrating with no saved blocks leaves built-in registry intact", async () => {
    const registry = buildRegistry();
    const sizeBefore = registry.size();
    await hydrateUserBlocks(registry);
    expect(registry.size()).toBe(sizeBefore);
  });

  test("hydration registers all saved blocks", async () => {
    await saveUserBlock(makeRecord("user.h1", "H1"));
    await saveUserBlock(makeRecord("user.h2", "H2"));

    const registry = buildRegistry();
    await hydrateUserBlocks(registry);

    expect(registry.has("user.h1")).toBe(true);
    expect(registry.has("user.h2")).toBe(true);
  });

  test("re-hydrating replaces existing user block with updated version", async () => {
    await saveUserBlock(makeRecord("user.update-me", "Old Label"));
    const registry = buildRegistry();
    await hydrateUserBlocks(registry);
    expect(registry.get("user.update-me")?.label).toBe("Old Label");

    await saveUserBlock({ ...makeRecord("user.update-me", "New Label"), version: 2 });
    await hydrateUserBlocks(registry);
    expect(registry.get("user.update-me")?.label).toBe("New Label");
  });
});
