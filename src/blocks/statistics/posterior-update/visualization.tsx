"use client";

// Posterior update visualization for Beta-Bernoulli conjugate prior.
//
// Displays the prior PDF, likelihood contribution, and posterior PDF
// side-by-side on a [0,1] axis. Uses Framer Motion for the smooth
// curve-morph transition when parameters change.
//
// Supports: Beta prior + Bernoulli/Binomial likelihood (conjugate).
// Falls back to showing only the prior if the distribution is not Beta.

import { motion } from "framer-motion";
import type { ResolvedInputs, ResolvedParams } from "~/blocks/types";
import type { MathValue } from "~/math/types";
import type { DistributionPayload } from "../distribution-payload";

const W = 440;
const H = 200;
const PAD_L = 36;
const PAD_R = 12;
const PAD_T = 16;
const PAD_B = 32;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;
const N_POINTS = 200;

function lnGamma(z: number): number {
  const c = [76.18009173, -86.50532033, 24.01409824, -1.23173957, 0.00120865097, -5.3952394e-6];
  const x = z;
  let y = z;
  const tmp = x + 5.5;
  const ser = c.reduce((acc, ci) => {
    y += 1;
    return acc + ci / y;
  }, 1.00000000019);
  return (x + 0.5) * Math.log(tmp) - tmp + Math.log((2.50662827465 * ser) / x);
}

function betaPdf(x: number, alpha: number, beta: number): number {
  if (x <= 0 || x >= 1) return 0;
  const logB = lnGamma(alpha) + lnGamma(beta) - lnGamma(alpha + beta);
  return Math.exp((alpha - 1) * Math.log(x) + (beta - 1) * Math.log(1 - x) - logB);
}

function xs(): number[] {
  return Array.from({ length: N_POINTS }, (_, i) => 0.001 + (i / (N_POINTS - 1)) * 0.998);
}

function pdfToPath(xArr: number[], yArr: number[], yMax: number): string {
  if (yMax < 1e-15) return "";
  return xArr
    .map((x, i) => {
      const px = PAD_L + x * PLOT_W;
      const py = PAD_T + (1 - (yArr[i] ?? 0) / yMax) * PLOT_H;
      return `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`;
    })
    .join(" ");
}

type CurveProps = {
  alpha: number;
  beta: number;
  color: string;
  label: string;
  yMax: number;
};

function BetaCurve({ alpha, beta, color, label, yMax }: CurveProps) {
  const xArr = xs();
  const yArr = xArr.map((x) => betaPdf(x, alpha, beta));
  const d = pdfToPath(xArr, yArr, yMax);
  if (!d) return null;
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinejoin="round"
      initial={false}
      animate={{ d }}
      transition={{ duration: 0.35, ease: "easeInOut" }}
      aria-label={label}
    />
  );
}

function AreaUnderCurve({ alpha, beta, color, yMax }: Omit<CurveProps, "label">) {
  const xArr = xs();
  const yArr = xArr.map((x) => betaPdf(x, alpha, beta));
  const pts = xArr
    .map((x, i) => {
      const px = PAD_L + x * PLOT_W;
      const py = PAD_T + (1 - (yArr[i] ?? 0) / yMax) * PLOT_H;
      return `${px.toFixed(1)},${py.toFixed(1)}`;
    })
    .join(" ");
  const baseline = PAD_T + PLOT_H;
  const d = `M${PAD_L + 0.001 * PLOT_W},${baseline} L${pts} L${PAD_L + 0.999 * PLOT_W},${baseline} Z`;
  return (
    <motion.path
      d={d}
      fill={color}
      fillOpacity={0.15}
      stroke="none"
      initial={false}
      animate={{ d }}
      transition={{ duration: 0.35, ease: "easeInOut" }}
    />
  );
}

