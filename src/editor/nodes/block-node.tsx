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
import { blockRegistry } from "~/blocks";
import type { BlockDefinition, ColorToken } from "~/blocks/types";
import type { BlockNodeData } from "~/engine/graph-spec";
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
  const blockData = data as Partial<BlockNodeData>;
  const blockId = blockData.blockId ?? "unknown";
  const def = blockRegistry.get(blockId);
  const result = useGraphStore((s) => s.results[id]);

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

  return (
    <div
      data-testid={`block-${def.id}`}
      data-block-id={def.id}
      className={`min-w-[180px] rounded-[10px] border ${baseClasses} ${errorClasses} px-3 py-2 shadow-block-1 transition-shadow hover:shadow-block-2`}
    >
      <BlockHeader def={def} />
      <BlockBody result={result} />
      <BlockHandles def={def} />
    </div>
  );
}

function BlockHeader({ def }: { def: BlockDefinition }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-fg">
      <span className="text-sm font-medium">{def.label}</span>
      {def.symbol !== undefined ? (
        <span className="font-mono text-xs text-fg-muted">{def.symbol}</span>
      ) : null}
    </div>
  );
}

function BlockBody({ result }: { result: import("~/engine/types").EvalResult | undefined }) {
  if (result === undefined) {
    return <div className="mt-1 text-xs text-fg-faint">…computing</div>;
  }
  if (result.kind === "error") {
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
  return (
    <div className="mt-1" data-testid="block-value">
      <ValuePreview value={result.value} />
    </div>
  );
}

function ValuePreview({ value }: { value: import("~/math/types").MathValue }) {
  const t = value.type;
  if (t.kind === "Scalar") {
    return <span className="font-mono text-sm text-fg">{formatScalar(value.payload)}</span>;
  }
  if (t.kind === "Vector") {
    const arr = value.payload as ReadonlyArray<unknown>;
    return (
      <span className="font-mono text-xs text-fg-muted">[{arr.map(formatScalar).join(", ")}]</span>
    );
  }
  if (t.kind === "Matrix") {
    const rows = value.payload as ReadonlyArray<ReadonlyArray<unknown>>;
    return (
      <div className="font-mono text-xs text-fg-muted">
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
