"use client";

// Hand-authored inline SVG previews for landmark blocks.
// Each preview is a 56×56 ReactElement — no hooks, no side-effects.
// Injected into block definitions at boot via registerPreviews().
// Blocks without an entry here fall back to the symbol-glyph fallback
// rendered in BlockLibraryItem.

import type { ReactElement } from "react";

const S = 56; // preview box size

// ── Shared primitives ────────────────────────────────────────────────

function Bg({ color }: { color: string }) {
  return <rect width={S} height={S} rx={6} fill={color} />;
}

// ── Linear Algebra ───────────────────────────────────────────────────

const vectorPreview: ReactElement = (
  <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} aria-hidden="true">
    <Bg color="oklch(30% 0.07 285 / 0.35)" />
    <text
      x={28}
      y={22}
      textAnchor="middle"
      fontSize={9}
      fill="oklch(75% 0.12 285)"
      fontFamily="monospace"
    >
      [x, y, z]
    </text>
    <line
      x1={10}
      y1={34}
      x2={44}
      y2={34}
      stroke="oklch(65% 0.14 285)"
      strokeWidth={2}
      markerEnd="url(#ah)"
    />
    <defs>
      <marker id="ah" markerWidth={6} markerHeight={6} refX={3} refY={3} orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill="oklch(65% 0.14 285)" />
      </marker>
    </defs>
    <circle cx={10} cy={34} r={2.5} fill="oklch(65% 0.14 285)" />
  </svg>
);

const matrixPreview: ReactElement = (
  <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} aria-hidden="true">
    <Bg color="oklch(30% 0.07 285 / 0.35)" />
    {/* 2×2 grid of cells */}
    {[0, 1].map((r) =>
      [0, 1].map((c) => (
        <rect
          key={`${r}-${c}`}
          x={10 + c * 19}
          y={14 + r * 16}
          width={16}
          height={13}
          rx={2}
          fill="oklch(40% 0.07 285 / 0.5)"
          stroke="oklch(60% 0.12 285)"
          strokeWidth={0.8}
        />
      )),
    )}
    <text
      x={18}
      y={24}
      textAnchor="middle"
      fontSize={8}
      fill="oklch(80% 0.1 285)"
      fontFamily="monospace"
    >
      a
    </text>
    <text
      x={37}
      y={24}
      textAnchor="middle"
      fontSize={8}
      fill="oklch(80% 0.1 285)"
      fontFamily="monospace"
    >
      b
    </text>
    <text
      x={18}
      y={40}
      textAnchor="middle"
      fontSize={8}
      fill="oklch(80% 0.1 285)"
      fontFamily="monospace"
    >
      c
    </text>
    <text
      x={37}
      y={40}
      textAnchor="middle"
      fontSize={8}
      fill="oklch(80% 0.1 285)"
      fontFamily="monospace"
    >
      d
    </text>
    <text
      x={28}
      y={52}
      textAnchor="middle"
      fontSize={7}
      fill="oklch(60% 0.1 285)"
      fontFamily="monospace"
    >
      m×n
    </text>
  </svg>
);

const matvecPreview: ReactElement = (
  <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} aria-hidden="true">
    <Bg color="oklch(30% 0.07 285 / 0.35)" />
    <rect
      x={6}
      y={10}
      width={14}
      height={26}
      rx={2}
      fill="oklch(40% 0.07 285 / 0.5)"
      stroke="oklch(60% 0.12 285)"
      strokeWidth={0.8}
    />
    <text
      x={13}
      y={27}
      textAnchor="middle"
      fontSize={7}
      fill="oklch(80% 0.1 285)"
      fontFamily="monospace"
    >
      M
    </text>
    <text
      x={24}
      y={27}
      textAnchor="middle"
      fontSize={10}
      fill="oklch(60% 0.1 285)"
      fontFamily="monospace"
    >
      ·
    </text>
    <rect
      x={27}
      y={14}
      width={8}
      height={18}
      rx={2}
      fill="oklch(40% 0.07 285 / 0.5)"
      stroke="oklch(60% 0.12 285)"
      strokeWidth={0.8}
    />
    <text
      x={31}
      y={27}
      textAnchor="middle"
      fontSize={7}
      fill="oklch(80% 0.1 285)"
      fontFamily="monospace"
    >
      v
    </text>
    <text x={40} y={27} fontSize={9} fill="oklch(60% 0.1 285)" fontFamily="monospace">
      =
    </text>
    <rect
      x={46}
      y={14}
      width={8}
      height={18}
      rx={2}
      fill="oklch(50% 0.14 155 / 0.5)"
      stroke="oklch(65% 0.14 155)"
      strokeWidth={0.8}
    />
    <text
      x={28}
      y={50}
      textAnchor="middle"
      fontSize={7}
      fill="oklch(55% 0.1 285)"
      fontFamily="monospace"
    >
      Mv → v′
    </text>
  </svg>
);

