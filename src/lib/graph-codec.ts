// URL-sharable codec for the graph state.
//
// Pipeline: { nodes, edges } → JSON string → utf-8 bytes →
// fflate.deflate (gzip-compatible deflate without checksum overhead) →
// base64url. Reverse on the way in, with hand-written validation
// guards on the parsed JSON before it's accepted as a graph.
//
// Schema versioning: every encoded payload carries a `schemaVersion`.
// When the structural shape changes (new node-data fields, edge changes,
// param-spec evolution), bump the version and add a migration here.
// Version history:
//   v1 — Phase 1: la.vector2, la.matrix2x2 block IDs.
//   v2 — Phase 2: la.vector (dim + c0..cN-1 params),
//                 la.matrix (rows + cols + r{i}c{j} params).
//
// fflate (pinned 0.8.2) replaces the docs/ARCHITECTURE.md "zstd" choice
// for Phase 1 — see docs/adr/0002-fflate-for-url-sharing.md.

import type { Edge, Node } from "@xyflow/react";
import { deflateSync, inflateSync, strFromU8, strToU8 } from "fflate";
import type { ResolvedParams } from "~/blocks/types";

export const GRAPH_SCHEMA_VERSION = 2;

export type SerializedNode = {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: { blockId: string; params?: ResolvedParams };
};

export type SerializedEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
};

export type SerializedGraph = {
  schemaVersion: typeof GRAPH_SCHEMA_VERSION;
  nodes: ReadonlyArray<SerializedNode>;
  edges: ReadonlyArray<SerializedEdge>;
};

export type DecodeResult = { ok: true; graph: SerializedGraph } | { ok: false; reason: string };

// ──────────────────────────────────────────────────────────────────────
// Migrations
// ──────────────────────────────────────────────────────────────────────

/**
 * Upgrades a v1 raw payload to v2 schema by remapping retired block IDs.
 * la.vector2 { x, y } → la.vector { dim: 2, c0: x, c1: y }
 * la.matrix2x2 { a, b, c, d } → la.matrix { rows:2, cols:2, r0c0:a, r0c1:b, r1c0:c, r1c1:d }
 */
function migrateV1toV2(raw: Record<string, unknown>): Record<string, unknown> {
  const nodes = Array.isArray(raw.nodes) ? raw.nodes : [];
  const migratedNodes = nodes.map((n: unknown) => {
    if (typeof n !== "object" || n === null) return n;
    const node = n as Record<string, unknown>;
    const data =
      typeof node.data === "object" && node.data !== null
        ? (node.data as Record<string, unknown>)
        : {};
    const blockId = data.blockId;
    const params =
      typeof data.params === "object" && data.params !== null
        ? (data.params as Record<string, unknown>)
        : {};

    if (blockId === "la.vector2") {
      return {
        ...node,
        data: {
          ...data,
          blockId: "la.vector",
          params: { dim: 2, c0: params.x ?? 0, c1: params.y ?? 0 },
        },
      };
    }
    if (blockId === "la.matrix2x2") {
      return {
        ...node,
        data: {
          ...data,
          blockId: "la.matrix",
          params: {
            rows: 2,
            cols: 2,
            r0c0: params.a ?? 0,
            r0c1: params.b ?? 0,
            r1c0: params.c ?? 0,
            r1c1: params.d ?? 0,
          },
        },
      };
    }
    return node;
  });
  return { ...raw, schemaVersion: 2, nodes: migratedNodes };
}

// ──────────────────────────────────────────────────────────────────────
// Encode
// ──────────────────────────────────────────────────────────────────────

export function encodeGraph(nodes: ReadonlyArray<Node>, edges: ReadonlyArray<Edge>): string {
  const payload: SerializedGraph = {
    schemaVersion: GRAPH_SCHEMA_VERSION,
    nodes: nodes.map(toSerializedNode),
    edges: edges.map(toSerializedEdge),
  };
  const json = JSON.stringify(payload);
  const compressed = deflateSync(strToU8(json), { level: 9 });
  return bytesToBase64Url(compressed);
}

function toSerializedNode(n: Node): SerializedNode {
  const data = (n.data ?? {}) as { blockId?: string; params?: ResolvedParams };
  return {
    id: n.id,
    type: n.type ?? "block",
    position: { x: n.position.x, y: n.position.y },
    data: {
      blockId: data.blockId ?? "unknown",
      ...(data.params !== undefined ? { params: data.params } : {}),
    },
  };
}

function toSerializedEdge(e: Edge): SerializedEdge {
  const out: SerializedEdge = { id: e.id, source: e.source, target: e.target };
  if (e.sourceHandle != null) out.sourceHandle = e.sourceHandle;
  if (e.targetHandle != null) out.targetHandle = e.targetHandle;
  return out;
}

// ──────────────────────────────────────────────────────────────────────
// Decode
// ──────────────────────────────────────────────────────────────────────

