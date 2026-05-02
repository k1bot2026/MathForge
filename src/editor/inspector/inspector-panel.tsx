"use client";

// Right-rail inspector. Mounts only when a node is selected (per
// docs/DESIGN_PRINCIPLES.md "Default is canvas-only. Rails open with
// intent."). Edits to ParamControl flow through useGraphStore's
// updateNodeParams, which mutates node.data.params and triggers the
// auto-evaluate subscription.

import { useShallow } from "zustand/react/shallow";
import { blockRegistry } from "~/blocks";
import type { ResolvedInputs, ResolvedParams } from "~/blocks/types";
import type { BlockNodeData } from "~/engine/graph-spec";
import type { EvalResult } from "~/engine/types";
import type { MathValue } from "~/math/types";
import { useGraphStore } from "~/store/graph-store";
import { ExplanationTabs } from "./explanation-tabs";
import { ParamControl } from "./param-control";

export function InspectorPanel() {
  const selectedId = useGraphStore((s) => s.selectedNodeId);
  const node = useGraphStore((s) =>
    selectedId !== null ? s.nodes.find((n) => n.id === selectedId) : undefined,
  );
  const result = useGraphStore((s) => (selectedId !== null ? s.results[selectedId] : undefined));
  const updateNodeParams = useGraphStore((s) => s.updateNodeParams);
  const setSelected = useGraphStore((s) => s.setSelectedNodeId);
  const inputs = useSelectedInputs(selectedId);

  if (selectedId === null || node === undefined) return null;

  const data = (node.data ?? {}) as Partial<BlockNodeData>;
  const def = blockRegistry.get(data.blockId ?? "");

  return (
    <aside
      data-testid="inspector-panel"
      className="absolute right-0 top-0 z-10 flex h-full w-80 flex-col gap-4 border-l border-border bg-surface p-4 shadow-block-3"
    >
      <header className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-fg">{def?.label ?? "Unknown block"}</h2>
        <button
          type="button"
          onClick={() => {
            setSelected(null);
          }}
          className="text-xs text-fg-muted hover:text-fg"
          data-testid="inspector-close"
          aria-label="Close inspector"
        >
          close
        </button>
      </header>

      {def === undefined ? (
        <p className="text-sm text-error">Block not registered: {data.blockId}</p>
      ) : (
        <>
          <ParamForm
            params={data.params ?? {}}
            specs={def.params ?? {}}
            onUpdate={(next) => {
              updateNodeParams(selectedId, next);
            }}
          />
          <ExplanationTabs def={def} inputs={inputs} result={result} />
        </>
      )}
    </aside>
  );
}

function ParamForm({
  params,
  specs,
  onUpdate,
}: {
  params: ResolvedParams;
  specs: NonNullable<import("~/blocks/types").BlockDefinition["params"]>;
  onUpdate: (next: ResolvedParams) => void;
}) {
  const entries = Object.entries(specs);
  if (entries.length === 0) {
    return <p className="text-xs text-fg-faint">No parameters.</p>;
  }
  return (
    <form
      className="flex flex-col gap-1"
      onSubmit={(e) => {
        e.preventDefault();
      }}
      data-testid="inspector-params"
    >
      {entries.map(([key, spec]) => (
        <ParamControl
          key={key}
          name={key}
          spec={spec}
          value={params[key] ?? spec.default}
          onChange={(v) => {
            onUpdate({ ...params, [key]: v });
          }}
        />
      ))}
    </form>
  );
}

/**
 * Walks the graph store's edges from the selected node, returning the
 * MathValues currently feeding its input ports. Empty when no node is
 * selected or when upstream nodes haven't computed yet.
 */
function useSelectedInputs(selectedId: string | null): ResolvedInputs {
  return useGraphStore(
    useShallow((s) => {
      if (selectedId === null) return {} as ResolvedInputs;
      const inputs: Record<string, MathValue> = {};
      for (const e of s.edges) {
        if (e.target !== selectedId) continue;
        const upstream: EvalResult | undefined = s.results[e.source];
        if (upstream === undefined || upstream.kind !== "value") continue;
        const port = e.targetHandle ?? "";
        inputs[port] = upstream.value;
      }
      return inputs;
    }),
  );
}