const detPreview: ReactElement = (
  <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} aria-hidden="true">
    <Bg color="oklch(30% 0.07 285 / 0.35)" />
    <polygon
      points="12,44 44,44 38,16 18,16"
      fill="oklch(55% 0.14 285 / 0.3)"
      stroke="oklch(65% 0.14 285)"
      strokeWidth={1.5}
    />
    <text
      x={28}
      y={35}
      textAnchor="middle"
      fontSize={10}
      fill="oklch(80% 0.12 285)"
      fontFamily="monospace"
    >
      |A|
    </text>
    <text
      x={28}
      y={52}
      textAnchor="middle"
      fontSize={7}
      fill="oklch(55% 0.1 285)"
      fontFamily="monospace"
    >
      area/vol
    </text>
  </svg>
);

const eigenPreview: ReactElement = (
  <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} aria-hidden="true">
    <Bg color="oklch(30% 0.07 285 / 0.35)" />
    {/* Two eigenvector arrows */}
    <line
      x1={28}
      y1={28}
      x2={46}
      y2={14}
      stroke="oklch(75% 0.14 80)"
      strokeWidth={2}
      markerEnd="url(#ae1)"
    />
    <line
      x1={28}
      y1={28}
      x2={12}
      y2={44}
      stroke="oklch(65% 0.13 15)"
      strokeWidth={2}
      markerEnd="url(#ae2)"
    />
    <circle cx={28} cy={28} r={3} fill="oklch(80% 0.12 285)" />
    <defs>
      <marker id="ae1" markerWidth={5} markerHeight={5} refX={2.5} refY={2.5} orient="auto">
        <path d="M0,0 L5,2.5 L0,5 Z" fill="oklch(75% 0.14 80)" />
      </marker>
      <marker id="ae2" markerWidth={5} markerHeight={5} refX={2.5} refY={2.5} orient="auto">
        <path d="M0,0 L5,2.5 L0,5 Z" fill="oklch(65% 0.13 15)" />
      </marker>
    </defs>
    <text
      x={28}
      y={52}
      textAnchor="middle"
      fontSize={7}
      fill="oklch(55% 0.1 285)"
      fontFamily="monospace"
    >
      λ, v
    </text>
  </svg>
);

const transposePreview: ReactElement = (
  <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} aria-hidden="true">
    <Bg color="oklch(30% 0.07 285 / 0.35)" />
    <rect
      x={8}
      y={14}
      width={18}
      height={22}
      rx={2}
      fill="oklch(40% 0.07 285 / 0.5)"
      stroke="oklch(60% 0.12 285)"
      strokeWidth={0.8}
    />
    <text
      x={17}
      y={29}
      textAnchor="middle"
      fontSize={9}
      fill="oklch(80% 0.1 285)"
      fontFamily="monospace"
    >
      A
    </text>
    <text x={28} y={29} fontSize={8} fill="oklch(60% 0.1 285)" fontFamily="monospace">
      →
    </text>
    <rect
      x={32}
      y={18}
      width={16}
      height={26}
      rx={2}
      fill="oklch(50% 0.14 155 / 0.4)"
      stroke="oklch(65% 0.14 155)"
      strokeWidth={0.8}
    />
    <text
      x={40}
      y={34}
      textAnchor="middle"
      fontSize={8}
      fill="oklch(80% 0.1 155)"
      fontFamily="monospace"
    >
      Aᵀ
    </text>
  </svg>
);

