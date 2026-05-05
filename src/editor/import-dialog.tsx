"use client";

// Import dialog — lets users paste a plain-math or LaTeX expression and
// builds a block graph from it. Top-level ops (diff, integrate) decompose
// into a calc.function + operation block chain; everything else → calc.function.

import { type Edge, type Node, useReactFlow } from "@xyflow/react";
import { parse as mathjsParse } from "mathjs";
import { useCallback, useRef, useState } from "react";
import type { BlockNodeData } from "~/engine/graph-spec";
import { latexToPlain } from "~/lib/latex-to-plain";
import { useGraphStore } from "~/store/graph-store";

type ImportFormat = "plain" | "latex";

// Detect the free variable in a plain expression. Returns "x" as default.
function detectVariable(expr: string): string {
  const candidates = ["x", "t", "n", "z", "u", "v", "w"];
  for (const c of candidates) {
    if (new RegExp(`\\b${c}\\b`).test(expr)) return c;
  }
  return "x";
}

// ── LaTeX matrix parser ──────────────────────────────────────────────────────
// Detects \begin{bmatrix|pmatrix|matrix}...\end{...} and emits an la.matrix
// node directly — bypassing the expression path entirely.

type ImportGraph = { nodes: Node[]; edges: Edge[] };

const MATRIX_ENV_RE = /\\begin\{(?:b|p|v|V)?matrix\}([\s\S]*?)\\end\{(?:b|p|v|V)?matrix\}/;

function parseBmatrixLatex(latex: string, originX: number, originY: number): ImportGraph | null {
  const match = MATRIX_ENV_RE.exec(latex.trim());
  if (match === null) return null;

  const inner = match[1] ?? "";
  const rowStrings = inner
    .split(/\\\\/)
    .map((r) => r.trim())
    .filter((r) => r.length > 0);

  if (rowStrings.length === 0) return null;

  const rows: number[][] = [];
  for (const rowStr of rowStrings) {
    const cells = rowStr.split("&").map((c) => c.trim());
    const nums: number[] = [];
    for (const cell of cells) {
      const n = Number(cell.replace(/\s/g, ""));
      if (!Number.isFinite(n)) return null; // non-numeric cell — give up
      nums.push(n);
    }
    rows.push(nums);
  }

  const numRows = rows.length;
  const numCols = rows[0]?.length ?? 0;
  if (numCols === 0) return null;

  // Validate rectangular and within MAX_DIM (8)
  for (const row of rows) {
    if (row.length !== numCols) return null;
  }
  if (numRows > 8 || numCols > 8) return null;

  const params: Record<string, unknown> = { rows: numRows, cols: numCols };
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      params[`r${r}c${c}`] = rows[r]?.[c] ?? 0;
    }
  }

  const stamp = Date.now();
  const nodeId = `import-matrix-${stamp}`;
  const node: Node = {
    id: nodeId,
    type: "block",
    position: { x: originX, y: originY },
    data: { blockId: "la.matrix", params } satisfies BlockNodeData as Record<string, unknown>,
  };

  return { nodes: [node], edges: [] };
}

// ── AST decomposition ─────────────────────────────────────────────────────
// Returns a list of nodes + edges to add to the canvas. For top-level
// diff/integrate calls, emits a calc.function + operation block chained
// left-to-right. Otherwise emits a single calc.function.

const BLOCK_GAP = 280;

function buildImportGraph(plain: string, originX: number, originY: number): ImportGraph {
  const stamp = Date.now();

  let rootFnName: string | null = null;
  let innerExpr: string = plain;
  let variable: string = detectVariable(plain);

  try {
    const ast = mathjsParse(plain);
    if (
      ast.type === "FunctionNode" &&
      "fn" in ast &&
      typeof (ast as { fn: { name?: string } }).fn === "object" &&
      (ast as { fn: { name?: string } }).fn.name !== undefined
    ) {
      const name = (ast as { fn: { name: string } }).fn.name;
      if (
        (name === "diff" || name === "derivative" || name === "integrate") &&
        "args" in ast &&
        Array.isArray((ast as { args: unknown[] }).args)
      ) {
        const args = (ast as { args: { toString(): string }[] }).args;
        const firstArg = args[0];
        if (args.length >= 1 && firstArg !== undefined) {
          rootFnName = name;
          innerExpr = firstArg.toString();
          const secondArg = args[1];
          if (args.length >= 2 && secondArg !== undefined) {
            const varArg = secondArg.toString().trim();
            if (/^[a-zA-Z]$/.test(varArg)) variable = varArg;
          } else {
            variable = detectVariable(innerExpr);
          }
        }
      }
    }
  } catch {
    // parse failure — fall back to single block
  }

  const opBlockId =
    rootFnName === "diff" || rootFnName === "derivative"
      ? "calc.derivative"
      : rootFnName === "integrate"
        ? "calc.integrate"
        : null;

  const fnId = `import-fn-${stamp}`;
  const fnNode: Node = {
    id: fnId,
    type: "block",
    position: { x: originX, y: originY },
    data: {
      blockId: "calc.function",
      params: { expression: innerExpr, variable },
    } satisfies BlockNodeData as Record<string, unknown>,
  };

  if (opBlockId === null) {
    return { nodes: [fnNode], edges: [] };
  }

  const opId = `import-op-${stamp}`;
  const opNode: Node = {
    id: opId,
    type: "block",
    position: { x: originX + BLOCK_GAP, y: originY },
    data: {
      blockId: opBlockId,
      params: {},
    } satisfies BlockNodeData as Record<string, unknown>,
  };

  const edge: Edge = {
    id: `e-${fnId}-fn-${opId}-fn`,
    source: fnId,
    sourceHandle: "fn",
    target: opId,
    targetHandle: "fn",
  };

  return { nodes: [fnNode, opNode], edges: [edge] };
}