export function decodeGraph(encoded: string): DecodeResult {
  if (encoded.length === 0) return { ok: false, reason: "empty payload" };
  let bytes: Uint8Array;
  try {
    bytes = base64UrlToBytes(encoded);
  } catch (err) {
    return { ok: false, reason: `base64url decode: ${asMessage(err)}` };
  }
  let json: string;
  try {
    json = strFromU8(inflateSync(bytes));
  } catch (err) {
    return { ok: false, reason: `inflate: ${asMessage(err)}` };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    return { ok: false, reason: `json parse: ${asMessage(err)}` };
  }
  // Run v1→v2 migration before validation so old shared links still open.
  if (typeof parsed === "object" && parsed !== null) {
    const v = parsed as Record<string, unknown>;
    if (v.schemaVersion === 1) {
      parsed = migrateV1toV2(v);
    }
  }
  return validateGraph(parsed);
}

function validateGraph(value: unknown): DecodeResult {
  if (typeof value !== "object" || value === null) {
    return { ok: false, reason: "payload is not an object" };
  }
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== GRAPH_SCHEMA_VERSION) {
    return {
      ok: false,
      reason: `unsupported schemaVersion: ${String(v.schemaVersion)} (expected ${GRAPH_SCHEMA_VERSION})`,
    };
  }
  if (!Array.isArray(v.nodes) || !Array.isArray(v.edges)) {
    return { ok: false, reason: "nodes/edges must be arrays" };
  }
  const nodes: SerializedNode[] = [];
  for (let i = 0; i < v.nodes.length; i += 1) {
    const node = validateNode(v.nodes[i]);
    if (!node.ok) return { ok: false, reason: `nodes[${i}]: ${node.reason}` };
    nodes.push(node.value);
  }
  const edges: SerializedEdge[] = [];
  for (let i = 0; i < v.edges.length; i += 1) {
    const edge = validateEdge(v.edges[i]);
    if (!edge.ok) return { ok: false, reason: `edges[${i}]: ${edge.reason}` };
    edges.push(edge.value);
  }
  return {
    ok: true,
    graph: { schemaVersion: GRAPH_SCHEMA_VERSION, nodes, edges },
  };
}

type ValidateOk<T> = { ok: true; value: T };
type ValidateErr = { ok: false; reason: string };

function validateNode(raw: unknown): ValidateOk<SerializedNode> | ValidateErr {
  if (typeof raw !== "object" || raw === null) return { ok: false, reason: "not an object" };
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string") return { ok: false, reason: "id must be string" };
  if (typeof r.type !== "string") return { ok: false, reason: "type must be string" };
  if (typeof r.position !== "object" || r.position === null) {
    return { ok: false, reason: "position must be an object" };
  }
  const pos = r.position as Record<string, unknown>;
  if (typeof pos.x !== "number" || typeof pos.y !== "number") {
    return { ok: false, reason: "position.x and position.y must be numbers" };
  }
  if (typeof r.data !== "object" || r.data === null) {
    return { ok: false, reason: "data must be an object" };
  }
  const data = r.data as Record<string, unknown>;
  if (typeof data.blockId !== "string") {
    return { ok: false, reason: "data.blockId must be string" };
  }
  const node: SerializedNode = {
    id: r.id,
    type: r.type,
    position: { x: pos.x, y: pos.y },
    data: { blockId: data.blockId },
  };
  if (data.params !== undefined) {
    if (typeof data.params !== "object" || data.params === null) {
      return { ok: false, reason: "data.params must be an object when present" };
    }
    node.data.params = data.params as ResolvedParams;
  }
  return { ok: true, value: node };
}

function validateEdge(raw: unknown): ValidateOk<SerializedEdge> | ValidateErr {
  if (typeof raw !== "object" || raw === null) return { ok: false, reason: "not an object" };
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string") return { ok: false, reason: "id must be string" };
  if (typeof r.source !== "string") return { ok: false, reason: "source must be string" };
  if (typeof r.target !== "string") return { ok: false, reason: "target must be string" };
  const edge: SerializedEdge = { id: r.id, source: r.source, target: r.target };
  if (r.sourceHandle !== undefined) {
    if (typeof r.sourceHandle !== "string") {
      return { ok: false, reason: "sourceHandle must be string when present" };
    }
    edge.sourceHandle = r.sourceHandle;
  }
  if (r.targetHandle !== undefined) {
    if (typeof r.targetHandle !== "string") {
      return { ok: false, reason: "targetHandle must be string when present" };
    }
    edge.targetHandle = r.targetHandle;
  }
  return { ok: true, value: edge };
}

// ──────────────────────────────────────────────────────────────────────
// base64url codec — RFC 4648 §5 (URL-safe, no padding)
// ──────────────────────────────────────────────────────────────────────

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  const b64 =
    typeof btoa === "function" ? btoa(binary) : Buffer.from(binary, "binary").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  const binary =
    typeof atob === "function" ? atob(padded) : Buffer.from(padded, "base64").toString("binary");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function asMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "unknown error";
}
