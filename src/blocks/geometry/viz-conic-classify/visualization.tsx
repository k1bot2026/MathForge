"use client";

import type { ResolvedInputs } from "~/blocks/types";
import type { ConicPayload, MathValue } from "~/math/types";

type ConicClass = "ellipse" | "parabola" | "hyperbola" | "degenerate" | "circle" | "unknown";

function classifyConic(p: ConicPayload): { label: ConicClass; detail: string } {
  const { A, B, C, D, E, F } = p;

  // Discriminant of the quadratic part: Δ = B² - 4AC
  const disc = B * B - 4 * A * C;

  // Full 3×3 matrix discriminant (determines if degenerate)
  const det =
    A * (C * F - (E * E) / 4) -
    (B / 2) * ((B / 2) * F - (E / 2) * (D / 2)) +
    (D / 2) * ((B / 2) * (E / 2) - C * (D / 2));

  const EPSILON = 1e-10;

  if (Math.abs(det) < EPSILON) {
    return { label: "degenerate", detail: "det(M) ≈ 0" };
  }

  if (Math.abs(disc) < EPSILON) {
    return { label: "parabola", detail: "B² - 4AC = 0" };
  }

  if (disc < 0) {
    if (Math.abs(A - C) < EPSILON && Math.abs(B) < EPSILON) {
      return { label: "circle", detail: "A=C, B=0" };
    }
    return { label: "ellipse", detail: "B² - 4AC < 0" };
  }

  return { label: "hyperbola", detail: "B² - 4AC > 0" };
}

const CLASS_COLORS: Record<ConicClass, string> = {
  circle: "#4a9eff",
  ellipse: "#50d890",
  parabola: "#ffd700",
  hyperbola: "#ff7f50",
  degenerate: "#888",
  unknown: "#555",
};

const CLASS_SYMBOLS: Record<ConicClass, string> = {
  circle: "○",
  ellipse: "⊙",
  parabola: "⋃",
  hyperbola: "⊃⊂",
  degenerate: "×",
  unknown: "?",
};

export function ConicClassifyVisualization({
  inputs,
}: {
  inputs: ResolvedInputs;
  output: MathValue | undefined;
}) {
  const conicVal = inputs.conic;
  if (!conicVal) {
    return (
      <div
        style={{
          width: 200,
          height: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
          fontSize: 13,
        }}
      >
        Connect a Conic
      </div>
    );
  }

  const p = conicVal.payload as ConicPayload;
  const { label, detail } = classifyConic(p);
  const color = CLASS_COLORS[label];
  const symbol = CLASS_SYMBOLS[label];

  return (
    <div
      style={{
        width: 200,
        padding: "12px 16px",
        background: "#1a1a2e",
        borderRadius: 8,
        fontFamily: "monospace",
      }}
    >
      <div style={{ fontSize: 36, textAlign: "center", color, lineHeight: 1.2, marginBottom: 8 }}>
        {symbol}
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: "bold",
          textAlign: "center",
          color,
          textTransform: "capitalize",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 11, color: "#aaa", textAlign: "center" }}>{detail}</div>
      <div
        style={{
          marginTop: 10,
          fontSize: 10,
          color: "#666",
          textAlign: "center",
          letterSpacing: 0.5,
        }}
      >
        {`${p.A.toFixed(2)}x² + ${p.B.toFixed(2)}xy + ${p.C.toFixed(2)}y²`}
        <br />
        {`+ ${p.D.toFixed(2)}x + ${p.E.toFixed(2)}y + ${p.F.toFixed(2)} = 0`}
      </div>
    </div>
  );
}