// ── Smart positioning ────────────────────────────────────────────────────────
// Shifts a graph so its bounding-box centre lands on the viewport centre.
// Node positions are set at the top-left corner of the block (no size info
// available here), so we treat each node as a point for bounding-box purposes.

const NODE_W = 180; // approximate block width used for centering

function centerGraph(graph: ImportGraph, vcx: number, vcy: number): ImportGraph {
  if (graph.nodes.length === 0) return graph;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const n of graph.nodes) {
    minX = Math.min(minX, n.position.x);
    maxX = Math.max(maxX, n.position.x);
    minY = Math.min(minY, n.position.y);
    maxY = Math.max(maxY, n.position.y);
  }

  // Treat maxX node as having NODE_W width, then find bbox centre
  const graphCx = (minX + maxX + NODE_W) / 2;
  const graphCy = (minY + maxY) / 2;
  const dx = vcx - graphCx;
  const dy = vcy - graphCy;

  if (dx === 0 && dy === 0) return graph;

  return {
    ...graph,
    nodes: graph.nodes.map((n) => ({
      ...n,
      position: { x: n.position.x + dx, y: n.position.y + dy },
    })),
  };
}

// ── Shared form logic ────────────────────────────────────────────────────────

const EXAMPLES: Record<ImportFormat, string[]> = {
  plain: ["sin(x) + cos(x)", "diff(sin(x), x)", "integrate(x^2, x)", "exp(-x^2 / 2)"],
  latex: [
    "\\sin(x) + \\cos(x)",
    "\\frac{x^2 - 1}{x + 1}",
    "\\sqrt{1 - x^2}",
    "\\begin{bmatrix}1 & 2 \\\\ 3 & 4\\end{bmatrix}",
  ],
};

function useImportForm(onDone: () => void) {
  const [format, setFormat] = useState<ImportFormat>("plain");
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const addNode = useGraphStore((s) => s.addNode);
  const connect = useGraphStore((s) => s.connect);
  const { getViewport } = useReactFlow();

  const handleBuild = useCallback(() => {
    const raw = input.trim();
    if (raw.length === 0) {
      setError("Enter an expression to import.");
      return;
    }
    const vp = getViewport();
    // Viewport centre in flow coordinates (node coordinate space)
    const vcx = (-vp.x + window.innerWidth / 2) / vp.zoom;
    const vcy = (-vp.y + window.innerHeight / 2) / vp.zoom;

    // Matrix environments bypass the expression path entirely
    if (format === "latex") {
      const matrixGraph = parseBmatrixLatex(raw, vcx, vcy);
      if (matrixGraph !== null) {
        const centered = centerGraph(matrixGraph, vcx, vcy);
        for (const node of centered.nodes) addNode(node);
        for (const edge of centered.edges) connect(edge);
        setInput("");
        setError(null);
        onDone();
        return;
      }
    }

    const plain = format === "latex" ? latexToPlain(raw) : raw;
    try {
      if (/[<>|&]/.test(plain)) throw new Error("Expression contains unsupported characters.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid expression.");
      return;
    }
    const graph = buildImportGraph(plain, vcx, vcy);
    const centered = centerGraph(graph, vcx, vcy);
    for (const node of centered.nodes) addNode(node);
    for (const edge of centered.edges) connect(edge);
    setInput("");
    setError(null);
    onDone();
  }, [input, format, addNode, connect, getViewport, onDone]);

  const clearError = useCallback(() => setError(null), []);

  return { format, setFormat, input, setInput, error, handleBuild, clearError };
}

// ── Panel (inline, no modal wrapper) ────────────────────────────────────────

