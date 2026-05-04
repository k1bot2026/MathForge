import { describe, expect, test } from "vitest";
import { computeNormal } from "../normal/compute";
import { PdfCdfBlock } from "./definition";

function makeNormalDist(): ReturnType<typeof computeNormal> {
  return computeNormal({}, { mu: 0, sigma: 1 });
}

describe("viz.pdf-cdf compute", () => {
  test("returns X passthrough when X is provided", () => {
    const X = makeNormalDist();
    expect(PdfCdfBlock.compute({ X }, {})).toBe(X);
  });

  test("throws when X input is missing", () => {
    expect(() => PdfCdfBlock.compute({}, {})).toThrow(
      "viz.pdf-cdf requires a Distribution input on port X",
    );
  });
});

describe("viz.pdf-cdf definition explain", () => {
  test("effect returns connect prompt when X is missing", () => {
    expect(PdfCdfBlock.explain.effect?.({}, undefined as never)).toMatch(/Connect/);
  });

  test("effect shows distribution family when X is connected", () => {
    const X = makeNormalDist();
    const msg = PdfCdfBlock.explain.effect?.({ X }, undefined as never);
    expect(msg).toMatch(/Normal/);
  });

  test("impact shows passthrough distribution family", () => {
    const X = makeNormalDist();
    const msg = PdfCdfBlock.explain.impact?.({}, X);
    expect(msg).toMatch(/Normal/);
  });
});
