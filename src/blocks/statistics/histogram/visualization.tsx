"use client";

import * as Plot from "@observablehq/plot";
import { useEffect, useRef } from "react";
import type { ResolvedInputs, ResolvedParams } from "~/blocks/types";
import type { MathValue } from "~/math/types";

const WIDTH = 460;
const HEIGHT = 220;

type KdePoint = { x: number; y: number };

function gaussianKde(samples: number[], bandwidth: number, xs: number[]): KdePoint[] {
  return xs.map((x) => {
    const y =
      samples.reduce((sum, xi) => {
        const z = (x - xi) / bandwidth;
        return sum + Math.exp(-0.5 * z * z);
      }, 0) /
      (samples.length * bandwidth * Math.sqrt(2 * Math.PI));
    return { x, y };
  });
}

function silvermanBandwidth(samples: number[]): number {
  const n = samples.length;
  if (n < 2) return 1;
  const mean = samples.reduce((a, b) => a + b, 0) / n;
  const variance = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1);
  const std = Math.sqrt(variance);
  const sorted = [...samples].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(n * 0.25)] ?? sorted[0] ?? 0;
  const q3 = sorted[Math.floor(n * 0.75)] ?? sorted[n - 1] ?? 0;
  const iqr = q3 - q1;
  const s = Math.min(std, iqr / 1.34);
  return 1.06 * s * n ** -0.2;
}

export function HistogramVisualization({
  inputs,
  params,
}: {
  inputs: ResolvedInputs;
  output: MathValue | undefined;
  params?: ResolvedParams;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const samples = inputs.samples;
  const kdeEnabled = params?.kde !== false;

  useEffect(() => {
    const el = containerRef.current;
    if (el === null) return;

    if (samples === undefined || samples.type.kind !== "Vector") {
      el.innerHTML = "";
      return;
    }

    const data = samples.payload as ReadonlyArray<number>;
    if (data.length === 0) {
      el.innerHTML = "";
      return;
    }

    const binCount = typeof params?.bins === "number" && params.bins > 0 ? params.bins : undefined;

    const marks: Plot.Markish[] = [
      Plot.rectY(
        data,
        binCount !== undefined
          ? Plot.binX({ y: "proportion-facet" }, { thresholds: binCount })
          : Plot.binX({ y: "proportion-facet" }),
      ),
      Plot.ruleY([0]),
    ];

    if (kdeEnabled && data.length >= 5) {
      const bw = silvermanBandwidth([...data]);
      if (bw > 0) {
        const lo = Math.min(...data);
        const hi = Math.max(...data);
        const range = hi - lo || 1;
        const xKde = Array.from(
          { length: 200 },
          (_, i) => lo - range * 0.1 + (i / 199) * (range * 1.2),
        );
        const kdeData = gaussianKde([...data], bw, xKde);
        marks.push(
          Plot.lineY(kdeData, {
            x: "x",
            y: "y",
            stroke: "var(--role-operation-border)",
            strokeWidth: 1.5,
          }),
        );
      }
    }

    const chart = Plot.plot({
      width: WIDTH,
      height: HEIGHT,
      marginLeft: 44,
      marginBottom: 36,
      x: { label: "value" },
      y: { label: "density", grid: true },
      marks,
      style: {
        background: "transparent",
        color: "var(--fg-muted)",
        fontSize: "10px",
        overflow: "visible",
      },
    });

    el.innerHTML = "";
    el.append(chart);

    return () => {
      chart.remove();
    };
  }, [samples, params, kdeEnabled]);

  if (samples === undefined || samples.type.kind !== "Vector") {
    return (
      <div
        data-testid="histogram-placeholder"
        className="flex h-[80px] items-center justify-center text-center text-xs text-fg-faint"
      >
        Connect a Vector of samples to the samples port.
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label="Histogram of sample data"
      data-testid="histogram-root"
      ref={containerRef}
      style={{ width: WIDTH, height: HEIGHT }}
    />
  );
}