const solvePreview: ReactElement = (
  <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} aria-hidden="true">
    <Bg color="oklch(30% 0.07 285 / 0.35)" />
    <text
      x={28}
      y={22}
      textAnchor="middle"
      fontSize={9}
      fill="oklch(75% 0.12 285)"
      fontFamily="monospace"
    >
      Ax = b
    </text>
    <line x1={14} y1={30} x2={42} y2={30} stroke="oklch(55% 0.1 285)" strokeWidth={0.8} />
    <text
      x={28}
      y={43}
      textAnchor="middle"
      fontSize={10}
      fill="oklch(75% 0.14 155)"
      fontFamily="monospace"
    >
      x =
    </text>
    <text
      x={28}
      y={52}
      textAnchor="middle"
      fontSize={7}
      fill="oklch(55% 0.1 285)"
      fontFamily="monospace"
    >
      A⁻¹b
    </text>
  </svg>
);

// ── Statistics ───────────────────────────────────────────────────────

const normalPreview: ReactElement = (
  <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} aria-hidden="true">
    <Bg color="oklch(30% 0.07 15 / 0.35)" />
    {/* Bell curve path */}
    <path
      d="M6,46 C10,46 14,10 28,10 C42,10 46,46 50,46"
      fill="oklch(55% 0.13 15 / 0.25)"
      stroke="oklch(70% 0.13 15)"
      strokeWidth={1.5}
    />
    <line
      x1={28}
      y1={10}
      x2={28}
      y2={44}
      stroke="oklch(65% 0.13 15)"
      strokeWidth={0.8}
      strokeDasharray="2 2"
    />
    <text
      x={28}
      y={54}
      textAnchor="middle"
      fontSize={7}
      fill="oklch(60% 0.1 15)"
      fontFamily="monospace"
    >
      N(μ,σ²)
    </text>
  </svg>
);

const bernoulliPreview: ReactElement = (
  <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} aria-hidden="true">
    <Bg color="oklch(30% 0.07 15 / 0.35)" />
    {/* Two bars: 0 and 1 */}
    <rect
      x={12}
      y={30}
      width={13}
      height={14}
      rx={1}
      fill="oklch(55% 0.13 15 / 0.5)"
      stroke="oklch(70% 0.13 15)"
      strokeWidth={1}
    />
    <rect
      x={31}
      y={18}
      width={13}
      height={26}
      rx={1}
      fill="oklch(65% 0.13 15)"
      stroke="oklch(70% 0.13 15)"
      strokeWidth={1}
    />
    <text
      x={18}
      y={49}
      textAnchor="middle"
      fontSize={8}
      fill="oklch(60% 0.1 15)"
      fontFamily="monospace"
    >
      0
    </text>
    <text
      x={37}
      y={49}
      textAnchor="middle"
      fontSize={8}
      fill="oklch(60% 0.1 15)"
      fontFamily="monospace"
    >
      1
    </text>
    <text
      x={28}
      y={13}
      textAnchor="middle"
      fontSize={7}
      fill="oklch(65% 0.1 15)"
      fontFamily="monospace"
    >
      p
    </text>
  </svg>
);

const posteriorPreview: ReactElement = (
  <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} aria-hidden="true">
    <Bg color="oklch(30% 0.07 15 / 0.35)" />
    {/* Prior (faint) + posterior (strong) */}
    <path
      d="M6,42 C12,42 18,18 28,18 C38,18 44,42 50,42"
      fill="none"
      stroke="oklch(60% 0.1 15 / 0.5)"
      strokeWidth={1.2}
      strokeDasharray="3 2"
    />
    <path
      d="M10,42 C15,42 20,12 28,12 C36,12 41,42 46,42"
      fill="oklch(55% 0.13 15 / 0.2)"
      stroke="oklch(72% 0.13 15)"
      strokeWidth={1.5}
    />
    <text
      x={28}
      y={53}
      textAnchor="middle"
      fontSize={7}
      fill="oklch(60% 0.1 15)"
      fontFamily="monospace"
    >
      P(θ|data)
    </text>
  </svg>
);

