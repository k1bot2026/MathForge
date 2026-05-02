// Shared Storybook helpers for per-block stories.
//
// The whole Phase-1 block library renders through the generic
// BlockNode (with optional `definition.visualization`), so block
// stories all look like:
//   <ReactFlowProvider>
//     <ResultPrimer ... />        ← seeds the store with a fake EvalResult
//     <BlockNode {...stubProps} />
//   </ReactFlowProvider>
//
// This module centralises the boilerplate so each block-folder's
// *.stories.tsx can stay a few lines.

import { type NodeProps, ReactFlowProvider } from "@xyflow/react";
import { type ReactNode, useEffect } from "react";
import type { EvalResult } from "~/engine/types";
import type { MathValue } from "~/math/types";
import { useGraphStore } from "~/store/graph-store";

export function makeStubProps(
  id: string,
  blockId: string,
  params: Record<string, unknown> = {},
): NodeProps {
  return {
    id,
    type: "block",
    data: { blockId, params },
    selected: false,
    isConnectable: true,
    zIndex: 1,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    dragging: false,
  } as unknown as NodeProps;
}

export function provenance(blockId: string): MathValue["provenance"] {
  return { blockId, inputs: [], computedAt: 0, engine: "native" };
}

export function StoryFrame({ children }: { children: ReactNode }) {
  return (
    <ReactFlowProvider>
      <div className="bg-bg p-12">{children}</div>
    </ReactFlowProvider>
  );
}

/**
 * Pokes the graph store with the given EvalResults so visualizers and
 * value-preview blocks can render their non-empty state in Storybook
 * without spinning up the full evaluator. Pass `undefined` per id to
 * leave that node in the "computing" placeholder state.
 */
export function ResultPrimer({
  results,
  upstreamEdges,
}: {
  results: ReadonlyArray<{ id: string; result: EvalResult | undefined }>;
  /** Optional fake edges so useNodeInputs() can resolve upstream values
   *  for visualizer blocks that need them. */
  upstreamEdges?: ReadonlyArray<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
  }>;
}) {
  useEffect(() => {
    const store = useGraphStore.getState();
    const map = new Map<string, EvalResult>();
    for (const { id, result } of results) {
      if (result !== undefined) map.set(id, result);
    }
    store.setResults(map);
    if (upstreamEdges !== undefined && upstreamEdges.length > 0) {
      // Replace the seed graph with a minimal one carrying just the
      // upstream nodes (so useNodeInputs() walks them) — kept inside
      // the effect so Storybook hot-reloads pick up param changes.
      store.setEdges(
        upstreamEdges.map((e) => {
          const edge: {
            id: string;
            source: string;
            target: string;
            sourceHandle?: string;
            targetHandle?: string;
          } = { id: e.id, source: e.source, target: e.target };
          if (e.sourceHandle !== undefined) edge.sourceHandle = e.sourceHandle;
          if (e.targetHandle !== undefined) edge.targetHandle = e.targetHandle;
          return edge;
        }),
      );
    }
  }, [results, upstreamEdges]);
  return null;
}
