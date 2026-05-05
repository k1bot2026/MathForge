"use client";

// Interactive distribution parameter editors for statistics blocks.
// Each family renders a live SVG PDF/PMF preview with drag handles that
// update the underlying params. Scrub labels below each handle serve as
// accessible fallback and precise-entry alternative.
//
// Integration: ParamSection detects distribution param patterns and renders
// the appropriate editor instead of generic number sliders for those params.

import { useCallback, useRef } from "react";
import {
  betaPdf,
  binomialPmf,
  gammaPdf,
  normalPdf,
  poissonPmf,
  uniformPdf,
} from "~/blocks/statistics/viz-math";
import type { ResolvedParams } from "~/blocks/types";

// ── Canvas constants ─────────────────────────────────────────────────────────

const W = 200;
const H = 100;
const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 10;
const PAD_B = 16;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;
const HANDLE_R = 5;

// ── Shared drag-handle hook ──────────────────────────────────────────────────

type DragState = { startX: number; startVal: number };

function useDragHandle(onDrag: (deltaX: number, startVal: number) => void, pixelsPerUnit: number) {
  const dragRef = useRef<DragState | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGCircleElement>, currentVal: number) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = { startX: e.clientX, startVal: currentVal };
    },
    [],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGCircleElement>) => {
      if (dragRef.current === null) return;
      const { startX, startVal } = dragRef.current;
      const delta = (e.clientX - startX) / pixelsPerUnit;
      onDrag(delta, startVal);
    },
    [onDrag, pixelsPerUnit],
  );

  const onPointerUp = useCallback((e: React.PointerEvent<SVGCircleElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragRef.current = null;
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp };
}

// ── Smooth curve builder ─────────────────────────────────────────────────────

function buildPath(
  xs: number[],
  ys: number[],
  maxY: number,
  xToSvg: (x: number) => number,
): string {
  if (xs.length === 0 || maxY <= 0) return "";
  const pts = xs.map((x, i) => {
    const sy = PAD_T + PLOT_H - ((ys[i] ?? 0) / maxY) * PLOT_H;
    return `${xToSvg(x).toFixed(1)},${sy.toFixed(1)}`;
  });
  return `M${pts[0]} L${pts.slice(1).join(" L")}`;
}

// ── Normal Editor ────────────────────────────────────────────────────────────