const samplePreview: ReactElement = (
  <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} aria-hidden="true">
    <Bg color="oklch(30% 0.07 15 / 0.35)" />
    {[
      [11, 20],
      [19, 27],
      [23, 22],
      [29, 36],
      [35, 18],
      [40, 30],
      [45, 24],
    ].map(([x, y]) => (
      <circle key={x} cx={x} cy={y} r={2.5} fill="oklch(65% 0.13 15)" opacity={0.8} />
    ))}
    <line x1={6} y1={44} x2={50} y2={44} stroke="oklch(55% 0.1 15)" strokeWidth={0.8} />
    <text
      x={28}
      y={53}
      textAnchor="middle"
      fontSize={7}
      fill="oklch(60% 0.1 15)"
      fontFamily="monospace"
    >
      samples
    </text>
  </svg>
);

const expectPreview: ReactElement = (
  <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} aria-hidden="true">
    <Bg color="oklch(30% 0.07 15 / 0.35)" />
    <text
      x={28}
      y={28}
      textAnchor="middle"
      fontSize={16}
      fill="oklch(72% 0.13 15)"
      fontFamily="monospace"
      fontWeight="bold"
    >
      E[X]
    </text>
    <text
      x={28}
      y={44}
      textAnchor="middle"
      fontSize={7}
      fill="oklch(60% 0.1 15)"
      fontFamily="monospace"
    >
      expected value
    </text>
  </svg>
);

// ── Geometry ─────────────────────────────────────────────────────────

const pointPreview: ReactElement = (
  <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} aria-hidden="true">
    <Bg color="oklch(30% 0.07 155 / 0.35)" />
    <line x1={8} y1={28} x2={48} y2={28} stroke="oklch(55% 0.1 155)" strokeWidth={0.8} />
    <line x1={28} y1={8} x2={28} y2={48} stroke="oklch(55% 0.1 155)" strokeWidth={0.8} />
    <circle cx={36} cy={20} r={4} fill="oklch(65% 0.14 155)" stroke="white" strokeWidth={1} />
    <text
      x={28}
      y={53}
      textAnchor="middle"
      fontSize={7}
      fill="oklch(55% 0.1 155)"
      fontFamily="monospace"
    >
      (x, y)
    </text>
  </svg>
);

const linePreview: ReactElement = (
  <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} aria-hidden="true">
    <Bg color="oklch(30% 0.07 155 / 0.35)" />
    <line x1={6} y1={46} x2={50} y2={14} stroke="oklch(65% 0.14 155)" strokeWidth={2} />
    <circle cx={18} cy={38} r={3} fill="oklch(65% 0.14 155)" />
    <circle cx={40} cy={22} r={3} fill="oklch(65% 0.14 155)" />
    <text
      x={28}
      y={53}
      textAnchor="middle"
      fontSize={7}
      fill="oklch(55% 0.1 155)"
      fontFamily="monospace"
    >
      line
    </text>
  </svg>
);

const circlePreview: ReactElement = (
  <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} aria-hidden="true">
    <Bg color="oklch(30% 0.07 155 / 0.35)" />
    <circle cx={28} cy={28} r={16} fill="none" stroke="oklch(65% 0.14 155)" strokeWidth={1.8} />
    <circle cx={28} cy={28} r={2} fill="oklch(65% 0.14 155)" />
    <line
      x1={28}
      y1={28}
      x2={44}
      y2={28}
      stroke="oklch(65% 0.14 155)"
      strokeWidth={0.8}
      strokeDasharray="2 2"
    />
    <text
      x={28}
      y={53}
      textAnchor="middle"
      fontSize={7}
      fill="oklch(55% 0.1 155)"
      fontFamily="monospace"
    >
      r
    </text>
  </svg>
);

const polygonPreview: ReactElement = (
  <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} aria-hidden="true">
    <Bg color="oklch(30% 0.07 155 / 0.35)" />
    <polygon
      points="28,10 46,36 12,36"
      fill="oklch(50% 0.14 155 / 0.3)"
      stroke="oklch(65% 0.14 155)"
      strokeWidth={1.8}
    />
    <circle cx={28} cy={10} r={2.5} fill="oklch(65% 0.14 155)" />
    <circle cx={46} cy={36} r={2.5} fill="oklch(65% 0.14 155)" />
    <circle cx={12} cy={36} r={2.5} fill="oklch(65% 0.14 155)" />
    <text
      x={28}
      y={52}
      textAnchor="middle"
      fontSize={7}
      fill="oklch(55% 0.1 155)"
      fontFamily="monospace"
    >
      vertices
    </text>
  </svg>
);

