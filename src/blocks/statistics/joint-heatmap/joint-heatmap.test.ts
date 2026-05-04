import { describe, expect, test } from "vitest";
import { computeNormal } from "../normal/compute";
import { JointHeatmapBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

function makeNormalDist() {
  return computeNormal({}, { mu: 0, sigma: 1 });
}

describe("viz.joint-heatmap compute", () => {
  test("returns X passthrough when X is provided", () => {
    const X = makeNormalDist();
    expect(JointHeatmapBlock.compute({ X }, {}, ctx)).toBe(X);
  });

  test("throws when X input is missing", () => {
    expect(() => JointHeatmapBlock.compute({}, {}, ctx)).toThrow(
      "viz.joint-heatmap requires Distribution inputs on X and Y",
    );
  });
});

describe("viz.joint-heatmap definition explain", () => {
  test("effect returns connect prompt when X or Y is missing", () => {
    expect(JointHeatmapBlock.explain.effect?.({}, undefined as never)).toMatch(/Connect/);
  });

  test("effect shows joint density family when both connected", () => {
    const X = makeNormalDist();
    const msg = JointHeatmapBlock.explain.effect?.({ X, Y: makeNormalDist() }, undefined as never);
    expect(msg).toMatch(/Normal × Normal/);
  });

  test("impact shows passthrough X family", () => {
    const X = makeNormalDist();
    const msg = JointHeatmapBlock.explain.impact?.({}, X);
    expect(msg).toMatch(/Normal/);
  });
});
