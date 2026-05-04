"use client";

// Right-rail inspector. Mounts only when a node is selected (per
// docs/DESIGN_PRINCIPLES.md "Default is canvas-only. Rails open with
// intent."). Implements the Claude Design explanation-panel handoff
// (design-handoff/2026-05-02-explanation-panel/): state chip in the
// header, value strip at the bottom for value-state nodes, resize
// handle on the left edge, slide-in animation, and workspace-scoped
// active tab persistence (delegated to useUiStore).

import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { blockRegistry } from "~/blocks";
import type { SubgraphDefinition } from "~/blocks/common/subgraph/types";
import type { BlockDefinition, ResolvedInputs, ResolvedParams } from "~/blocks/types";
import type { BlockNodeData } from "~/engine/graph-spec";
import type { EvalResult } from "~/engine/types";
import { useResizable } from "~/lib/use-resizable";
import { saveUserBlock } from "~/lib/user-blocks";
import type { MathValue } from "~/math/types";
import { useGraphStore } from "~/store/graph-store";
import { INSPECTOR_WIDTH_LIMITS, useUiStore } from "~/store/ui-store";
import { ExplanationTabs } from "./explanation-tabs";
import { derivePanelState } from "./panel-state";
import { ParamControl } from "./param-control";
import { StateChip } from "./state-chip";

export function InspectorPanel() {
  const selectedId = useGraphStore((s) => s.selectedNodeId);
  const node = useGraphStore((s) =>
    selectedId !== null ? s.nodes.find((n) => n.id === selectedId) : undefined,
  );
  const result = useGraphStore((s) => (selectedId !== null ? s.results[selectedId] : undefined));
  const updateNodeParams = useGraphStore((s) => s.updateNodeParams);
  const setSelected = useGraphStore((s) => s.setSelectedNodeId);
  const inputs = useSelectedInputs(selectedId);

  const width = useUiStore((s) => s.inspectorWidth);
  const setWidth = useUiStore((s) => s.setInspectorWidth);
  const { separatorProps } = useResizable({
    value: width,
    onChange: setWidth,
    min: INSPECTOR_WIDTH_LIMITS.min,
    max: INSPECTOR_WIDTH_LIMITS.max,
  });

  if (selectedId === null || node === undefined) return null;

  const data = (node.data ?? {}) as Partial<BlockNodeData>;
  const def = blockRegistry.get(data.blockId ?? "");
  const state = derivePanelState({ def, result });

  const dotClass = def !== undefined ? roleDotClass[def.color] : "bg-border";

  return (
    <aside
      data-testid="inspector-panel"
      className="inspector-panel absolute right-0 top-0 z-10 flex h-full flex-col gap-4 border-l border-border bg-surface p-4 shadow-block-3"
      style={{ width: `${width}px` }}
    >
      <div
        {...separatorProps}
        data-testid="inspector-resize"
        className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize hover:bg-fg-faint focus-visible:bg-fg-faint focus-visible:outline-none"
      />

      <header className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${dotClass}`} />
            <h2 className="text-sm font-semibold text-fg">{def?.label ?? "Unknown block"}</h2>
          </div>
          <span className="font-mono text-[11px] text-fg-muted">
            {data.blockId ?? "—"}
            {def !== undefined ? ` · ${def.category}` : null}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <StateChip state={state} />
          <button
            type="button"
            onClick={() => {
              setSelected(null);
            }}
            className="font-mono text-[10px] uppercase tracking-wider text-fg-muted hover:text-fg"
            data-testid="inspector-close"
            aria-label="Close inspector"
          >
            close
          </button>
        </div>
      </header>

      <div className="inspector-body flex flex-1 flex-col gap-4">
        {def === undefined ? (
          <p className="text-sm text-fg-muted">Block not registered: {data.blockId}</p>
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
            {"subgraph" in def ? <SaveAsBlockButton def={def as SubgraphDefinition} /> : null}
          </>
        )}
      </div>

      {state === "value" && def?.previewRenderer !== undefined && result?.kind === "value" ? (
        <div
          data-testid="inspector-preview"
          className="-mx-4 border-t border-border px-4 pt-3 pb-1"
        >
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            preview
          </span>
          {(() => {
            const Preview = def.previewRenderer;
            return <Preview value={result.value} inputs={inputs} />;
          })()}
        </div>
      ) : null}

      {state === "value" ? <ValueStrip result={result} /> : null}
    </aside>
  );
}

const roleDotClass: Readonly<Record<BlockDefinition["color"], string>> = {
  source: "bg-role-source-border",
  operation: "bg-role-operation-border",
  function: "bg-role-function-border",
  visualizer: "bg-role-visualizer-border",
  stochastic: "bg-role-stochastic-border",
  control: "bg-role-control-border",
};

function ParamForm({
  params,
  specs,
  onUpdate,
}: {
  params: ResolvedParams;
  specs: NonNullable<BlockDefinition["params"]>;
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

function ValueStrip({ result }: { result: EvalResult | undefined }) {
  if (result === undefined || result.kind !== "value") return null;
  return (
    <div
      data-testid="inspector-value-strip"
      className="-mx-4 -mb-4 mt-auto border-t border-border bg-surface-2 px-4 py-2"
    >
      <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">value</span>
      <p className="mt-0.5 truncate font-mono text-xs text-fg">
        {formatPayload(result.value.payload)}
      </p>
    </div>
  );
}

function formatPayload(payload: unknown): string {
  if (typeof payload === "number") {
    if (Number.isInteger(payload)) return String(payload);
    return payload.toPrecision(6).replace(/0+$/, "").replace(/\.$/, "");
  }
  if (Array.isArray(payload)) {
    if (Array.isArray(payload[0])) {
      return `[${(payload as unknown[][])
        .map((row) => `[${row.map(String).join(", ")}]`)
        .join(", ")}]`;
    }
    return `[${(payload as unknown[]).map(String).join(", ")}]`;
  }
  if (typeof payload === "boolean") return String(payload);
  if (payload === null || payload === undefined) return "—";
  return String(payload);
}

function SaveAsBlockButton({ def }: { def: SubgraphDefinition }) {
  const [name, setName] = useState(def.label);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    const trimmed = name.trim();
    if (trimmed.length === 0) return;
    const id = `user.${trimmed.toLowerCase().replace(/\s+/g, "-")}`;
    void saveUserBlock({
      id,
      label: trimmed,
      version: 1,
      subgraph: def.subgraph,
      inputPorts: [...def.inputs],
      outputPorts: [...def.outputs],
    }).then(() => {
      blockRegistry.registerOrReplace(def);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="flex flex-col gap-1.5 border-t border-border pt-3">
      <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
        save as block
      </span>
      <div className="flex gap-1.5">
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          className="min-w-0 flex-1 rounded border border-border bg-surface-2 px-2 py-1 font-mono text-xs text-fg focus:outline-none focus:ring-1 focus:ring-role-control-border"
          placeholder="Block name"
          data-testid="save-as-block-name"
        />
        <button
          type="button"
          onClick={handleSave}
          className="shrink-0 rounded bg-role-control-border px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-bg hover:opacity-80"
          data-testid="save-as-block-btn"
        >
          {saved ? "saved" : "save"}
        </button>
      </div>
    </div>
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