export function NormalEditor({
  params,
  onUpdate,
}: {
  params: ResolvedParams;
  onUpdate: (next: ResolvedParams) => void;
}) {
  const mu = typeof params.mu === "number" ? params.mu : 0;
  const sigma = Math.max(typeof params.sigma === "number" ? params.sigma : 1, 0.01);

  // Domain: ±3.5σ around μ
  const xMin = mu - 3.5 * sigma;
  const xMax = mu + 3.5 * sigma;
  const xRange = xMax - xMin;

  const xToSvg = (x: number) => PAD_L + ((x - xMin) / xRange) * PLOT_W;

  const N = 80;
  const xs = Array.from({ length: N }, (_, i) => xMin + (i / (N - 1)) * xRange);
  const ys = xs.map((x) => normalPdf(x, mu, sigma));
  const peakY = normalPdf(mu, mu, sigma);
  const path = buildPath(xs, ys, peakY, xToSvg);

  // Peak handle: dragging horizontally → μ
  const peakSvgX = xToSvg(mu);
  const peakSvgY = PAD_T + 2;

  const pxPerUnit = PLOT_W / xRange;

  const muDrag = useDragHandle((delta, startVal) => {
    const next = startVal + delta;
    onUpdate({ ...params, mu: Math.round(next * 100) / 100 });
  }, pxPerUnit);

  // Shoulder handle: at μ + σ, midway up the curve → σ
  const shoulderX = mu + sigma;
  const shoulderSvgX = xToSvg(shoulderX);
  const shoulderY = normalPdf(shoulderX, mu, sigma);
  const shoulderSvgY = PAD_T + PLOT_H - (shoulderY / peakY) * PLOT_H;

  const sigmaDrag = useDragHandle((delta, startVal) => {
    const next = Math.max(0.01, startVal + delta);
    onUpdate({ ...params, sigma: Math.round(next * 100) / 100 });
  }, pxPerUnit);

  return (
    <div className="flex flex-col gap-1" data-testid="dist-editor-normal">
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="overflow-visible rounded-md bg-surface-2"
        aria-label="Normal distribution PDF"
      >
        {/* Baseline */}
        <line
          x1={PAD_L}
          y1={PAD_T + PLOT_H}
          x2={PAD_L + PLOT_W}
          y2={PAD_T + PLOT_H}
          stroke="var(--color-border)"
          strokeWidth={1}
        />
        {/* Filled area */}
        <path
          d={`${path} L${xToSvg(xMax).toFixed(1)},${PAD_T + PLOT_H} L${xToSvg(xMin).toFixed(1)},${PAD_T + PLOT_H} Z`}
          fill="oklch(55% 0.18 180 / 0.15)"
        />
        {/* Curve */}
        <path d={path} fill="none" stroke="oklch(65% 0.18 180)" strokeWidth={1.5} />
        {/* μ line */}
        <line
          x1={peakSvgX}
          y1={PAD_T}
          x2={peakSvgX}
          y2={PAD_T + PLOT_H}
          stroke="oklch(65% 0.18 180)"
          strokeWidth={0.75}
          strokeDasharray="3 2"
        />
        {/* σ span line */}
        <line
          x1={peakSvgX}
          y1={shoulderSvgY}
          x2={shoulderSvgX}
          y2={shoulderSvgY}
          stroke="oklch(65% 0.15 60)"
          strokeWidth={0.75}
          strokeDasharray="2 2"
        />
        {/* Peak handle (μ) */}
        <circle
          cx={peakSvgX}
          cy={peakSvgY}
          r={HANDLE_R}
          fill="oklch(65% 0.18 180)"
          stroke="white"
          strokeWidth={1.5}
          style={{ cursor: "ew-resize" }}
          onPointerDown={(e) => muDrag.onPointerDown(e, mu)}
          onPointerMove={muDrag.onPointerMove}
          onPointerUp={muDrag.onPointerUp}
          aria-label={`μ = ${mu.toFixed(2)}, drag to change mean`}
          role="slider"
          aria-valuenow={mu}
          aria-valuemin={-1000}
          aria-valuemax={1000}
        />
        {/* Shoulder handle (σ) */}
        <circle
          cx={shoulderSvgX}
          cy={shoulderSvgY}
          r={HANDLE_R}
          fill="oklch(65% 0.15 60)"
          stroke="white"
          strokeWidth={1.5}
          style={{ cursor: "ew-resize" }}
          onPointerDown={(e) => sigmaDrag.onPointerDown(e, sigma)}
          onPointerMove={sigmaDrag.onPointerMove}
          onPointerUp={sigmaDrag.onPointerUp}
          aria-label={`σ = ${sigma.toFixed(2)}, drag right to increase σ`}
          role="slider"
          aria-valuenow={sigma}
          aria-valuemin={0.01}
          aria-valuemax={1000}
        />
      </svg>
      <div className="flex justify-between font-mono text-[10px] text-fg-muted">
        <span>μ = {mu.toFixed(2)}</span>
        <span>σ = {sigma.toFixed(2)}</span>
      </div>
    </div>
  );
}

// ── Beta Editor ──────────────────────────────────────────────────────────────

