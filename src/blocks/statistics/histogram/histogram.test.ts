import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import { HistogramBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

function makeVector(samples: number[]): MathValue {
  return {
    type: { kind: "Vector", n: samples.length, field: "real" },
    payload: samples as unknown as number,
    provenance: { blockId: "stats.sample", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("viz.histogram compute", () => {
  test("returns samples passthrough when samples is provided", () => {
    const v = makeVector([1, 2, 3]);
    expect(HistogramBlock.compute({ samples: v }, {}, ctx)).toBe(v);
  });

  test("throws when samples input is missing", () => {
    expect(() => HistogramBlock.compute({}, {}, ctx)).toThrow(
      "viz.histogram requires a Vector input on port samples",
    );
  });
});

describe("viz.histogram definition explain", () => {
  test("effect returns connect prompt when samples is missing", () => {
    expect(HistogramBlock.explain.effect?.({}, undefined as never)).toMatch(/Connect/);
  });

  test("effect shows sample count when samples is connected", () => {
    const v = makeVector([1, 2, 3, 4, 5]);
    const msg = HistogramBlock.explain.effect?.({ samples: v }, undefined as never);
    expect(msg).toMatch(/5 samples/);
  });

  test("impact shows passthrough vector size", () => {
    const v = makeVector([1, 2, 3]);
    const msg = HistogramBlock.explain.impact?.({}, v);
    expect(msg).toMatch(/Vector\(3\)/);
  });
});
