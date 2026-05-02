import type { Edge, Node } from "@xyflow/react";
import { describe, expect, test } from "vitest";
import { decodeGraph, encodeGraph } from "../graph-codec";
import { getTemplate, TEMPLATES, templateHash } from ".";

describe("template catalog", () => {
  test("contains the three Phase-1 templates with stable ids", () => {
    expect(TEMPLATES.map((t) => t.id).sort()).toEqual(["eigen-demo", "rotation", "shear"].sort());
  });

  test("getTemplate returns the right entry by id", () => {
    expect(getTemplate("rotation")?.label).toBe("Rotation 30°");
    expect(getTemplate("shear")?.label).toBe("Horizontal shear");
    expect(getTemplate("eigen-demo")?.label).toContain("Eigenvector");
    expect(getTemplate("nope")).toBeUndefined();
  });

  test("every template round-trips through encode → decode", () => {
    for (const t of TEMPLATES) {
      const nodes = t.graph.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
      })) as Node[];
      const edges = t.graph.edges.map((e) => {
        const edge: Edge = { id: e.id, source: e.source, target: e.target };
        if (e.sourceHandle !== undefined) edge.sourceHandle = e.sourceHandle;
        if (e.targetHandle !== undefined) edge.targetHandle = e.targetHandle;
        return edge;
      });
      const encoded = encodeGraph(nodes, edges);
      const decoded = decodeGraph(encoded);
      expect(decoded.ok).toBe(true);
      if (decoded.ok) {
        expect(decoded.graph.nodes.length).toBe(t.graph.nodes.length);
        expect(decoded.graph.edges.length).toBe(t.graph.edges.length);
      }
    }
  });

  test("every template's hash is URL-safe (no +, /, =)", () => {
    for (const t of TEMPLATES) {
      const hash = templateHash(t);
      expect(hash).not.toMatch(/[+/=]/);
    }
  });

  test("every template references only registered block ids", async () => {
    const { blockRegistry } = await import("~/blocks");
    const known = new Set(blockRegistry.list().map((b) => b.id));
    for (const t of TEMPLATES) {
      for (const n of t.graph.nodes) {
        expect(known.has(n.data.blockId)).toBe(true);
      }
    }
  });

  test("every template's edges reference only nodes inside the template", () => {
    for (const t of TEMPLATES) {
      const nodeIds = new Set(t.graph.nodes.map((n) => n.id));
      for (const e of t.graph.edges) {
        expect(nodeIds.has(e.source)).toBe(true);
        expect(nodeIds.has(e.target)).toBe(true);
      }
    }
  });
});
