"use client";

// Generic block visual. Looks up its BlockDefinition in the singleton
// registry, renders chrome (label, optional symbol, role-coloured
// background, input/output handles) and surfaces the latest evaluator
// output (value preview, error border + tooltip).
//
// Per docs/BRAND.md: handle radius 6px (Tailwind w-3 h-3 = 12px square →
// React Flow draws a circle); handle hit area 18px (extended via CSS in
// the React Flow stylesheet); block min-w 180px, padding 12px (px-3 py-2).

import { Handle, type NodeProps, Position } from "@xyflow/react";
import { useShallow } from "zustand/react/shallow";
import { blockRegistry } from "~/blocks";
import type { BlockDefinition, ColorToken, ResolvedInputs } from "~/blocks/types";
import type { BlockNodeData } from "~/engine/graph-spec";
import type { EvalResult } from "~/engine/types";
import type { MathValue } from "~/math/types";
import { useGraphStore } from "~/store/graph-store";

const fillByRole: Readonly<Record<ColorToken, string>> = {
  source: "bg-role-source-fill border-role-source-border",
  operation: "bg-role-operation-fill border-role-operation-border",
  function: "bg-role-function-fill border-role-function-border",
  visualizer: "bg-role-visualizer-fill border-role-visualizer-border",
  stochastic: "bg-role-stochastic-fill border-role-stochastic-border",
  control: "bg-role-control-fill border-role-control-border",
};

export function BlockNode({ id, data }: NodeProps) {
  const blockData = data as Partial<BlockNodeData> & { justAppeared?: boolean };
  const blockId = blockData.blockId ?? "unknown";
  const def = blockRegistry.get(blockId);
  const result = useGraphStore((s) => s.results[id]);
  const inputs = useNodeInputs(id);
  const justAppeared = blockData.justAppeared === true;

  if (def === undefined) {
    return (
      <div
        data-testid={`unknown-block-${id}`}
        className="min-w-[180px] rounded-[10px] border border-error bg-surface px-3 py-2 text-sm text-error shadow-block-1"
      >
        Unknown block: {blockId}
      </div>
    );
  }

  const isError = result?.kind === "error";
  const baseClasses = fillByRole[def.color];
  const errorClasses = isError ? "ring-2 ring-error" : "";
  const params = (blockData.params ?? {}) as Record<string, unknown>;

  return (
    <div
      data-testid={`block-${def.id}`}
      data-block-id={def.id}
      data-just-appeared={justAppeared ? "true" : undefined}
      className={`replay-glow-target min-w-[180px] rounded-[10px] border ${baseClasses} ${errorClasses} px-3 py-2 shadow-block-1 transition-shadow hover:shadow-block-2`}
    >
      <BlockHeader def={def} />
      <PortLabels def={def} />
      <ParamStrip def={def} params={params} />
      <BlockBody def={def} result={result} inputs={inputs} />
      <BlockHandles def={def} />
    </div>
  );
}

/** Walks edges from this node and collects upstream MathValues. Wrapped in
 *  useShallow so the freshly-built object reference doesn't trip Zustand v5's
 *  infinite-loop guard. */
function useNodeInputs(nodeId: string): ResolvedInputs {
  return useGraphStore(
    useShallow((s) => {
      const inputs: Record<string, MathValue> = {};
      for (const e of s.edges) {
        if (e.target !== nodeId) continue;
        const upstream: EvalResult | undefined = s.results[e.source];
        if (upstream === undefined || upstream.kind !== "value") continue;
        const port = e.targetHandle ?? "";
        inputs[port] = upstream.value;
      }
      return inputs;
    }),
  );
}

function BlockHeader({ def }: { def: BlockDefinition }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-fg">
      <span className="text-sm font-semibold leading-tight">{def.label}</span>
      {def.symbol !== undefined ? (
        <span className="font-mono text-xs text-fg-muted">{def.symbol}</span>
      ) : null}
    </div>
  );
}

