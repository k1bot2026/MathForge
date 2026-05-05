import { describe, expect, it } from "vitest";
import {
  type ConstructionEvent,
  type EdgeSnapshot,
  projectGraph,
  synthesizeFromSnapshot,
} from "./construction-events";

type EventInput = ConstructionEvent extends infer E
  ? E extends ConstructionEvent
    ? Omit<E, "at"> & { at?: number }
    : never
  : never;

const ev = (e: EventInput): ConstructionEvent => ({ ...e, at: e.at ?? 0 }) as ConstructionEvent;

describe("projectGraph", () => {
  it("returns empty state at step 0", () => {
    const events: ConstructionEvent[] = [
      ev({
        kind: "node-added",
        node: { id: "a", type: "block", position: { x: 0, y: 0 }, data: {} },
      }),
    ];
    expect(projectGraph(events, 0)).toEqual({ nodes: [], edges: [], justAppearedIds: [] });
  });

  it("applies node-added events in order", () => {
    const events: ConstructionEvent[] = [
      ev({
        kind: "node-added",
        node: { id: "a", type: "block", position: { x: 0, y: 0 }, data: {} },
      }),
      ev({
        kind: "node-added",
        node: { id: "b", type: "block", position: { x: 1, y: 1 }, data: {} },
      }),
    ];
    const out = projectGraph(events, 2);
    expect(out.nodes.map((n) => n.id)).toEqual(["a", "b"]);
    expect(out.justAppearedIds).toEqual(["b"]);
  });

  it("removes nodes and their incident edges", () => {
    const events: ConstructionEvent[] = [
      ev({
        kind: "node-added",
        node: { id: "a", type: "block", position: { x: 0, y: 0 }, data: {} },
      }),
      ev({
        kind: "node-added",
        node: { id: "b", type: "block", position: { x: 0, y: 0 }, data: {} },
      }),
      ev({ kind: "edge-added", edge: { id: "e1", source: "a", target: "b" } }),
      ev({ kind: "node-removed", nodeId: "a" }),
    ];
    const out = projectGraph(events, 4);
    expect(out.nodes.map((n) => n.id)).toEqual(["b"]);
    expect(out.edges).toEqual([]);
    expect(out.justAppearedIds).toEqual(["a"]);
  });

  it("updates params idempotently", () => {
    const events: ConstructionEvent[] = [
      ev({
        kind: "node-added",
        node: {
          id: "a",
          type: "block",
          position: { x: 0, y: 0 },
          data: { params: { x: 1 } },
        },
      }),
      ev({ kind: "params-updated", nodeId: "a", params: { x: 2 } }),
    ];
    const out = projectGraph(events, 2);
    const data = out.nodes[0]?.data as { params: { x: number } };
    expect(data.params).toEqual({ x: 2 });
  });

  it("graph-reset clears state", () => {
    const events: ConstructionEvent[] = [
      ev({
        kind: "node-added",
        node: { id: "a", type: "block", position: { x: 0, y: 0 }, data: {} },
      }),
      ev({ kind: "graph-reset", reason: "template" }),
      ev({
        kind: "node-added",
        node: { id: "b", type: "block", position: { x: 0, y: 0 }, data: {} },
      }),
    ];
    const out = projectGraph(events, 3);
    expect(out.nodes.map((n) => n.id)).toEqual(["b"]);
  });

  it("clamps step beyond events length", () => {
    const events: ConstructionEvent[] = [
      ev({
        kind: "node-added",
        node: { id: "a", type: "block", position: { x: 0, y: 0 }, data: {} },
      }),
    ];
    expect(projectGraph(events, 99).nodes.map((n) => n.id)).toEqual(["a"]);
  });

  it("ignores remove of non-existent node (lossless tolerance)", () => {
    const events: ConstructionEvent[] = [ev({ kind: "node-removed", nodeId: "ghost" })];
    expect(projectGraph(events, 1)).toEqual({ nodes: [], edges: [], justAppearedIds: ["ghost"] });
  });

  it("non-last events do not set justAppearedIds", () => {
    const events: ConstructionEvent[] = [
      ev({
        kind: "node-added",
        node: { id: "a", type: "block", position: { x: 0, y: 0 }, data: {} },
      }),
      ev({
        kind: "node-added",
        node: { id: "b", type: "block", position: { x: 0, y: 0 }, data: {} },
      }),
      ev({ kind: "node-removed", nodeId: "a" }),
      ev({ kind: "node-moved", nodeId: "b", position: { x: 10, y: 20 } }),
      ev({ kind: "params-updated", nodeId: "b", params: { v: 1 } }),
      ev({
        kind: "edge-added",
        edge: { id: "e1", source: "a", target: "b" },
      }),
      ev({ kind: "edge-removed", edgeId: "e1" }),
      ev({ kind: "graph-reset", reason: "template" }),
    ];
    // Step at 0 — no events processed
    expect(projectGraph(events, 0).justAppearedIds).toEqual([]);
    // Step at 1 — node-added "a" is last; justAppearedIds = ["a"]
    expect(projectGraph(events, 1).justAppearedIds).toEqual(["a"]);
    // Step at 8 (all) — graph-reset is last; justAppearedIds = []
    expect(projectGraph(events, 8).justAppearedIds).toEqual([]);
  });

  it("node-moved updates position", () => {
    const events: ConstructionEvent[] = [
      ev({
        kind: "node-added",
        node: { id: "a", type: "block", position: { x: 0, y: 0 }, data: {} },
      }),
      ev({ kind: "node-moved", nodeId: "a", position: { x: 50, y: 50 } }),
    ];
    const out = projectGraph(events, 2);
    expect(out.nodes[0]?.position).toEqual({ x: 50, y: 50 });
    expect(out.justAppearedIds).toEqual(["a"]);
  });

  it("edge-removed drops the edge", () => {
    const events: ConstructionEvent[] = [
      ev({
        kind: "node-added",
        node: { id: "a", type: "block", position: { x: 0, y: 0 }, data: {} },
      }),
      ev({
        kind: "node-added",
        node: { id: "b", type: "block", position: { x: 0, y: 0 }, data: {} },
      }),
      ev({ kind: "edge-added", edge: { id: "e1", source: "a", target: "b" } }),
      ev({ kind: "edge-removed", edgeId: "e1" }),
    ];
    const out = projectGraph(events, 4);
    expect(out.edges).toEqual([]);
    expect(out.justAppearedIds).toEqual(["e1"]);
  });

  it("edge-added with sourceHandle and targetHandle preserves both", () => {
    const events: ConstructionEvent[] = [
      ev({
        kind: "node-added",
        node: { id: "a", type: "block", position: { x: 0, y: 0 }, data: {} },
      }),
      ev({
        kind: "node-added",
        node: { id: "b", type: "block", position: { x: 0, y: 0 }, data: {} },
      }),
      ev({
        kind: "edge-added",
        edge: { id: "e1", source: "a", target: "b", sourceHandle: "out", targetHandle: "in" },
      }),
    ];
    const out = projectGraph(events, 3);
    expect(out.edges[0]).toMatchObject({
      id: "e1",
      source: "a",
      target: "b",
      sourceHandle: "out",
      targetHandle: "in",
    });
  });

  it("edge-added with null handles omits handle fields", () => {
    const events: ConstructionEvent[] = [
      ev({
        kind: "node-added",
        node: { id: "a", type: "block", position: { x: 0, y: 0 }, data: {} },
      }),
      ev({
        kind: "node-added",
        node: { id: "b", type: "block", position: { x: 0, y: 0 }, data: {} },
      }),
      ev({
        kind: "edge-added",
        edge: {
          id: "e1",
          source: "a",
          target: "b",
          sourceHandle: null,
          targetHandle: null,
        } satisfies EdgeSnapshot,
      }),
    ];
    const out = projectGraph(events, 3);
    expect(out.edges[0]).not.toHaveProperty("sourceHandle");
    expect(out.edges[0]).not.toHaveProperty("targetHandle");
  });
});