const midpointPreview: ReactElement = (
  <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} aria-hidden="true">
    <Bg color="oklch(30% 0.07 155 / 0.35)" />
    <circle cx={10} cy={28} r={3.5} fill="oklch(65% 0.14 155)" />
    <circle cx={46} cy={28} r={3.5} fill="oklch(65% 0.14 155)" />
    <line x1={10} y1={28} x2={46} y2={28} stroke="oklch(65% 0.14 155)" strokeWidth={1.5} />
    <circle cx={28} cy={28} r={4} fill="oklch(78% 0.14 80)" stroke="white" strokeWidth={1} />
    <text
      x={28}
      y={42}
      textAnchor="middle"
      fontSize={8}
      fill="oklch(70% 0.12 80)"
      fontFamily="monospace"
    >
      M
    </text>
    <text
      x={28}
      y={52}
      textAnchor="middle"
      fontSize={7}
      fill="oklch(55% 0.1 155)"
      fontFamily="monospace"
    >
      midpoint
    </text>
  </svg>
);

const distancePreview: ReactElement = (
  <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} aria-hidden="true">
    <Bg color="oklch(30% 0.07 155 / 0.35)" />
    <circle cx={12} cy={36} r={3} fill="oklch(65% 0.14 155)" />
    <circle cx={44} cy={20} r={3} fill="oklch(65% 0.14 155)" />
    <line
      x1={12}
      y1={36}
      x2={44}
      y2={20}
      stroke="oklch(65% 0.14 155)"
      strokeWidth={1.5}
      strokeDasharray="3 2"
    />
    <text
      x={28}
      y={32}
      textAnchor="middle"
      fontSize={8}
      fill="oklch(78% 0.14 80)"
      fontFamily="monospace"
    >
      d
    </text>
    <text
      x={28}
      y={52}
      textAnchor="middle"
      fontSize={7}
      fill="oklch(55% 0.1 155)"
      fontFamily="monospace"
    >
      |P₁P₂|
    </text>
  </svg>
);

const rotatePreview: ReactElement = (
  <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} aria-hidden="true">
    <Bg color="oklch(30% 0.07 155 / 0.35)" />
    <polygon
      points="28,14 40,36 16,36"
      fill="oklch(50% 0.14 155 / 0.2)"
      stroke="oklch(55% 0.12 155)"
      strokeWidth={1}
      strokeDasharray="2 2"
    />
    <polygon
      points="14,22 36,14 40,38"
      fill="oklch(50% 0.14 155 / 0.4)"
      stroke="oklch(65% 0.14 155)"
      strokeWidth={1.5}
    />
    <path
      d="M 28 28 m 10 0 a 10 10 0 0 0 -7 -7"
      fill="none"
      stroke="oklch(72% 0.14 80)"
      strokeWidth={1.2}
    />
    <text
      x={28}
      y={53}
      textAnchor="middle"
      fontSize={7}
      fill="oklch(55% 0.1 155)"
      fontFamily="monospace"
    >
      rotate θ
    </text>
  </svg>
);

// ── Calculus ─────────────────────────────────────────────────────────

const functionPreview: ReactElement = (
  <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} aria-hidden="true">
    <Bg color="oklch(30% 0.07 80 / 0.35)" />
    <path
      d="M6,44 C12,44 16,10 22,10 C28,10 32,44 38,44 C44,44 48,28 50,28"
      fill="none"
      stroke="oklch(72% 0.14 80)"
      strokeWidth={1.8}
    />
    <line x1={6} y1={44} x2={50} y2={44} stroke="oklch(55% 0.1 80)" strokeWidth={0.8} />
    <text
      x={28}
      y={53}
      textAnchor="middle"
      fontSize={7}
      fill="oklch(60% 0.1 80)"
      fontFamily="monospace"
    >
      f(x)
    </text>
  </svg>
);

