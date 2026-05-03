"use client";

// Posterior update visualization — pure renderer.
//
// Displays the prior PDF and posterior PDF overlaid on a [0,1] axis.
// Both curves come from input ports (prior: Beta, posterior: Beta),
// computed upstream by stats.posterior. Framer Motion animates the
// curve morph when the posterior recomputes.

import { motion } from "framer-motion";
import type { ResolvedInputs } from "~/blocks/types";
import type { MathValue } from "~/math/types";
import type { DistributionPayload } from "../distribution-payload";
import { betaPdf } from "../viz-math";

const W = 440;
const H = 200;
const PAD_L = 36;
const PAD_R = 12;
const PAD_T = 16;
const PAD_B = 32;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;
const N_POINTS = 200;

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
}: {
  inputs: ResolvedInputs;
  output: MathValue | undefined;
}) {
  const prior = inputs.prior;
  const posteriorVal = inputs.posterior;

  if (prior === undefined || prior.type.kind !== "Distribution") {
    return (
      <div
        data-testid="posterior-update-placeholder"
        className="flex h-[80px] items-center justify-center text-center text-xs text-fg-faint"
      >
        Connect a Beta prior and wire stats.posterior to the posterior port.
      </div>
    );
  }

  const priorPayload = prior.payload as unknown as DistributionPayload;
  if (priorPayload.parameters.family !== "Beta") {
    return (
      <div
        data-testid="posterior-update-non-beta"
        className="flex h-[80px] items-center justify-center text-center text-xs text-fg-faint"
      >
        Only Beta priors are supported. Connect a Beta distribution.
      </div>
    );
  }

  const { alpha: priorAlpha, beta: priorBeta } = priorPayload.parameters;

  // Posterior comes from stats.posterior via the posterior input port.
  // Show a waiting state if not yet connected.
  if (posteriorVal === undefined || posteriorVal.type.kind !== "Distribution") {
    return (
      <div
        data-testid="posterior-update-waiting"
        className="flex h-[80px] items-center justify-center text-center text-xs text-fg-faint"
      >
        Wire stats.posterior → posterior port to see the update.
      </div>
    );
  }

  const postPayload = posteriorVal.payload as unknown as DistributionPayload;
  if (postPayload.parameters.family !== "Beta") {
    return (
      <div
        data-testid="posterior-update-non-beta"
        className="flex h-[80px] items-center justify-center text-center text-xs text-fg-faint"
      >
        Only Beta posteriors are supported. Use a Beta prior with stats.posterior.
      </div>
    );
  }

  const { alpha: postAlpha, beta: postBeta } = postPayload.parameters;

  // Find shared y-axis max for both curves
  const xArr = xs();
  const priorYs = xArr.map((x) => betaPdf(x, priorAlpha, priorBeta));
  const postYs = xArr.map((x) => betaPdf(x, postAlpha, postBeta));
  const yMax = Math.max(...priorYs, ...postYs, 1e-10);

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
        aria-label={`Posterior update: Beta(${priorAlpha},${priorBeta}) → Beta(${postAlpha},${postBeta})`}
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

      {/* Summary */}
      <div className="px-2 text-xs text-fg-muted">
        E[θ] shifted from {(priorAlpha / (priorAlpha + priorBeta)).toFixed(3)} →{" "}
        {(postAlpha / (postAlpha + postBeta)).toFixed(3)}
      </div>
    </div>
  );
}