describe("synthesizeFromSnapshot", () => {
  it("emits graph-reset, then node-added, then edge-added, in that order", () => {
    const out = synthesizeFromSnapshot(
      [
        { id: "a", type: "block", position: { x: 0, y: 0 }, data: {} },
        { id: "b", type: "block", position: { x: 0, y: 0 }, data: {} },
      ],
      [{ id: "e1", source: "a", target: "b" }],
      "template",
      () => 100,
    );
    expect(out.map((e) => e.kind)).toEqual([
      "graph-reset",
      "node-added",
      "node-added",
      "edge-added",
    ]);
    expect(out[0]).toMatchObject({ kind: "graph-reset", reason: "template" });
  });

  it("synthesized timestamps are strictly monotonic", () => {
    const out = synthesizeFromSnapshot(
      [
        { id: "a", type: "block", position: { x: 0, y: 0 }, data: {} },
        { id: "b", type: "block", position: { x: 0, y: 0 }, data: {} },
      ],
      [{ id: "e1", source: "a", target: "b" }],
      "seed",
      () => 0,
    );
    for (let i = 1; i < out.length; i++) {
      const prev = out[i - 1];
      const cur = out[i];
      if (prev === undefined || cur === undefined) continue;
      expect(cur.at).toBeGreaterThan(prev.at);
    }
  });

  it("handles empty graphs", () => {
    const out = synthesizeFromSnapshot([], [], "user", () => 0);
    expect(out).toHaveLength(1);
    expect(out[0]?.kind).toBe("graph-reset");
  });

  it("uses default now() when no clock argument is passed", () => {
    const before = performance.now();
    const out = synthesizeFromSnapshot(
      [{ id: "a", type: "block", position: { x: 0, y: 0 }, data: {} }],
      [],
      "user",
    );
    const after = performance.now();
    expect(out).toHaveLength(2);
    const t = out[0]?.at ?? -1;
    expect(t).toBeGreaterThanOrEqual(before);
    expect(t).toBeLessThanOrEqual(after);
  });

  it("preserves sourceHandle and targetHandle when present in snapshot edge", () => {
    const out = synthesizeFromSnapshot(
      [
        { id: "a", type: "block", position: { x: 0, y: 0 }, data: {} },
        { id: "b", type: "block", position: { x: 0, y: 0 }, data: {} },
      ],
      [{ id: "e1", source: "a", target: "b", sourceHandle: "value", targetHandle: "x" }],
      "url-hash",
      () => 0,
    );
    const edgeEvent = out.find((e) => e.kind === "edge-added");
    expect(edgeEvent).toBeDefined();
    if (edgeEvent?.kind === "edge-added") {
      expect(edgeEvent.edge.sourceHandle).toBe("value");
      expect(edgeEvent.edge.targetHandle).toBe("x");
    }
  });

  it("omits sourceHandle and targetHandle when null in snapshot edge", () => {
    const out = synthesizeFromSnapshot(
      [
        { id: "a", type: "block", position: { x: 0, y: 0 }, data: {} },
        { id: "b", type: "block", position: { x: 0, y: 0 }, data: {} },
      ],
      [
        {
          id: "e1",
          source: "a",
          target: "b",
          sourceHandle: null,
          targetHandle: null,
        } as Parameters<typeof synthesizeFromSnapshot>[1][number] & {
          sourceHandle: null;
          targetHandle: null;
        },
      ],
      "seed",
      () => 0,
    );
    const edgeEvent = out.find((e) => e.kind === "edge-added");
    expect(edgeEvent).toBeDefined();
    if (edgeEvent?.kind === "edge-added") {
      expect(edgeEvent.edge).not.toHaveProperty("sourceHandle");
      expect(edgeEvent.edge).not.toHaveProperty("targetHandle");
    }
  });
});
