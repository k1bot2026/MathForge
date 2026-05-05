"use client";

// Right-rail inspector — redesigned for UX Round 2/4.
// Layout (top to bottom):
//   1. Header: block name, id·category, StateChip, close
//   2. Edit | Explain mode toggle
//   3. Edit mode: Live preview + compact param controls (matrix grid, sliders, etc.)
//      Explain mode: Four explanation tabs (what / why / effect / impact)
//   4. Value strip (pinned to bottom)

import { useCallback, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { blockRegistry } from "~/blocks";
import type { SubgraphDefinition } from "~/blocks/common/subgraph/types";
import type { BlockDefinition, ResolvedInputs, ResolvedParams } from "~/blocks/types";
import { Tooltip } from "~/components/tooltip";
import { BLOCK_PREVIEWS } from "~/editor/block-previews";
import type { BlockNodeData } from "~/engine/graph-spec";
import type { EvalResult } from "~/engine/types";
import { useResizable } from "~/lib/use-resizable";
import { saveUserBlock } from "~/lib/user-blocks";
import type { MathValue } from "~/math/types";
import { useGraphStore } from "~/store/graph-store";
import { INSPECTOR_WIDTH_LIMITS, useUiStore } from "~/store/ui-store";
import {
  BernoulliEditor,
  BetaEditor,
  BinomialEditor,
  GammaEditor,
  NormalEditor,
  PoissonEditor,
  UniformEditor,
} from "./distribution-editor";
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
      className="inspector-panel absolute right-0 top-0 z-10 flex h-full flex-col border-l border-border bg-surface shadow-block-3"
      style={{ width: `${width}px` }}
    >
      <div
        {...separatorProps}
        data-testid="inspector-resize"
        className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize hover:bg-fg-faint focus-visible:bg-fg-faint focus-visible:outline-none"
      />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
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
            ✕
          </button>
        </div>
      </header>

      <InspectorBody
        def={def}
        result={result}
        inputs={inputs}
        params={(data.params ?? {}) as Record<string, unknown>}
        selectedId={selectedId}
        updateNodeParams={updateNodeParams}
      />

      {/* ── Value strip ──────────────────────────────────────────────── */}
      {state === "value" ? <ValueStrip result={result} /> : null}
    </aside>
  );
}

// ── Inspector body (Edit / Explain modes) ────────────────────────────────

type InspectorMode = "edit" | "explain";

