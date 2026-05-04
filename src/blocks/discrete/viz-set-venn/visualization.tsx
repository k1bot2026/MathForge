"use client";

import type { ResolvedInputs } from "~/blocks/types";
import type { MathValue, ScalarPayload, SetPayload } from "~/math/types";

const W = 400;
const H = 260;

function extractIntegers(val: MathValue | undefined): Set<number> {
  if (val === undefined || val.type.kind !== "Set") return new Set();
  return new Set(
    (val.payload as SetPayload)
      .filter((v) => v.type.kind === "Scalar")
      .map((v) => v.payload as ScalarPayload)
      .filter((p): p is number => typeof p === "number"),
  );
}

function setLabel(s: Set<number>, max = 6): string {
  const arr = [...s].sort((a, b) => a - b);
  if (arr.length === 0) return "∅";
  if (arr.length <= max) return `{${arr.join(", ")}}`;
  return `{${arr.slice(0, max).join(", ")}, …}`;
}

// Two-set Venn (side-by-side overlapping circles)
function TwoSetVenn({
  a,
  b,
  labelA,
  labelB,
}: {
  a: Set<number>;
  b: Set<number>;
  labelA: string;
  labelB: string;
}) {
  const onlyA = [...a].filter((x) => !b.has(x));
  const onlyB = [...b].filter((x) => !a.has(x));
  const both = [...a].filter((x) => b.has(x));

  const cx = W / 2;
  const cy = H / 2;
  const r = 80;
  const offset = 55;

  return (
    <svg
      role="img"
      aria-label={`Venn diagram of sets ${labelA} and ${labelB}`}
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ background: "transparent" }}
    >
      <circle
        cx={cx - offset}
        cy={cy}
        r={r}
        fill="var(--role-source-bg, #1e293b)"
        fillOpacity={0.5}
        stroke="var(--role-source-border, #7c3aed)"
        strokeWidth={1.5}
      />
      <circle
        cx={cx + offset}
        cy={cy}
        r={r}
        fill="var(--role-operation-bg, #0f172a)"
        fillOpacity={0.5}
        stroke="var(--role-operation-border, #2563eb)"
        strokeWidth={1.5}
      />
      {/* Set labels */}
      <text
        x={cx - offset - r * 0.45}
        y={cy - r - 8}
        fontSize={11}
        fontWeight="600"
        fill="var(--fg-base, #f1f5f9)"
        textAnchor="middle"
      >
        {labelA}
      </text>
      <text
        x={cx + offset + r * 0.45}
        y={cy - r - 8}
        fontSize={11}
        fontWeight="600"
        fill="var(--fg-base, #f1f5f9)"
        textAnchor="middle"
      >
        {labelB}
      </text>
      {/* Element counts */}
      <text
        x={cx - offset - r * 0.45}
        y={cy}
        fontSize={10}
        fill="var(--fg-muted, #94a3b8)"
        textAnchor="middle"
      >
        {setLabel(new Set(onlyA))}
      </text>
      <text x={cx} y={cy} fontSize={10} fill="var(--fg-base, #f1f5f9)" textAnchor="middle">
        {setLabel(new Set(both))}
      </text>
      <text
        x={cx + offset + r * 0.45}
        y={cy}
        fontSize={10}
        fill="var(--fg-muted, #94a3b8)"
        textAnchor="middle"
      >
        {setLabel(new Set(onlyB))}
      </text>
      {/* Size indicators */}
      <text
        x={cx - offset}
        y={H - 14}
        fontSize={9}
        fill="var(--fg-faint, #64748b)"
        textAnchor="middle"
      >
        |{labelA}| = {a.size}
      </text>
      <text
        x={cx + offset}
        y={H - 14}
        fontSize={9}
        fill="var(--fg-faint, #64748b)"
        textAnchor="middle"
      >
        |{labelB}| = {b.size}
      </text>
    </svg>
  );
}

export function SetVennVisualization({
  inputs,
}: {
  inputs: ResolvedInputs;
  output: MathValue | undefined;
}) {
  const aVal = inputs.A;
  const bVal = inputs.B;

  if (aVal === undefined || bVal === undefined) {
    return (
      <div
        data-testid="viz-set-venn-placeholder"
        className="flex h-[80px] items-center justify-center text-center text-xs text-fg-faint"
      >
        Connect Sets to ports A and B.
      </div>
    );
  }

  const a = extractIntegers(aVal);
  const b = extractIntegers(bVal);

  return (
    <div data-testid="viz-set-venn-root">
      <TwoSetVenn a={a} b={b} labelA="A" labelB="B" />
    </div>
  );
}