export function PosteriorUpdateVisualization({
  inputs,
  params,
}: {
  inputs: ResolvedInputs;
  output: MathValue | undefined;
  params?: ResolvedParams;
}) {
  const prior = inputs.prior;

  if (prior === undefined || prior.type.kind !== "Distribution") {
    return (
      <div
        data-testid="posterior-update-placeholder"
        className="flex h-[80px] items-center justify-center text-center text-xs text-fg-faint"
      >
        Connect a Beta Distribution to prior.
      </div>
    );
  }

  const payload = prior.payload as unknown as DistributionPayload;
  if (payload.parameters.family !== "Beta") {
    return (
      <div
        data-testid="posterior-update-non-beta"
        className="flex h-[80px] items-center justify-center text-center text-xs text-fg-faint"
      >
        Only Beta priors are supported for conjugate update. Connect a Beta distribution.
      </div>
    );
  }

  const { alpha: priorAlpha, beta: priorBeta } = payload.parameters;
  const n = typeof params?.n_obs === "number" ? Math.round(Math.max(0, params.n_obs)) : 0;
  const k =
    typeof params?.k_hits === "number" ? Math.round(Math.max(0, Math.min(n, params.k_hits))) : 0;

  // Beta-Bernoulli conjugate update: posterior = Beta(alpha + k, beta + n - k)
  const postAlpha = priorAlpha + k;
  const postBeta = priorBeta + (n - k);

  // Find shared y-axis max for both curves
  const xArr = xs();
  const priorYs = xArr.map((x) => betaPdf(x, priorAlpha, priorBeta));
  const postYs = xArr.map((x) => betaPdf(x, postAlpha, postBeta));
  const yMax = Math.max(...priorYs, ...postYs, 1e-10);

  // X-axis ticks
  type Tick = { val: number; px: number };
  const xTicks: Tick[] = [0, 0.25, 0.5, 0.75, 1].map((v) => ({
    val: v,
    px: PAD_L + v * PLOT_W,
  }));

  const priorColor = "var(--role-source-border)";
  const posteriorColor = "var(--role-operation-border)";

  return (
    <div data-testid="posterior-update-root" className="flex flex-col gap-1">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: W, height: H }}
        role="img"
        aria-label={`Posterior update: Beta(${priorAlpha},${priorBeta}) + ${k}/${n} → Beta(${postAlpha},${postBeta})`}
      >
        {/* Plot border */}
        <rect
          x={PAD_L}
          y={PAD_T}
          width={PLOT_W}
          height={PLOT_H}
          fill="var(--bg)"
          stroke="var(--border)"
          strokeWidth={0.5}
        />
        <line
          x1={PAD_L}
          y1={PAD_T + PLOT_H}
          x2={PAD_L + PLOT_W}
          y2={PAD_T + PLOT_H}
          stroke="var(--border)"
          strokeWidth={1}
        />

        {/* Area fills */}
        <AreaUnderCurve alpha={priorAlpha} beta={priorBeta} color={priorColor} yMax={yMax} />
        <AreaUnderCurve alpha={postAlpha} beta={postBeta} color={posteriorColor} yMax={yMax} />

        {/* PDF curves */}
        <BetaCurve
          alpha={priorAlpha}
          beta={priorBeta}
          color={priorColor}
          label={`Prior Beta(${priorAlpha.toPrecision(3)}, ${priorBeta.toPrecision(3)})`}
          yMax={yMax}
        />
        <BetaCurve
          alpha={postAlpha}
          beta={postBeta}
          color={posteriorColor}
          label={`Posterior Beta(${postAlpha.toPrecision(3)}, ${postBeta.toPrecision(3)})`}
          yMax={yMax}
        />

        {/* X-axis ticks */}
        {xTicks.map(({ val, px }) => (
          <g key={`xt-${val}`}>
            <line
              x1={px}
              y1={PAD_T + PLOT_H}
              x2={px}
              y2={PAD_T + PLOT_H + 4}
              stroke="var(--fg-muted)"
              strokeWidth={0.8}
            />
            <text
              x={px}
              y={PAD_T + PLOT_H + 14}
              textAnchor="middle"
              fontSize={9}
              fill="var(--fg-muted)"
            >
              {val}
            </text>
          </g>
        ))}

        {/* y-max label */}
        <text x={PAD_L - 4} y={PAD_T + 4} textAnchor="end" fontSize={9} fill="var(--fg-muted)">
          {yMax.toPrecision(2)}
        </text>

        {/* Legend */}
        <g>
          <line
            x1={PAD_L + 4}
            y1={PAD_T + 8}
            x2={PAD_L + 18}
            y2={PAD_T + 8}
            stroke={priorColor}
            strokeWidth={2}
          />
          <text x={PAD_L + 22} y={PAD_T + 11} fontSize={8} fill="var(--fg-muted)">
            Prior Beta({priorAlpha.toPrecision(3)}, {priorBeta.toPrecision(3)})
          </text>
        </g>
        <g>
          <line
            x1={PAD_L + 4}
            y1={PAD_T + 20}
            x2={PAD_L + 18}
            y2={PAD_T + 20}
            stroke={posteriorColor}
            strokeWidth={2}
          />
          <text x={PAD_L + 22} y={PAD_T + 23} fontSize={8} fill="var(--fg-muted)">
            Posterior Beta({postAlpha.toPrecision(3)}, {postBeta.toPrecision(3)})
          </text>
        </g>
      </svg>

      {/* Observation summary */}
      <div className="px-2 text-xs text-fg-muted">
        {n === 0
          ? "Adjust n_obs and k_hits to see the posterior update."
          : `${k} successes in ${n} trials → p̂ = ${(k / n).toFixed(3)}`}
      </div>
    </div>
  );
}