export function BetaEditor({
  params,
  onUpdate,
}: {
  params: ResolvedParams;
  onUpdate: (next: ResolvedParams) => void;
}) {
  const alpha = Math.max(typeof params.alpha === "number" ? params.alpha : 2, 0.01);
  const beta = Math.max(typeof params.beta === "number" ? params.beta : 2, 0.01);

  const N = 80;
  const xs = Array.from({ length: N }, (_, i) => 0.01 + (i / (N - 1)) * 0.98);
  const ys = xs.map((x) => betaPdf(x, alpha, beta));
  const maxY = Math.max(...ys, 0.01);

  const xToSvg = (x: number) => PAD_L + x * PLOT_W;
  const path = buildPath(xs, ys, maxY, xToSvg);

  const pxPerUnit = PLOT_W / 10; // 10 units of alpha/beta per full width

  const alphaDrag = useDragHandle((delta, startVal) => {
    const next = Math.max(0.01, startVal + delta);
    onUpdate({ ...params, alpha: Math.round(next * 100) / 100 });
  }, pxPerUnit);

  const betaDrag = useDragHandle((delta, startVal) => {
    const next = Math.max(0.01, startVal + delta);
    onUpdate({ ...params, beta: Math.round(next * 100) / 100 });
  }, pxPerUnit);

  // α handle at x=0.15 (left side of curve), β handle at x=0.85 (right side)
  const alphaHandleX = xToSvg(0.15);
  const betaHandleX = xToSvg(0.85);
  const alphaHandleY = PAD_T + PLOT_H - (betaPdf(0.15, alpha, beta) / maxY) * PLOT_H;
  const betaHandleY = PAD_T + PLOT_H - (betaPdf(0.85, alpha, beta) / maxY) * PLOT_H;

  return (
    <div className="flex flex-col gap-1" data-testid="dist-editor-beta">
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="overflow-visible rounded-md bg-surface-2"
        aria-label="Beta distribution PDF"
      >
        <line
          x1={PAD_L}
          y1={PAD_T + PLOT_H}
          x2={PAD_L + PLOT_W}
          y2={PAD_T + PLOT_H}
          stroke="var(--color-border)"
          strokeWidth={1}
        />
        <path
          d={`${path} L${xToSvg(0.99).toFixed(1)},${PAD_T + PLOT_H} L${xToSvg(0.01).toFixed(1)},${PAD_T + PLOT_H} Z`}
          fill="oklch(55% 0.18 285 / 0.15)"
        />
        <path d={path} fill="none" stroke="oklch(65% 0.18 285)" strokeWidth={1.5} />
        {/* α handle */}
        <circle
          cx={alphaHandleX}
          cy={Math.max(PAD_T + 2, alphaHandleY)}
          r={HANDLE_R}
          fill="oklch(65% 0.18 285)"
          stroke="white"
          strokeWidth={1.5}
          style={{ cursor: "ew-resize" }}
          onPointerDown={(e) => alphaDrag.onPointerDown(e, alpha)}
          onPointerMove={alphaDrag.onPointerMove}
          onPointerUp={alphaDrag.onPointerUp}
          aria-label={`α = ${alpha.toFixed(2)}, drag to change`}
          role="slider"
          aria-valuenow={alpha}
          aria-valuemin={0.01}
          aria-valuemax={100}
        />
        {/* β handle */}
        <circle
          cx={betaHandleX}
          cy={Math.max(PAD_T + 2, betaHandleY)}
          r={HANDLE_R}
          fill="oklch(55% 0.18 30)"
          stroke="white"
          strokeWidth={1.5}
          style={{ cursor: "ew-resize" }}
          onPointerDown={(e) => betaDrag.onPointerDown(e, beta)}
          onPointerMove={betaDrag.onPointerMove}
          onPointerUp={betaDrag.onPointerUp}
          aria-label={`β = ${beta.toFixed(2)}, drag to change`}
          role="slider"
          aria-valuenow={beta}
          aria-valuemin={0.01}
          aria-valuemax={100}
        />
      </svg>
      <div className="flex justify-between font-mono text-[10px] text-fg-muted">
        <span>α = {alpha.toFixed(2)}</span>
        <span>β = {beta.toFixed(2)}</span>
      </div>
    </div>
  );
}

// ── Discrete bar-chart helper ────────────────────────────────────────────────

function BarChart({
  ks,
  ps,
  color,
  maxK,
  label,
}: {
  ks: number[];
  ps: number[];
  color: string;
  maxK: number;
  label: string;
}) {
  const maxP = Math.max(...ps, 0.01);
  const barW = Math.max(1, PLOT_W / (maxK + 1) - 1);
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="overflow-visible rounded-md bg-surface-2"
      aria-label={label}
    >
      <line
        x1={PAD_L}
        y1={PAD_T + PLOT_H}
        x2={PAD_L + PLOT_W}
        y2={PAD_T + PLOT_H}
        stroke="var(--color-border)"
        strokeWidth={1}
      />
      {ks.map((k, i) => {
        const bh = ((ps[i] ?? 0) / maxP) * PLOT_H;
        const bx = PAD_L + (k / (maxK + 1)) * PLOT_W;
        return (
          <rect
            key={k}
            x={bx}
            y={PAD_T + PLOT_H - bh}
            width={barW}
            height={bh}
            fill={color}
            opacity={0.8}
          />
        );
      })}
    </svg>
  );
}

