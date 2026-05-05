"use client";

// MathLive-backed expression editor for params of kind "string" named "expression".
// Renders the field as live-rendered math (LaTeX under the hood).
// On change, converts LaTeX → math.js plain syntax via latexToPlain() and
// calls onChange with the plain string so the rest of the engine sees what it expects.

import { useEffect, useRef } from "react";
import { latexToPlain } from "~/lib/latex-to-plain";

function plainToLatex(plain: string): string {
  return plain
    .replace(/\bsqrt\(([^)]+)\)/g, "\\sqrt{$1}")
    .replace(/\bsin\b/g, "\\sin")
    .replace(/\bcos\b/g, "\\cos")
    .replace(/\btan\b/g, "\\tan")
    .replace(/\blog10\b/g, "\\log")
    .replace(/\blog\b/g, "\\ln")
    .replace(/\bexp\b/g, "\\exp")
    .replace(/\bpi\b/g, "\\pi")
    .replace(/\bInfinity\b/g, "\\infty")
    .replace(/\*\*/g, "^")
    .replace(/\^(\([^)]+\))/g, "^{$1}")
    .replace(/\^(\w+)/g, "^{$1}");
}

type MathFieldEl = HTMLElement & { value: string };

const BASE_STYLE = [
  "width:100%",
  "min-height:2.25rem",
  "padding:0.375rem 0.625rem",
  "border-radius:0.375rem",
  "border:1px solid var(--color-border)",
  "background:var(--color-bg)",
  "font-size:0.875rem",
  "color:var(--color-fg)",
  "outline:none",
  "box-sizing:border-box",
].join(";");

const FOCUS_STYLE = [
  "width:100%",
  "min-height:2.25rem",
  "padding:0.375rem 0.625rem",
  "border-radius:0.375rem",
  "border:1px solid var(--color-role-control-border)",
  "background:var(--color-bg)",
  "font-size:0.875rem",
  "color:var(--color-fg)",
  "outline:none",
  "box-sizing:border-box",
  "box-shadow:0 0 0 1px var(--color-role-control-border)",
].join(";");

export type ExpressionEditorProps = {
  id?: string;
  value: string;
  onChange: (plain: string) => void;
};

export function ExpressionEditor({ id, value, onChange }: ExpressionEditorProps) {
  const containerRef = useRef<HTMLFieldSetElement>(null);
  const mfRef = useRef<MathFieldEl | null>(null);
  // Keep refs to props so the mount-once effect closure stays fresh
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const initialValueRef = useRef(value);
  const idRef = useRef(id);

  // Mount the web component exactly once
  useEffect(() => {
    let cancelled = false;
    import("mathlive").then(() => {
      if (cancelled || containerRef.current === null || mfRef.current !== null) return;

      const mf = document.createElement("math-field") as MathFieldEl;
      mf.setAttribute("default-mode", "math");
      mf.setAttribute("math-mode-space", "\\,");
      mf.setAttribute("virtual-keyboard-mode", "off");
      mf.setAttribute("smart-fence", "true");
      mf.setAttribute("style", BASE_STYLE);

      if (idRef.current !== undefined) mf.setAttribute("id", idRef.current);
      mf.value = plainToLatex(initialValueRef.current);

      mf.addEventListener("input", () => {
        onChangeRef.current(latexToPlain(mf.value));
      });
      mf.addEventListener("focus", () => mf.setAttribute("style", FOCUS_STYLE));
      mf.addEventListener("blur", () => mf.setAttribute("style", BASE_STYLE));

      containerRef.current.appendChild(mf);
      mfRef.current = mf;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Sync external value changes (e.g. undo/redo, template load)
  useEffect(() => {
    const mf = mfRef.current;
    if (mf === null) return;
    const incoming = plainToLatex(value);
    if (mf.value !== incoming) mf.value = incoming;
  }, [value]);

  return (
    <fieldset
      ref={containerRef}
      data-testid="expression-editor"
      className="w-full border-0 p-0 m-0"
      aria-label="Math expression editor"
    />
  );
}