const derivativePreview: ReactElement = (
  <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} aria-hidden="true">
    <Bg color="oklch(30% 0.07 80 / 0.35)" />
    <path
      d="M8,42 Q20,42 28,22 Q36,6 48,6"
      fill="none"
      stroke="oklch(65% 0.12 80 / 0.5)"
      strokeWidth={1.2}
      strokeDasharray="2 2"
    />
    <path d="M8,22 L48,40" stroke="oklch(72% 0.14 80)" strokeWidth={1.8} />
    <circle cx={28} cy={31} r={3} fill="oklch(72% 0.14 80)" />
    <text
      x={28}
      y={53}
      textAnchor="middle"
      fontSize={7}
      fill="oklch(60% 0.1 80)"
      fontFamily="monospace"
    >
      f′(x)
    </text>
  </svg>
);

const integralPreview: ReactElement = (
  <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} aria-hidden="true">
    <Bg color="oklch(30% 0.07 80 / 0.35)" />
    <path
      d="M8,44 C14,44 18,12 28,12 C38,12 42,44 48,44 Z"
      fill="oklch(55% 0.12 80 / 0.35)"
      stroke="none"
    />
    <path
      d="M8,44 C14,44 18,12 28,12 C38,12 42,44 48,44"
      fill="none"
      stroke="oklch(72% 0.14 80)"
      strokeWidth={1.5}
    />
    <line x1={8} y1={44} x2={48} y2={44} stroke="oklch(55% 0.1 80)" strokeWidth={0.8} />
    <text
      x={28}
      y={53}
      textAnchor="middle"
      fontSize={7}
      fill="oklch(60% 0.1 80)"
      fontFamily="monospace"
    >
      ∫f dx
    </text>
  </svg>
);

const taylorPreview: ReactElement = (
  <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} aria-hidden="true">
    <Bg color="oklch(30% 0.07 80 / 0.35)" />
    <path
      d="M6,28 Q14,40 22,20 Q30,4 38,28 Q44,42 50,20"
      fill="none"
      stroke="oklch(60% 0.1 80 / 0.4)"
      strokeWidth={1}
    />
    <path
      d="M6,40 C16,40 22,12 28,12 C34,12 40,40 50,40"
      fill="none"
      stroke="oklch(72% 0.14 80)"
      strokeWidth={1.8}
    />
    <text
      x={28}
      y={53}
      textAnchor="middle"
      fontSize={7}
      fill="oklch(60% 0.1 80)"
      fontFamily="monospace"
    >
      Taylor
    </text>
  </svg>
);

const gradientPreview: ReactElement = (
  <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} aria-hidden="true">
    <Bg color="oklch(30% 0.07 80 / 0.35)" />
    {/* Small gradient arrows on a grid */}
    {[14, 28, 42].map((x) =>
      [14, 28, 42].map((y) => {
        const angle = (x + y) * 0.05;
        const dx = Math.cos(angle) * 5;
        const dy = Math.sin(angle) * 5;
        return (
          <line
            key={`${x}-${y}`}
            x1={x - dx * 0.3}
            y1={y - dy * 0.3}
            x2={x + dx * 0.7}
            y2={y + dy * 0.7}
            stroke="oklch(72% 0.14 80)"
            strokeWidth={1.2}
            opacity={0.8}
          />
        );
      }),
    )}
    <text
      x={28}
      y={54}
      textAnchor="middle"
      fontSize={7}
      fill="oklch(60% 0.1 80)"
      fontFamily="monospace"
    >
      ∇f
    </text>
  </svg>
);

// ── Visualization ─────────────────────────────────────────────────────

const histogramPreview: ReactElement = (
  <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} aria-hidden="true">
    <Bg color="oklch(30% 0.07 155 / 0.35)" />
    {[
      [6, 28],
      [16, 18],
      [26, 10],
      [36, 20],
      [46, 32],
    ].map(([x, h]) => (
      <rect
        key={x}
        x={x}
        y={44 - (h ?? 0)}
        width={8}
        height={h}
        rx={1}
        fill="oklch(62% 0.14 155)"
      />
    ))}
    <line x1={4} y1={44} x2={52} y2={44} stroke="oklch(55% 0.1 155)" strokeWidth={0.8} />
    <text
      x={28}
      y={53}
      textAnchor="middle"
      fontSize={7}
      fill="oklch(55% 0.1 155)"
      fontFamily="monospace"
    >
      histogram
    </text>
  </svg>
);

