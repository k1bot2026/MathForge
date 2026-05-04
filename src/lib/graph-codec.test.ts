import type { Edge, Node } from "@xyflow/react";
import { describe, expect, test } from "vitest";
import { decodeGraph, encodeGraph, GRAPH_SCHEMA_VERSION } from "./graph-codec";

const seedNode = (id: string, blockId: string, params?: Record<string, unknown>): Node => ({
  id,
  type: "block",
  position: { x: 0, y: 0 },
  data: params === undefined ? { blockId } : { blockId, params },
});

describe("graph-codec / encode + decode", () => {
  test("round-trips an empty graph", () => {
    const encoded = encodeGraph([], []);
    const decoded = decodeGraph(encoded);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.graph.schemaVersion).toBe(GRAPH_SCHEMA_VERSION);
      expect(decoded.graph.nodes).toEqual([]);
      expect(decoded.graph.edges).toEqual([]);
    }
  });

  test("round-trips a non-trivial graph (matrix → matvec ← vector)", () => {
    const nodes: Node[] = [
      seedNode("m", "la.matrix", { rows: 2, cols: 2, r0c0: 1, r0c1: 0, r1c0: 0, r1c1: 1 }),
      seedNode("v", "la.vector", { dim: 2, c0: 3, c1: 4 }),
      seedNode("mv", "la.matvec"),
    ];
    const edges: Edge[] = [
      { id: "e1", source: "m", target: "mv", sourceHandle: "M", targetHandle: "M" },
      { id: "e2", source: "v", target: "mv", sourceHandle: "v", targetHandle: "v" },
    ];
    const encoded = encodeGraph(nodes, edges);
    const decoded = decodeGraph(encoded);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.graph.nodes).toHaveLength(3);
      expect(decoded.graph.nodes[0]?.data.blockId).toBe("la.matrix");
      expect(decoded.graph.nodes[0]?.data.params).toEqual({
        rows: 2,
        cols: 2,
        r0c0: 1,
        r0c1: 0,
        r1c0: 0,
        r1c1: 1,
      });
      expect(decoded.graph.edges).toHaveLength(2);
      expect(decoded.graph.edges[0]?.sourceHandle).toBe("M");
    }
  });

  test("v1→v2 migration: old la.vector2/la.matrix2x2 IDs are upgraded on decode", () => {
    // This hash encodes schemaVersion:1 with la.matrix2x2 and la.vector2 nodes.
    // Generated from the Phase-1 codec with the seed graph params.
    const v1Hash =
      "jZC9rgIhEEbfZWpyc1mNxT6BFrY2xmKEiW5cFgNo1mx4dwfUFQt_GgLD-eYwDODVngyuyPnGdlBLAZ3V5KFeD9BoqMGAgHA5Em-3rVUHPh6tb0LGB-ih_hdw4TUK0BgwFTO4SOkW_wwG1_RVX6UkOjTcfADm2LXNaZVXxmWMUdy95x-9VfXWfCYVrHv1cm6Sc9PCZb7LJrObTspPg7KxtLFiI4D0rvxQkox4e3Iq6fL3ottReLzjdjXHTrcJWI5AURpfTmm6sVke41OzJ1CU4iZeAQ";
    const decoded = decodeGraph(v1Hash);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.graph.schemaVersion).toBe(2);
      const blockIds = decoded.graph.nodes.map((n) => n.data.blockId).sort();
      expect(blockIds).toEqual(["la.matrix", "la.matvec", "la.vector"].sort());
      const matrix = decoded.graph.nodes.find((n) => n.data.blockId === "la.matrix");
      expect(matrix?.data.params).toEqual({ rows: 2, cols: 2, r0c0: 1, r0c1: 0, r1c0: 0, r1c1: 1 });
      const vector = decoded.graph.nodes.find((n) => n.data.blockId === "la.vector");
      expect(vector?.data.params).toEqual({ dim: 2, c0: 3, c1: 4 });
    }
  });

  test("encoded form is URL-safe (no +, /, =)", () => {
    const encoded = encodeGraph([seedNode("a", "core.constant", { value: 42 })], []);
    expect(encoded).not.toMatch(/[+/=]/);
  });

  test("encoded form fits inside a typical URL hash for small graphs (≤ 5 KB target)", () => {
    const nodes: Node[] = Array.from({ length: 25 }, (_, i) =>
      seedNode(`n${i}`, "core.constant", { value: i }),
    );
    const encoded = encodeGraph(nodes, []);
    expect(encoded.length).toBeLessThan(5000);
  });

  test("decode rejects unknown schemaVersion", () => {
    // Hand-craft a payload with a future schemaVersion.
    const future = Buffer.from(
      require("fflate").deflateSync(
        new TextEncoder().encode(JSON.stringify({ schemaVersion: 999, nodes: [], edges: [] })),
      ),
    )
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const decoded = decodeGraph(future);
    expect(decoded.ok).toBe(false);
    if (!decoded.ok) expect(decoded.reason).toMatch(/schemaVersion/);
  });

  test("decode rejects junk base64", () => {
    const decoded = decodeGraph("!!!not-real-base64!!!");
    expect(decoded.ok).toBe(false);
  });

  test("decode rejects empty input", () => {
    expect(decodeGraph("")).toEqual({ ok: false, reason: "empty payload" });
  });

  test("decode rejects malformed nodes (missing blockId)", () => {
    const malformed = Buffer.from(
      require("fflate").deflateSync(
        new TextEncoder().encode(
          JSON.stringify({
            schemaVersion: GRAPH_SCHEMA_VERSION,
            nodes: [{ id: "a", type: "block", position: { x: 0, y: 0 }, data: {} }],
            edges: [],
          }),
        ),
      ),
    )
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const decoded = decodeGraph(malformed);
    expect(decoded.ok).toBe(false);
    if (!decoded.ok) expect(decoded.reason).toMatch(/blockId/);
  });

  test("decode preserves omitted optional fields (no params, no handles)", () => {
    const encoded = encodeGraph(
      [seedNode("a", "core.constant")],
      [{ id: "e", source: "a", target: "a" }],
    );
    const decoded = decodeGraph(encoded);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.graph.nodes[0]?.data.params).toBeUndefined();
      expect(decoded.graph.edges[0]?.sourceHandle).toBeUndefined();
      expect(decoded.graph.edges[0]?.targetHandle).toBeUndefined();
    }
  });

  test("decode rejects edge with non-string sourceHandle", () => {
    const payload = require("fflate").deflateSync(
      new TextEncoder().encode(
        JSON.stringify({
          schemaVersion: GRAPH_SCHEMA_VERSION,
          nodes: [],
          edges: [{ id: "e", source: "a", target: "b", sourceHandle: 42 }],
        }),
      ),
    );
    const encoded = Buffer.from(payload)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const decoded = decodeGraph(encoded);
    expect(decoded.ok).toBe(false);
    if (!decoded.ok) expect(decoded.reason).toMatch(/sourceHandle/);
  });

  test("decode rejects edge with non-string targetHandle", () => {
    const payload = require("fflate").deflateSync(
      new TextEncoder().encode(
        JSON.stringify({
          schemaVersion: GRAPH_SCHEMA_VERSION,
          nodes: [],
          edges: [{ id: "e", source: "a", target: "b", targetHandle: true }],
        }),
      ),
    );
    const encoded = Buffer.from(payload)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const decoded = decodeGraph(encoded);
    expect(decoded.ok).toBe(false);
    if (!decoded.ok) expect(decoded.reason).toMatch(/targetHandle/);
  });
});
