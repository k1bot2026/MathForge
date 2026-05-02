// Template catalog.
//
// Each template is a complete SerializedGraph that can be loaded into
// the canvas via the URL hash (encodeGraph + base64url ↦ #...). Phase
// 1 ships three templates per docs/ROADMAP.md; the in-app picker UI
// lands in a later session (likely after Claude Design hands off the
// rail layout).

import type { Edge, Node } from "@xyflow/react";
import { encodeGraph } from "../graph-codec";
import { eigenDemoTemplate } from "./eigen-demo";
import { rotationTemplate } from "./rotation";
import { shearTemplate } from "./shear";
import type { Template } from "./types";

export type { Template } from "./types";

export const TEMPLATES: ReadonlyArray<Template> = [
  rotationTemplate,
  shearTemplate,
  eigenDemoTemplate,
];

const TEMPLATES_BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]));

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES_BY_ID.get(id);
}

/**
 * Returns the URL-hash payload for a given template — append to the
 * site origin as `#<hash>` to deep-link to the template state.
 */
export function templateHash(template: Template): string {
  const nodes = template.graph.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: n.data,
  })) as Node[];
  const edges = template.graph.edges.map((e) => {
    const edge: Edge = { id: e.id, source: e.source, target: e.target };
    if (e.sourceHandle !== undefined) edge.sourceHandle = e.sourceHandle;
    if (e.targetHandle !== undefined) edge.targetHandle = e.targetHandle;
    return edge;
  });
  return encodeGraph(nodes, edges);
}