/** Inline import form for use inside the left-panel Import tab. */
export function ImportPanel() {
  const { format, setFormat, input, setInput, error, handleBuild, clearError } = useImportForm(
    () => {
      /* stay on tab after build */
    },
  );

  return (
    <div className="flex flex-col gap-4 p-3" data-testid="import-panel">
      <p className="text-[11px] text-fg-muted">
        Paste a formula — MathForge builds the block graph for you.
      </p>

      {/* Format selector */}
      <div className="flex gap-1 rounded-lg border border-border bg-surface-2 p-1">
        {(["plain", "latex"] as ImportFormat[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => {
              setFormat(f);
              clearError();
            }}
            className={`flex-1 rounded-md px-3 py-1.5 font-mono text-xs transition-colors ${
              f === format ? "bg-surface text-fg shadow-block-1" : "text-fg-muted hover:text-fg"
            }`}
          >
            {f === "plain" ? "Plain math" : "LaTeX"}
          </button>
        ))}
      </div>

      {/* Textarea */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="import-panel-expr"
          className="font-mono text-[10px] uppercase tracking-wider text-fg-muted"
        >
          {format === "plain" ? "Expression" : "LaTeX expression"}
        </label>
        <textarea
          id="import-panel-expr"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            clearError();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleBuild();
          }}
          placeholder={EXAMPLES[format][0]}
          rows={3}
          className="w-full resize-none rounded-md border border-border bg-bg px-3 py-2 font-mono text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:ring-1 focus:ring-role-control-border"
          data-testid="import-expr-input"
        />
        {error !== null ? (
          <p className="font-mono text-[11px] text-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      {/* Examples */}
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-faint">
          Examples
        </span>
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES[format].map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setInput(ex);
                clearError();
              }}
              className="rounded border border-border bg-surface-2 px-2 py-0.5 font-mono text-[10px] text-fg-muted hover:text-fg"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      <p className="font-mono text-[10px] text-fg-faint">
        {format === "plain"
          ? "Supports: sin, cos, sqrt, ^, *, +, −, /"
          : "Supports: \\frac, \\sqrt, \\sin/cos/tan/ln, \\pi, \\cdot, \\begin{bmatrix}…\\end{bmatrix}"}
      </p>

      <button
        type="button"
        onClick={handleBuild}
        disabled={input.trim().length === 0}
        className="w-full rounded bg-role-control-border py-2 font-mono text-xs text-bg hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
        data-testid="import-build-btn"
      >
        Build Graph
      </button>
    </div>
  );
}

// ── Dialog (modal overlay, kept for backward compat) ─────────────────────────

export type ImportDialogProps = {
  onClose: () => void;
};

export function ImportDialog({ onClose }: ImportDialogProps) {
  const { format, setFormat, input, setInput, error, handleBuild, clearError } =
    useImportForm(onClose);
  const overlayRef = useRef<HTMLDivElement>(null);

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: overlay backdrop handles click-to-dismiss; keyboard users close via the ✕ button inside
    // biome-ignore lint/a11y/useKeyWithClickEvents: same rationale — ✕ button handles keyboard path
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 backdrop-blur-sm"
      onClick={handleOverlayClick}
      data-testid="import-dialog-overlay"
    >
      <div
        className="flex w-[480px] flex-col gap-4 rounded-xl border border-border bg-surface p-6 shadow-block-3"
        data-testid="import-dialog"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold text-fg">Import Expression</h2>
            <p className="mt-0.5 text-[11px] text-fg-muted">
              Paste a formula and MathForge builds the block graph for you.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[12px] text-fg-muted hover:text-fg"
            aria-label="Close import dialog"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-1 rounded-lg border border-border bg-surface-2 p-1">
          {(["plain", "latex"] as ImportFormat[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                setFormat(f);
                clearError();
              }}
              className={`flex-1 rounded-md px-3 py-1.5 font-mono text-xs transition-colors ${
                f === format ? "bg-surface text-fg shadow-block-1" : "text-fg-muted hover:text-fg"
              }`}
            >
              {f === "plain" ? "Plain math" : "LaTeX"}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="import-expr"
            className="font-mono text-[10px] uppercase tracking-wider text-fg-muted"
          >
            {format === "plain" ? "Expression" : "LaTeX expression"}
          </label>
          <textarea
            id="import-expr"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              clearError();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleBuild();
            }}
            placeholder={EXAMPLES[format][0]}
            rows={3}
            className="w-full resize-none rounded-md border border-border bg-bg px-3 py-2 font-mono text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:ring-1 focus:ring-role-control-border"
            data-testid="import-expr-input"
          />
          {error !== null ? (
            <p className="font-mono text-[11px] text-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-faint">
            Examples
          </span>
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES[format].map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  setInput(ex);
                  clearError();
                }}
                className="rounded border border-border bg-surface-2 px-2 py-0.5 font-mono text-[10px] text-fg-muted hover:text-fg"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        <p className="font-mono text-[10px] text-fg-faint">
          {format === "plain"
            ? "Supports standard math.js syntax: sin, cos, sqrt, ^, *, +, −, /"
            : "Supports: \\frac, \\sqrt, \\sin/cos/tan/ln, \\pi, \\cdot, \\times, ^, \\begin{bmatrix}…\\end{bmatrix}"}
        </p>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-border px-3 py-1.5 font-mono text-xs text-fg-muted hover:bg-surface-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleBuild}
            disabled={input.trim().length === 0}
            className="rounded bg-role-control-border px-4 py-1.5 font-mono text-xs text-bg hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
            data-testid="import-build-btn"
          >
            Build Graph
          </button>
        </div>
      </div>
    </div>
  );
}