// ── Bernoulli Editor ─────────────────────────────────────────────────────────

export function BernoulliEditor({
  params,
  onUpdate,
}: {
  params: ResolvedParams;
  onUpdate: (next: ResolvedParams) => void;
}) {
  const p = typeof params.p === "number" ? Math.max(0, Math.min(1, params.p)) : 0.5;
  const pxPerUnit = PLOT_W;

  const pDrag = useDragHandle((delta, startVal) => {
    const next = Math.max(0, Math.min(1, startVal + delta));
    onUpdate({ ...params, p: Math.round(next * 100) / 100 });
  }, pxPerUnit);

  return (
    <div className="flex flex-col gap-1" data-testid="dist-editor-bernoulli">
      <BarChart
        ks={[0, 1]}
        ps={[1 - p, p]}
        color="oklch(65% 0.15 150)"
        maxK={2}
        label="Bernoulli PMF"
      />
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] text-fg-muted">p =</span>
        <div
          className="relative flex-1 rounded bg-border"
          style={{ height: 4 }}
          data-testid="bernoulli-p-track"
        >
          <div
            className="absolute inset-y-0 left-0 rounded bg-role-control-border"
            style={{ width: `${p * 100}%` }}
          />
          <svg
            width={PLOT_W}
            height={12}
            viewBox={`0 0 ${PLOT_W} 12`}
            className="absolute inset-y-[-4px] left-0 overflow-visible"
          >
            <title>Probability scrubber</title>
            <circle
              cx={p * PLOT_W}
              cy={6}
              r={HANDLE_R}
              fill="oklch(65% 0.15 150)"
              stroke="white"
              strokeWidth={1.5}
              style={{ cursor: "ew-resize" }}
              onPointerDown={(e) => pDrag.onPointerDown(e, p)}
              onPointerMove={pDrag.onPointerMove}
              onPointerUp={pDrag.onPointerUp}
              aria-label={`p = ${p.toFixed(2)}`}
              role="slider"
              aria-valuenow={p}
              aria-valuemin={0}
              aria-valuemax={1}
            />
          </svg>
        </div>
        <span className="font-mono text-[10px] text-fg">{p.toFixed(2)}</span>
      </div>
    </div>
  );
}

// ── Binomial Editor ──────────────────────────────────────────────────────────

export function BinomialEditor({
  params,
  onUpdate: _onUpdate,
}: {
  params: ResolvedParams;
  onUpdate: (next: ResolvedParams) => void;
}) {
  const n = typeof params.n === "number" ? Math.max(1, Math.round(params.n)) : 10;
  const p = typeof params.p === "number" ? Math.max(0, Math.min(1, params.p)) : 0.5;

  const maxShow = Math.min(n, 30);
  const ks = Array.from({ length: maxShow + 1 }, (_, i) => i);
  const ps = ks.map((k) => binomialPmf(k, n, p));

  return (
    <div className="flex flex-col gap-1" data-testid="dist-editor-binomial">
      <BarChart ks={ks} ps={ps} color="oklch(65% 0.15 200)" maxK={maxShow} label="Binomial PMF" />
      <div className="flex justify-between font-mono text-[10px] text-fg-muted">
        <span>n = {n}</span>
        <span>p = {p.toFixed(2)}</span>
      </div>
    </div>
  );
}

// ── Poisson Editor ───────────────────────────────────────────────────────────

export function PoissonEditor({
  params,
  onUpdate: _onUpdate,
}: {
  params: ResolvedParams;
  onUpdate: (next: ResolvedParams) => void;
}) {
  const lambda = typeof params.lambda === "number" ? Math.max(0.01, params.lambda) : 3;
  const maxK = Math.min(Math.ceil(lambda + 4 * Math.sqrt(lambda)), 40);
  const ks = Array.from({ length: maxK + 1 }, (_, i) => i);
  const ps = ks.map((k) => poissonPmf(k, lambda));

  return (
    <div className="flex flex-col gap-1" data-testid="dist-editor-poisson">
      <BarChart ks={ks} ps={ps} color="oklch(65% 0.15 240)" maxK={maxK} label="Poisson PMF" />
      <div className="flex justify-center font-mono text-[10px] text-fg-muted">
        <span>λ = {lambda.toFixed(2)}</span>
      </div>
    </div>
  );
}