function InspectorBody({
  def,
  result,
  inputs,
  params,
  selectedId,
  updateNodeParams,
}: {
  def: BlockDefinition | undefined;
  result: EvalResult | undefined;
  inputs: ResolvedInputs;
  params: Record<string, unknown>;
  selectedId: string;
  updateNodeParams: (id: string, params: Record<string, unknown>) => void;
}) {
  const [mode, setMode] = useState<InspectorMode>("edit");

  return (
    <div className="inspector-body themed-scrollbar flex flex-1 flex-col overflow-y-auto">
      {def === undefined ? (
        <p className="p-4 text-sm text-fg-muted">Block not registered.</p>
      ) : (
        <>
          {/* ── Mode toggle ──────────────────────────────────────── */}
          <div className="flex gap-0.5 border-b border-border bg-surface-2 p-1.5">
            {(["edit", "explain"] as InspectorMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                  m === mode ? "bg-surface text-fg shadow-block-1" : "text-fg-muted hover:text-fg"
                }`}
                aria-pressed={m === mode}
                data-testid={`inspector-mode-${m}`}
              >
                {m}
              </button>
            ))}
          </div>

          {mode === "edit" ? (
            <>
              {/* ── Live preview ─────────────────────────────────── */}
              <LivePreview def={def} result={result} inputs={inputs} params={params} />

              {/* ── Param controls ───────────────────────────────── */}
              <ParamSection
                blockId={def.id}
                params={params}
                specs={def.params ?? {}}
                onUpdate={(next) => {
                  updateNodeParams(selectedId, next);
                }}
              />
            </>
          ) : (
            /* ── Explain mode ──────────────────────────────────── */
            <div className="p-4">
              <ExplanationTabs def={def} inputs={inputs} result={result} />
            </div>
          )}

          {"subgraph" in def ? <SaveAsBlockButton def={def as SubgraphDefinition} /> : null}
        </>
      )}
    </div>
  );
}

// ── Live preview ──────────────────────────────────────────────────────────

function LivePreview({
  def,
  result,
  inputs,
}: {
  def: BlockDefinition;
  result: EvalResult | undefined;
  inputs: ResolvedInputs;
  params: Record<string, unknown>;
}) {
  const preview = BLOCK_PREVIEWS[def.id] ?? def.preview;
  const hasViz = def.visualization !== undefined;
  const hasPreviewRenderer = def.previewRenderer !== undefined && result?.kind === "value";
  const hasPreviewSvg = preview !== undefined;

  if (!hasViz && !hasPreviewRenderer && !hasPreviewSvg) {
    return (
      <div className="flex items-center justify-center border-b border-border bg-surface-2 py-6">
        <span className="font-mono text-3xl text-fg-muted" aria-hidden="true">
          {def.symbol ?? "?"}
        </span>
      </div>
    );
  }

  const colorToken = def.color;
  const bgClass = previewBg[colorToken];

  return (
    <div
      className={`flex items-center justify-center border-b border-border ${bgClass} overflow-hidden`}
      style={{ minHeight: 160 }}
      data-testid="inspector-live-preview"
    >
      {hasViz && def.visualization !== undefined ? (
        (() => {
          const Viz = def.visualization;
          const output = result?.kind === "value" ? result.value : undefined;
          return (
            <div className="p-2">
              <Viz inputs={inputs} output={output} />
            </div>
          );
        })()
      ) : hasPreviewRenderer && def.previewRenderer !== undefined ? (
        (() => {
          const Preview = def.previewRenderer;
          const value = (result as { kind: "value"; value: MathValue }).value;
          return (
            <div className="p-2" data-testid="inspector-preview">
              <Preview value={value} inputs={inputs} />
            </div>
          );
        })()
      ) : (
        <div className="flex scale-150 items-center justify-center" aria-hidden="true">
          {preview}
        </div>
      )}
    </div>
  );
}

const previewBg: Readonly<Record<BlockDefinition["color"], string>> = {
  source: "bg-role-source-fill",
  operation: "bg-role-operation-fill",
  function: "bg-role-function-fill",
  visualizer: "bg-role-visualizer-fill",
  stochastic: "bg-role-stochastic-fill",
  control: "bg-role-control-fill",
};

// ── Param section ─────────────────────────────────────────────────────────

// Matches la.matrix cell params: r{row}c{col}
const CELL_PARAM_RE = /^r(\d+)c(\d+)$/;
// Matches la.vector component params: c{index}
const COMP_PARAM_RE = /^c(\d+)$/;

// Map block ids to their DistributionEditor component
function DistributionEditor({
  blockId,
  params,
  onUpdate,
}: {
  blockId: string;
  params: ResolvedParams;
  onUpdate: (next: ResolvedParams) => void;
}) {
  switch (blockId) {
    case "stats.normal":
      return <NormalEditor params={params} onUpdate={onUpdate} />;
    case "stats.beta":
      return <BetaEditor params={params} onUpdate={onUpdate} />;
    case "stats.bernoulli":
      return <BernoulliEditor params={params} onUpdate={onUpdate} />;
    case "stats.binomial":
      return <BinomialEditor params={params} onUpdate={onUpdate} />;
    case "stats.poisson":
      return <PoissonEditor params={params} onUpdate={onUpdate} />;
    case "stats.gamma":
      return <GammaEditor params={params} onUpdate={onUpdate} />;
    case "stats.uniform":
      return <UniformEditor params={params} onUpdate={onUpdate} />;
    default:
      return null;
  }
}

const DIST_BLOCK_IDS = new Set([
  "stats.normal",
  "stats.beta",
  "stats.bernoulli",
  "stats.binomial",
  "stats.poisson",
  "stats.gamma",
  "stats.uniform",
]);

function ParamSection({
  blockId,
  params,
  specs,
  onUpdate,
}: {
  blockId: string;
  params: ResolvedParams;
  specs: NonNullable<BlockDefinition["params"]>;
  onUpdate: (next: ResolvedParams) => void;
}) {
  const entries = Object.entries(specs);
  const isDistBlock = DIST_BLOCK_IDS.has(blockId);

  // Separate cell/component params from regular params
  const cellEntries = entries.filter(([k]) => CELL_PARAM_RE.test(k));
  const compEntries = entries.filter(([k]) => COMP_PARAM_RE.test(k));
  const regularEntries = entries.filter(([k]) => !CELL_PARAM_RE.test(k) && !COMP_PARAM_RE.test(k));

  const hasGrid = cellEntries.length > 0 || compEntries.length > 0;

  return (
    <div className="border-b border-border p-4" data-testid="inspector-params">
      {entries.length === 0 ? <p className="text-xs text-fg-faint">No parameters.</p> : null}
      <span className="mb-3 block font-mono text-[10px] uppercase tracking-wider text-fg-muted">
        Parameters
      </span>
      <div className="flex flex-col gap-2">
        {isDistBlock ? (
          <DistributionEditor blockId={blockId} params={params} onUpdate={onUpdate} />
        ) : null}
        {regularEntries.map(([key, spec]) => (
          <Tooltip key={key} content={paramTooltip(key, spec)} side="left" delay={400}>
            <div>
              <ParamControl
                name={key}
                spec={spec}
                value={params[key] ?? spec.default}
                onChange={(v) => {
                  onUpdate({ ...params, [key]: v });
                }}
              />
            </div>
          </Tooltip>
        ))}
        {hasGrid && cellEntries.length > 0 ? (
          <MatrixGridEditor
            rows={typeof params.rows === "number" ? params.rows : 2}
            cols={typeof params.cols === "number" ? params.cols : 2}
            params={params}
            onUpdate={onUpdate}
          />
        ) : null}
        {hasGrid && compEntries.length > 0 && cellEntries.length === 0 ? (
          <VectorGridEditor
            dim={typeof params.dim === "number" ? params.dim : 2}
            params={params}
            onUpdate={onUpdate}
          />
        ) : null}
      </div>
    </div>
  );
}

// ── Matrix / Vector grid editors with scrub cells ─────────────────────────

function MatrixGridEditor({
  rows,
  cols,
  params,
  onUpdate,
}: {
  rows: number;
  cols: number;
  params: ResolvedParams;
  onUpdate: (next: ResolvedParams) => void;
}) {
  const clampedRows = Math.max(1, Math.min(rows, 8));
  const clampedCols = Math.max(1, Math.min(cols, 8));

  // Compute max abs value across visible cells for heatmap normalisation
  let maxAbs = 0;
  for (let r = 0; r < clampedRows; r++) {
    for (let c = 0; c < clampedCols; c++) {
      const raw = params[`r${String(r)}c${String(c)}`];
      const v = typeof raw === "number" ? Math.abs(raw) : 0;
      if (v > maxAbs) maxAbs = v;
    }
  }

  return (
    <div className="mt-1 flex items-start gap-0" data-testid="matrix-grid-editor">
      <BracketLine side="left" />
      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${clampedCols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: clampedRows }, (_, r) =>
          Array.from({ length: clampedCols }, (_, c) => {
            const key = `r${String(r)}c${String(c)}`;
            const raw = params[key];
            const numVal = typeof raw === "number" ? raw : 0;
            return (
              <ScrubCell
                key={key}
                paramKey={key}
                value={numVal}
                maxAbs={maxAbs}
                params={params}
                onUpdate={onUpdate}
              />
            );
          }),
        )}
      </div>
      <BracketLine side="right" />
    </div>
  );
}

function VectorGridEditor({
  dim,
  params,
  onUpdate,
}: {
  dim: number;
  params: ResolvedParams;
  onUpdate: (next: ResolvedParams) => void;
}) {
  const clampedDim = Math.max(1, Math.min(dim, 16));

  let maxAbs = 0;
  for (let i = 0; i < clampedDim; i++) {
    const raw = params[`c${String(i)}`];
    const v = typeof raw === "number" ? Math.abs(raw) : 0;
    if (v > maxAbs) maxAbs = v;
  }

  return (
    <div className="mt-1 flex items-start gap-0" data-testid="vector-grid-editor">
      <BracketLine side="left" />
      <div className="grid gap-0.5" style={{ gridTemplateColumns: "1fr" }}>
        {Array.from({ length: clampedDim }, (_, i) => {
          const key = `c${String(i)}`;
          const raw = params[key];
          const numVal = typeof raw === "number" ? raw : 0;
          return (
            <ScrubCell
              key={key}
              paramKey={key}
              value={numVal}
              maxAbs={maxAbs}
              params={params}
              onUpdate={onUpdate}
            />
          );
        })}
      </div>
      <BracketLine side="right" />
    </div>
  );
}

function BracketLine({ side }: { side: "left" | "right" }) {
  return (
    <span
      aria-hidden="true"
      className={`w-2 shrink-0 self-stretch border-y-2 border-fg-muted ${
        side === "left" ? "mr-1 rounded-l-[3px] border-l-2" : "ml-1 rounded-r-[3px] border-r-2"
      }`}
    />
  );
}

// ScrubCell: drag horizontally to change value; double-click to type precisely.
// Background is heatmap-tinted by magnitude relative to matrix max.
function ScrubCell({
  paramKey,
  value,
  maxAbs,
  params,
  onUpdate,
}: {
  paramKey: string;
  value: number;
  maxAbs: number;
  params: ResolvedParams;
  onUpdate: (next: ResolvedParams) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const dragRef = useRef<{ startX: number; startVal: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Heatmap: intensity 0–1 based on abs(value)/maxAbs
  const intensity = maxAbs > 0 ? Math.min(Math.abs(value), maxAbs) / maxAbs : 0;
  // Positive → blue tint, negative → orange tint, zero → neutral
  const hue = value >= 0 ? 240 : 30;
  const cellBg =
    intensity > 0.02
      ? `oklch(${(85 - intensity * 25).toFixed(1)}% ${(intensity * 0.12).toFixed(3)} ${hue})`
      : undefined;

  const formatVal = useCallback((n: number) => {
    if (!Number.isFinite(n)) return "0";
    if (Number.isInteger(n)) return String(n);
    return n.toPrecision(4).replace(/\.?0+$/, "");
  }, []);

  const commit = useCallback(
    (next: number) => {
      const v = Number.isFinite(next) ? next : 0;
      onUpdate({ ...params, [paramKey]: v });
    },
    [paramKey, params, onUpdate],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (editing) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = { startX: e.clientX, startVal: value };
    },
    [editing, value],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (dragRef.current === null) return;
      const dx = e.clientX - dragRef.current.startX;
      const step = e.shiftKey ? 1 : e.altKey ? 0.01 : 0.1;
      commit(dragRef.current.startVal + dx * step);
    },
    [commit],
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handleDoubleClick = useCallback(() => {
    setDraft(formatVal(value));
    setEditing(true);
    // Focus after render
    setTimeout(() => inputRef.current?.select(), 0);
  }, [value, formatVal]);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        const next = Number(draft);
        commit(Number.isFinite(next) ? next : value);
        setEditing(false);
      } else if (e.key === "Escape") {
        setEditing(false);
      }
    },
    [draft, value, commit],
  );

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={draft}
        step="any"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleEditKeyDown}
        onBlur={() => {
          const next = Number(draft);
          commit(Number.isFinite(next) ? next : value);
          setEditing(false);
        }}
        aria-label={paramKey}
        className="nodrag h-8 w-full min-w-0 rounded border border-role-control-border bg-bg px-1 py-0.5 text-center font-mono text-xs text-fg outline-none focus:ring-1 focus:ring-role-control-border"
        data-testid={`matrix-cell-${paramKey}`}
      />
    );
  }

  return (
    <div
      role="spinbutton"
      aria-label={paramKey}
      aria-valuenow={Number.isFinite(value) ? value : 0}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleDoubleClick();
        if (e.key === "ArrowUp") commit(value + (e.shiftKey ? 1 : 0.1));
        if (e.key === "ArrowDown") commit(value - (e.shiftKey ? 1 : 0.1));
      }}
      style={{ backgroundColor: cellBg }}
      className="nodrag flex h-8 w-full min-w-0 cursor-ew-resize select-none items-center justify-center rounded border border-border font-mono text-xs text-fg transition-colors hover:border-role-control-border"
      data-testid={`matrix-cell-${paramKey}`}
    >
      {formatVal(value)}
    </div>
  );
}

function paramTooltip(
  key: string,
  spec: NonNullable<BlockDefinition["params"]>[string],
): React.ReactNode {
  const label = spec.label ?? key;
  const footerParts: string[] = [];
  if ((spec.kind === "number" || spec.kind === "integer") && spec.min !== undefined) {
    footerParts.push(`${spec.min} – ${spec.max ?? "∞"}`);
  }
  footerParts.push(`default: ${String(spec.default)}`);
  return (
    <span className="flex flex-col gap-1 px-2.5 py-1.5">
      <span className="text-[11px] font-semibold text-fg">{label}</span>
      <span className="text-[10px] text-fg-faint">{footerParts.join(" · ")}</span>
    </span>
  );
}

// ── Value strip ───────────────────────────────────────────────────────────

function ValueStrip({ result }: { result: EvalResult | undefined }) {
  if (result === undefined || result.kind !== "value") return null;
  const { value } = result;
  const tooltipContent = (
    <span className="flex flex-col gap-1 px-2.5 py-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
        {value.type.kind}
      </span>
      <span className="whitespace-pre font-mono text-[11px] text-fg">
        {formatPayloadVerbose(value.payload, value.type.kind)}
      </span>
    </span>
  );

  return (
    <Tooltip content={tooltipContent} side="top" delay={200} maxWidth={260}>
      <div
        data-testid="inspector-value-strip"
        className="-mb-0 mt-auto cursor-default border-t border-border bg-surface-2 px-4 py-2"
      >
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">value</span>
        <p className="mt-0.5 truncate font-mono text-xs text-fg">
          {formatPayload(result.value.payload)}
        </p>
        <p className="mt-0.5 font-mono text-[10px] text-fg-faint">{result.value.type.kind}</p>
      </div>
    </Tooltip>
  );
}

function formatPayloadVerbose(payload: unknown, kind: string): string {
  if (kind === "Matrix" && Array.isArray(payload)) {
    const rows = payload as unknown[][];
    const cols = rows[0]?.length ?? 0;
    const lines = rows.map((row) => {
      const cells = (row as unknown[]).map((c) => String(c).padStart(8)).join("  ");
      return `│${cells}  │`;
    });
    const bar = `└${"─".repeat(cols * 10 + 2)}┘`;
    return [`┌${"─".repeat(cols * 10 + 2)}┐`, ...lines, bar].join("\n");
  }
  if (kind === "Vector" && Array.isArray(payload)) {
    const arr = payload as unknown[];
    return `[ ${arr.map(String).join(",  ")} ]`;
  }
  return formatPayload(payload);
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
  if (typeof payload === "object" && "serialized" in payload) {
    return (payload as { serialized: string }).serialized;
  }
  return String(payload);
}

// ── Helpers ───────────────────────────────────────────────────────────────

const roleDotClass: Readonly<Record<BlockDefinition["color"], string>> = {
  source: "bg-role-source-border",
  operation: "bg-role-operation-border",
  function: "bg-role-function-border",
  visualizer: "bg-role-visualizer-border",
  stochastic: "bg-role-stochastic-border",
  control: "bg-role-control-border",
};

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
    <div className="flex flex-col gap-1.5 border-t border-border p-4">
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
