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
import type {
  BlockDefinition,
  ColorToken,
  InputPort,
  OutputPort,
  ParamSpec,
  ResolvedInputs,
} from "~/blocks/types";
import { Tooltip } from "~/components/tooltip";
import type { BlockNodeData } from "~/engine/graph-spec";
import type { EvalResult } from "~/engine/types";
import type { MathType, MathValue } from "~/math/types";
import { useGraphStore } from "~/store/graph-store";

const fillByRole: Readonly<Record<ColorToken, string>> = {
  source: "bg-role-source-fill border-role-source-border",
  operation: "bg-role-operation-fill border-role-operation-border",
  function: "bg-role-function-fill border-role-function-border",
  visualizer: "bg-role-visualizer-fill border-role-visualizer-border",
  stochastic: "bg-role-stochastic-fill border-role-stochastic-border",
  control: "bg-role-control-fill border-role-control-border",
};

// Blocks with more than this many params get a read-only strip instead
// of inline editors to avoid overwhelming the node body.
const INLINE_PARAM_LIMIT = 3;

export function BlockNode({ id, data }: NodeProps) {
  const blockData = data as Partial<BlockNodeData> & { justAppeared?: boolean };
  const blockId = blockData.blockId ?? "unknown";
  const def = blockRegistry.get(blockId);
  const result = useGraphStore((s) => s.results[id]);
  const inputs = useNodeInputs(id);
  const updateNodeParams = useGraphStore((s) => s.updateNodeParams);
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
  const paramEntries = Object.entries(def.params ?? {});
  const useInlineParams = paramEntries.length > 0 && paramEntries.length <= INLINE_PARAM_LIMIT;

  function handleParamChange(key: string, value: unknown) {
    updateNodeParams(id, { ...params, [key]: value });
  }

  return (
    <div
      data-testid={`block-${def.id}`}
      data-block-id={def.id}
      data-just-appeared={justAppeared ? "true" : undefined}
      className={`replay-glow-target min-w-[180px] rounded-[10px] border ${baseClasses} ${errorClasses} px-3 py-2 shadow-block-1 transition-shadow hover:shadow-block-2`}
    >
      <BlockHeader def={def} />
      <PortLabels def={def} />
      {useInlineParams ? (
        <InlineParams entries={paramEntries} params={params} onChange={handleParamChange} />
      ) : (
        <ParamStrip entries={paramEntries} params={params} />
      )}
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
          <Tooltip key={port.id} content={portTooltip(port)} side="left" delay={250}>
            <span className="font-mono text-[10px] leading-none text-fg-faint cursor-default">
              {port.label}
            </span>
          </Tooltip>
        ))}
      </div>
      <div className="flex flex-col items-end gap-0.5">
        {def.outputs.map((port) => (
          <Tooltip key={port.id} content={portTooltip(port)} side="right" delay={250}>
            <span className="font-mono text-[10px] leading-none text-fg-faint cursor-default">
              {port.label}
            </span>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

function portTooltip(port: InputPort | OutputPort): React.ReactNode {
  const typeStr = formatMathType(typeof port.type === "function" ? null : port.type);
  return (
    <span className="flex flex-col gap-0.5">
      <span className="font-semibold text-fg">{port.label}</span>
      <span className="text-fg-muted">{typeStr}</span>
    </span>
  );
}

function formatMathType(t: MathType | null): string {
  if (t === null) return "polymorphic";
  switch (t.kind) {
    case "Scalar":
      return `Scalar(${t.field})`;
    case "Vector":
      return `Vector<${String(t.n)}, ${t.field}>`;
    case "Matrix":
      return `Matrix<${String(t.m)}×${String(t.n)}, ${t.field}>`;
    case "Point":
      return `Point<${String(t.n)}>`;
    case "Line":
      return `Line(${t.n}D)`;
    case "Circle":
      return "Circle";
    case "Sphere":
      return "Sphere";
    case "Polygon":
      return "Polygon";
    case "Distribution":
      return `Distribution(${typeof t.family === "string" ? t.family : t.family.custom})`;
    case "Function":
      return `Function(arity=${t.arity})`;
    case "Expression":
      return `Expression[${t.freeVars.join(",")}]`;
    case "Tuple":
      return `Tuple(${t.elements.length})`;
    case "Set":
      return `Set<${formatMathType(t.element)}>`;
    default:
      return t.kind;
  }
}

function InlineParams({
  entries,
  params,
  onChange,
}: {
  entries: [string, ParamSpec][];
  params: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  return (
    // nodrag prevents React Flow from starting a node-drag when the user
    // clicks/drags inside an input or select element.
    <div className="nodrag mt-2 flex flex-col gap-1.5">
      {entries.map(([key, spec]) => {
        const value = params[key] ?? spec.default;
        const label = spec.label ?? key;
        return (
          <InlineControl
            key={key}
            paramKey={key}
            label={label}
            spec={spec}
            value={value}
            onChange={onChange}
          />
        );
      })}
    </div>
  );
}

function InlineControl({
  paramKey,
  label,
  spec,
  value,
  onChange,
}: {
  paramKey: string;
  label: string;
  spec: ParamSpec;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
}) {
  const baseClass =
    "w-full rounded border border-border bg-bg/70 px-1.5 py-0.5 font-mono text-xs text-fg focus:outline-none focus:ring-1 focus:ring-role-control-border";

  if (spec.kind === "number" || spec.kind === "integer") {
    const numVal = typeof value === "number" ? value : Number(value ?? spec.default);
    const hasRange = spec.min !== undefined && spec.max !== undefined;

    if (hasRange) {
      return (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-fg-muted">{label}</span>
            <span className="font-mono text-[10px] text-fg">
              {Number.isInteger(numVal) ? numVal : numVal.toPrecision(4)}
            </span>
          </div>
          <input
            type="range"
            min={spec.min}
            max={spec.max}
            step={spec.kind === "integer" ? 1 : "step" in spec ? (spec.step ?? 0.01) : 0.01}
            value={Number.isFinite(numVal) ? numVal : spec.default}
            onChange={(e) => {
              const raw =
                spec.kind === "integer"
                  ? Number.parseInt(e.target.value, 10)
                  : Number(e.target.value);
              onChange(paramKey, Number.isFinite(raw) ? raw : spec.default);
            }}
            className="nodrag h-1.5 w-full cursor-pointer accent-role-control-border"
          />
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <span className="w-12 shrink-0 font-mono text-[10px] text-fg-muted">{label}</span>
        <input
          type="number"
          value={Number.isFinite(numVal) ? numVal : spec.default}
          step={spec.kind === "integer" ? 1 : "step" in spec ? (spec.step ?? "any") : "any"}
          {...(spec.min !== undefined ? { min: spec.min } : {})}
          {...(spec.max !== undefined ? { max: spec.max } : {})}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              onChange(paramKey, spec.default);
              return;
            }
            const next = spec.kind === "integer" ? Number.parseInt(raw, 10) : Number(raw);
            onChange(paramKey, Number.isFinite(next) ? next : spec.default);
          }}
          className={baseClass}
        />
      </div>
    );
  }

  if (spec.kind === "boolean") {
    const checked = typeof value === "boolean" ? value : spec.default;
    return (
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            onChange(paramKey, e.target.checked);
          }}
          className="h-3.5 w-3.5 rounded border border-border accent-role-control-border"
        />
        <span className="font-mono text-[10px] text-fg-muted">{label}</span>
      </label>
    );
  }

  if (spec.kind === "select") {
    const current = typeof value === "string" ? value : spec.default;
    return (
      <div className="flex items-center gap-2">
        <span className="w-12 shrink-0 font-mono text-[10px] text-fg-muted">{label}</span>
        <select
          value={current}
          onChange={(e) => {
            onChange(paramKey, e.target.value);
          }}
          className={baseClass}
        >
          {spec.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // string
  const stringVal = typeof value === "string" ? value : spec.default;
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 font-mono text-[10px] text-fg-muted">{label}</span>
      <input
        type="text"
        value={stringVal}
        onChange={(e) => {
          onChange(paramKey, e.target.value);
        }}
        className={baseClass}
      />
    </div>
  );
}

function ParamStrip({
  entries,
  params,
}: {
  entries: [string, ParamSpec][];
  params: Record<string, unknown>;
}) {
  if (entries.length === 0) return null;

  const snippets = entries
    .slice(0, 4)
    .map(([key, spec]) => {
      const val = params[key] ?? spec.default;
      return `${key}=${String(val)}`;
    })
    .join(" · ");

  const fullSnippets = entries
    .map(([key, spec]) => {
      const val = params[key] ?? spec.default;
      const label = spec.label ?? key;
      return `${label}: ${String(val)}`;
    })
    .join("\n");

  return (
    <Tooltip
      content={<span className="whitespace-pre-line">{fullSnippets}</span>}
      side="bottom"
      delay={200}
    >
      <div className="mt-1 truncate font-mono text-[10px] text-fg-faint cursor-default">
        {snippets}
      </div>
    </Tooltip>
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
