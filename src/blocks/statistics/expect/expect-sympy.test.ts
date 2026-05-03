/**
 * Cross-engine tests for stats.expect — verifies that the block correctly
 * reads E[X] from the DistributionPayload for each parametric family, using
 * SymPy-verified moment values from the stats-* fixture files.
 *
 * stats.expect just extracts moments.mean from the payload; these tests
 * confirm the full pipeline: computeBernoulli → computeExpect → SymPy E[X].
 *
 * @cross-engine
 */

import { describe, expect, test } from "vitest";
import type { DistributionFamily, MathValue } from "~/math/types";
import {
  loadBernoulliFixture,
  loadBinomialFixture,
  loadNormalDistFixture,
  loadPoissonFixture,
  loadUniformDistFixture,
} from "../../../../tests/sympy-reference";
import { computeBernoulli } from "../bernoulli/compute";
import { computeBinomial } from "../binomial/compute";
import { computeNormal } from "../normal/compute";
import { computePoisson } from "../poisson/compute";
import { computeUniform } from "../uniform/compute";
import { computeExpect } from "./compute";

const TOL = 1e-9;

function toInput(distResult: MathValue): MathValue {
  return {
    ...distResult,
    type: distResult.type as { kind: "Distribution"; family: DistributionFamily },
  };
}

function expectValue(dist: MathValue): number {
  return computeExpect({ dist: toInput(dist) }, {}).payload as number;
}

describe("stats.expect cross-engine (SymPy fixture moments)", () => {
  describe("Bernoulli: E[X] = p matches SymPy for all cases", () => {
    const fixture = loadBernoulliFixture();
    for (const c of fixture.cases) {
      test(`p=${c.parameters.p}`, () => {
        const e = expectValue(computeBernoulli({}, { p: c.parameters.p }));
        expect(Math.abs(e - c.moments.mean)).toBeLessThan(TOL);
      });
    }
  });

  describe("Binomial: E[X] = np matches SymPy for all cases", () => {
    const fixture = loadBinomialFixture();
    for (const c of fixture.cases) {
      test(`n=${c.parameters.n}, p=${c.parameters.p}`, () => {
        const e = expectValue(computeBinomial({}, { n: c.parameters.n, p: c.parameters.p }));
        expect(Math.abs(e - c.moments.mean)).toBeLessThan(TOL);
      });
    }
  });

  describe("Uniform: E[X] = (a+b)/2 matches SymPy for all cases", () => {
    const fixture = loadUniformDistFixture();
    for (const c of fixture.cases) {
      test(`a=${c.parameters.a}, b=${c.parameters.b}`, () => {
        const e = expectValue(computeUniform({}, { a: c.parameters.a, b: c.parameters.b }));
        expect(Math.abs(e - c.moments.mean)).toBeLessThan(TOL);
      });
    }
  });

  describe("Normal: E[X] = mu matches SymPy for all cases", () => {
    const fixture = loadNormalDistFixture();
    for (const c of fixture.cases) {
      test(`mu=${c.parameters.mu}, sigma=${c.parameters.sigma}`, () => {
        const e = expectValue(
          computeNormal({}, { mu: c.parameters.mu, sigma: c.parameters.sigma }),
        );
        expect(Math.abs(e - c.moments.mean)).toBeLessThan(TOL);
      });
    }
  });

  describe("Poisson: E[X] = lambda matches SymPy for all cases", () => {
    const fixture = loadPoissonFixture();
    for (const c of fixture.cases) {
      test(`lambda=${c.parameters.lambda}`, () => {
        const e = expectValue(computePoisson({}, { lambda: c.parameters.lambda }));
        expect(Math.abs(e - c.moments.mean)).toBeLessThan(TOL);
      });
    }
  });
});