// ── Gamma Editor ─────────────────────────────────────────────────────────────

export function GammaEditor({
  params,
  onUpdate: _onUpdate,
}: {
  params: ResolvedParams;
  onUpdate: (next: ResolvedParams) => void;
}) {
  const alpha = Math.max(typeof params.alpha === "number" ? params.alpha : 2, 0.1);
  const beta = Math.max(typeof params.beta === "number" ? params.beta : 1, 0.01);

  const xMax = alpha / beta + (5 * Math.sqrt(alpha)) / beta;
  const N = 80;
  const xs = Array.from({ length: N }, (_, i) => 0.001 + (i / (N - 1)) * xMax);
  const ys = xs.map((x) => gammaPdf(x, alpha, beta));
  const maxY = Math.max(...ys, 0.01);
  const xToSvg = (x: number) => PAD_L + (x / xMax) * PLOT_W;
  const path = buildPath(xs, ys, maxY, xToSvg);

  return (
    <div className="flex flex-col gap-1" data-testid="dist-editor-gamma">
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="overflow-visible rounded-md bg-surface-2"
        aria-label="Gamma distribution PDF"
      >
        <line
          x1={PAD_L}
          y1={PAD_T + PLOT_H}
          x2={PAD_L + PLOT_W}
          y2={PAD_T + PLOT_H}
          stroke="var(--color-border)"
          strokeWidth={1}
        />
        <path
          d={`${path} L${xToSvg(xMax).toFixed(1)},${PAD_T + PLOT_H} L${xToSvg(0.001).toFixed(1)},${PAD_T + PLOT_H} Z`}
          fill="oklch(55% 0.18 30 / 0.15)"
        />
        <path d={path} fill="none" stroke="oklch(65% 0.18 30)" strokeWidth={1.5} />
      </svg>
      <div className="flex justify-between font-mono text-[10px] text-fg-muted">
        <span>α = {alpha.toFixed(2)}</span>
        <span>β = {beta.toFixed(2)}</span>
      </div>
    </div>
  );
}

// ── Uniform Editor ───────────────────────────────────────────────────────────

export function UniformEditor({
  params,
  onUpdate: _onUpdate,
}: {
  params: ResolvedParams;
  onUpdate: (next: ResolvedParams) => void;
}) {
  const a = typeof params.a === "number" ? params.a : 0;
  const b = typeof params.b === "number" ? params.b : 1;
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const range = hi - lo;
  const domainMin = lo - range * 0.1;
  const domainMax = hi + range * 0.1;
  const domainRange = domainMax - domainMin;
  const N = 80;
  const xs = Array.from({ length: N }, (_, i) => domainMin + (i / (N - 1)) * domainRange);
  const ys = xs.map((x) => uniformPdf(x, lo, hi));
  const maxY = range > 0 ? 1 / range : 1;
  const xToSvg = (x: number) => PAD_L + ((x - domainMin) / domainRange) * PLOT_W;
  const path = buildPath(xs, ys, maxY, xToSvg);

  return (
    <div className="flex flex-col gap-1" data-testid="dist-editor-uniform">
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="overflow-visible rounded-md bg-surface-2"
        aria-label="Uniform distribution PDF"
      >
        <line
          x1={PAD_L}
          y1={PAD_T + PLOT_H}
          x2={PAD_L + PLOT_W}
          y2={PAD_T + PLOT_H}
          stroke="var(--color-border)"
          strokeWidth={1}
        />
        <path
          d={`${path} L${xToSvg(domainMax).toFixed(1)},${PAD_T + PLOT_H} L${xToSvg(domainMin).toFixed(1)},${PAD_T + PLOT_H} Z`}
          fill="oklch(55% 0.15 120 / 0.15)"
        />
        <path d={path} fill="none" stroke="oklch(65% 0.15 120)" strokeWidth={1.5} />
      </svg>
      <div className="flex justify-between font-mono text-[10px] text-fg-muted">
        <span>a = {a.toFixed(2)}</span>
        <span>b = {b.toFixed(2)}</span>
      </div>
    </div>
  );
}