function PortLabels({ def }: { def: BlockDefinition }) {
  const hasInputs = def.inputs.length > 0;
  const hasOutputs = def.outputs.length > 0;
  if (!hasInputs && !hasOutputs) return null;

  return (
    <div className="mt-1.5 flex justify-between gap-2">
      <div className="flex flex-col gap-0.5">
        {def.inputs.map((port) => (
          <span key={port.id} className="font-mono text-[10px] text-fg-faint leading-none">
            {port.label}
          </span>
        ))}
      </div>
      <div className="flex flex-col items-end gap-0.5">
        {def.outputs.map((port) => (
          <span key={port.id} className="font-mono text-[10px] text-fg-faint leading-none">
            {port.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function ParamStrip({ def, params }: { def: BlockDefinition; params: Record<string, unknown> }) {
  const specs = def.params;
  if (specs === undefined) return null;
  const entries = Object.entries(specs);
  if (entries.length === 0) return null;

  const snippets = entries
    .slice(0, 4)
    .map(([key, _spec]) => {
      const val = params[key] ?? _spec.default;
      return `${key}=${String(val)}`;
    })
    .join(" · ");

  return (
    <div className="mt-1 truncate font-mono text-[10px] text-fg-faint" title={snippets}>
      {snippets}
    </div>
  );
}

function BlockBody({
  def,
  result,
  inputs,
}: {
  def: BlockDefinition;
  result: EvalResult | undefined;
  inputs: ResolvedInputs;
}) {
  if (result === undefined && def.visualization === undefined) {
    return <div className="mt-1 text-xs text-fg-faint">…computing</div>;
  }
  if (result?.kind === "error") {
    return (
      <div
        className="mt-1 text-xs text-error"
        title={result.error.message}
        data-testid="block-error"
      >
        {result.error.message}
      </div>
    );
  }
  if (def.visualization !== undefined) {
    const Viz = def.visualization;
    const output = result?.kind === "value" ? result.value : undefined;
    return (
      <div className="mt-2" data-testid="block-visualization">
        <Viz inputs={inputs} output={output} />
      </div>
    );
  }
  if (result?.kind === "value") {
    return (
      <div className="mt-1.5 rounded bg-bg/50 px-2 py-1" data-testid="block-value">
        <ValuePreview value={result.value} />
      </div>
    );
  }
  return null;
}

function ValuePreview({ value }: { value: import("~/math/types").MathValue }) {
  const t = value.type;
  if (t.kind === "Scalar") {
    return <span className="font-mono text-sm text-fg">{formatScalar(value.payload)}</span>;
  }
  if (t.kind === "Vector") {
    const arr = value.payload as ReadonlyArray<unknown>;
    return <span className="font-mono text-xs text-fg">[{arr.map(formatScalar).join(", ")}]</span>;
  }
  if (t.kind === "Matrix") {
    const rows = value.payload as ReadonlyArray<ReadonlyArray<unknown>>;
    return (
      <div className="font-mono text-xs text-fg">
        {rows.map((row, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: matrix rows are positionally addressed; row reordering is not a thing here.
          <div key={i}>[{row.map(formatScalar).join(", ")}]</div>
        ))}
      </div>
    );
  }
  return <span className="text-xs text-fg-faint">{t.kind}</span>;
}

function formatScalar(value: unknown): string {
  if (typeof value === "number") {
    if (Number.isInteger(value)) return String(value);
    return value.toPrecision(6).replace(/0+$/, "").replace(/\.$/, "");
  }
  if (typeof value === "boolean") return String(value);
  if (value === null || value === undefined) return "?";
  return String(value);
}

function BlockHandles({ def }: { def: BlockDefinition }) {
  return (
    <>
      {def.inputs.map((port, i, all) => (
        <Handle
          key={port.id}
          type="target"
          position={Position.Left}
          id={port.id}
          style={{ top: handleOffset(i, all.length) }}
        />
      ))}
      {def.outputs.map((port, i, all) => (
        <Handle
          key={port.id}
          type="source"
          position={Position.Right}
          id={port.id}
          style={{ top: handleOffset(i, all.length) }}
        />
      ))}
    </>
  );
}

function handleOffset(index: number, count: number): string {
  if (count <= 1) return "50%";
  const step = 100 / (count + 1);
  return `${step * (index + 1)}%`;
}