const pdfCdfPreview: ReactElement = (
  <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} aria-hidden="true">
    <Bg color="oklch(30% 0.07 155 / 0.35)" />
    <path
      d="M6,44 C12,44 16,10 28,10 C40,10 44,44 50,44"
      fill="none"
      stroke="oklch(65% 0.14 155)"
      strokeWidth={1.5}
    />
    <path
      d="M6,44 C12,44 14,42 20,38 C26,32 32,18 40,10 C44,8 48,8 50,8"
      fill="none"
      stroke="oklch(72% 0.14 80)"
      strokeWidth={1.2}
      strokeDasharray="2 2"
    />
    <text
      x={28}
      y={53}
      textAnchor="middle"
      fontSize={7}
      fill="oklch(55% 0.1 155)"
      fontFamily="monospace"
    >
      PDF/CDF
    </text>
  </svg>
);

const geometry2dPreview: ReactElement = (
  <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} aria-hidden="true">
    <Bg color="oklch(30% 0.07 155 / 0.35)" />
    <line x1={8} y1={28} x2={48} y2={28} stroke="oklch(45% 0.08 155)" strokeWidth={0.6} />
    <line x1={28} y1={8} x2={28} y2={48} stroke="oklch(45% 0.08 155)" strokeWidth={0.6} />
    <circle cx={28} cy={28} r={14} fill="none" stroke="oklch(65% 0.14 155)" strokeWidth={1.5} />
    <circle cx={36} cy={20} r={3} fill="oklch(70% 0.14 80)" />
    <text
      x={28}
      y={53}
      textAnchor="middle"
      fontSize={7}
      fill="oklch(55% 0.1 155)"
      fontFamily="monospace"
    >
      2D canvas
    </text>
  </svg>
);

const geometry3dPreview: ReactElement = (
  <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} aria-hidden="true">
    <Bg color="oklch(20% 0.01 240)" />
    {/* Rough 3D axes */}
    <line x1={28} y1={28} x2={46} y2={20} stroke="#e05c5c" strokeWidth={1.5} />
    <line x1={28} y1={28} x2={28} y2={8} stroke="#5cb85c" strokeWidth={1.5} />
    <line x1={28} y1={28} x2={10} y2={38} stroke="#5c9de0" strokeWidth={1.5} />
    <circle cx={36} cy={18} r={3} fill="#4a9eff" opacity={0.8} />
    <text
      x={28}
      y={53}
      textAnchor="middle"
      fontSize={7}
      fill="oklch(55% 0.1 240)"
      fontFamily="monospace"
    >
      3D canvas
    </text>
  </svg>
);

// ── Map ───────────────────────────────────────────────────────────────

export const BLOCK_PREVIEWS: Readonly<Record<string, ReactElement>> = {
  "la.vector": vectorPreview,
  "la.matrix": matrixPreview,
  "la.matvec": matvecPreview,
  "la.matmul": matvecPreview,
  "la.det": detPreview,
  "la.eigen": eigenPreview,
  "la.transpose": transposePreview,
  "la.solve": solvePreview,
  "stats.normal": normalPreview,
  "stats.bernoulli": bernoulliPreview,
  "stats.binomial": bernoulliPreview,
  "stats.poisson": bernoulliPreview,
  "stats.beta": normalPreview,
  "stats.gamma": normalPreview,
  "stats.posterior": posteriorPreview,
  "stats.sample": samplePreview,
  "stats.expect": expectPreview,
  "geom.point": pointPreview,
  "geom.line-from-points": linePreview,
  "geom.line-from-equation": linePreview,
  "geom.circle-from-center-radius": circlePreview,
  "geom.circle-from-three-points": circlePreview,
  "geom.polygon": polygonPreview,
  "geom.regular-polygon": polygonPreview,
  "geom.midpoint": midpointPreview,
  "geom.distance": distancePreview,
  "geom.rotate": rotatePreview,
  "calc.function": functionPreview,
  "calc.derivative": derivativePreview,
  "calc.integrate": integralPreview,
  "calc.definite-integrate": integralPreview,
  "calc.taylor": taylorPreview,
  "calc.gradient": gradientPreview,
  "viz.histogram": histogramPreview,
  "viz.pdf-cdf": pdfCdfPreview,
  "viz.geometry-2d": geometry2dPreview,
  "viz.geometry-3d": geometry3dPreview,
};
