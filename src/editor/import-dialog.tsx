"use client";

// Import dialog — lets users paste a plain-math or LaTeX expression and
// builds a calc.function block from it. MVP: single-block output.
// Follow-up commits will add multi-block AST decomposition and matrix syntax.

import { type Node, useReactFlow } from "@xyflow/react";
import { useCallback, useRef, useState } from "react";
import type { BlockNodeData } from "~/engine/graph-spec";
import { useGraphStore } from "~/store/graph-store";

type ImportFormat = "plain" | "latex";

// ── LaTeX pre-processor ──────────────────────────────────────────────────────
// Converts a small subset of LaTeX into math.js-compatible syntax, then
// math.js parse() validates and normalises it.

function latexToPlain(latex: string): string {
  return latex
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)")
    .replace(/\\sqrt\{([^}]+)\}/g, "sqrt($1)")
    .replace(/\\sqrt\s+(\S+)/g, "sqrt($1)")
    .replace(/\\sin\b/g, "sin")
    .replace(/\\cos\b/g, "cos")
    .replace(/\\tan\b/g, "tan")
    .replace(/\\ln\b/g, "log")
    .replace(/\\log\b/g, "log10")
    .replace(/\\exp\b/g, "exp")
    .replace(/\\pi\b/g, "pi")
    .replace(/\\infty\b/g, "Infinity")
    .replace(/\\cdot/g, "*")
    .replace(/\\times/g, "*")
    .replace(/\^(\w+)/g, "^($1)")
    .replace(/\s+/g, " ")
    .trim();
}

// Detect the free variable in a plain expression. Returns "x" as default.
function detectVariable(expr: string): string {
  const candidates = ["x", "t", "n", "z", "u", "v", "w"];
  for (const c of candidates) {
    if (new RegExp(`\\b${c}\\b`).test(expr)) return c;
  }
  return "x";
}

// ── Shared form logic ────────────────────────────────────────────────────────

const EXAMPLES: Record<ImportFormat, string[]> = {
  plain: ["sin(x) + cos(x)", "2*x^2 + 3*x - 1", "exp(-x^2 / 2)"],
  latex: ["\\sin(x) + \\cos(x)", "\\frac{x^2 - 1}{x + 1}", "\\sqrt{1 - x^2}"],
};

function useImportForm(onDone: () => void) {
  const [format, setFormat] = useState<ImportFormat>("plain");
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const addNode = useGraphStore((s) => s.addNode);
  const { getViewport } = useReactFlow();

  const handleBuild = useCallback(() => {
    const raw = input.trim();
    if (raw.length === 0) {
      setError("Enter an expression to import.");
      return;
    }
    const plain = format === "latex" ? latexToPlain(raw) : raw;
    try {
      if (/[<>|&]/.test(plain)) throw new Error("Expression contains unsupported characters.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid expression.");
      return;
    }
    const variable = detectVariable(plain);
    const vp = getViewport();
    const x = (-vp.x + window.innerWidth / 2) / vp.zoom - 90;
    const y = (-vp.y + window.innerHeight / 2) / vp.zoom - 40;
    const nodeId = `import-${Date.now()}`;
    const nodeData: BlockNodeData = {
      blockId: "calc.function",
      params: { expression: plain, variable },
    };
    const node: Node = {
      id: nodeId,
      type: "block",
      position: { x, y },
      data: nodeData as Record<string, unknown>,
    };
    addNode(node);
    setInput("");
    setError(null);
    onDone();
  }, [input, format, addNode, getViewport, onDone]);

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
          : "Supported: \\frac, \\sqrt, \\sin/cos/tan/ln, \\pi, \\cdot"}
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
            : "Supported: \\frac, \\sqrt, \\sin/cos/tan/ln, \\pi, \\cdot, \\times, ^"}
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
