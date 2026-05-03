/**
 * Cross-engine tests for stats.var — verifies that the block correctly
 * reads Var[X] from the DistributionPayload for each parametric family, using
 * SymPy-verified moment values from the stats-* fixture files.
 *
 * stats.var just extracts moments.variance from the payload; these tests
 * confirm the full pipeline: computeX → computeVar → SymPy Var[X].
 *
 * @cross-engine
 */

import { describe, expect, test } from "vitest";
import type { DistributionFamily, MathValue } from "~/math/types";
import {
  loadBernoulliFixture,
  loadBetaDistFixture,
  loadBinomialFixture,
  loadGammaDistFixture,
  loadNormalDistFixture,
  loadPoissonFixture,
  loadUniformDistFixture,
} from "../../../../tests/sympy-reference";
import { computeBernoulli } from "../bernoulli/compute";
import { computeBeta } from "../beta/compute";
import { computeBinomial } from "../binomial/compute";
import { computeGamma } from "../gamma/compute";
import { computeNormal } from "../normal/compute";
import { computePoisson } from "../poisson/compute";
import { computeUniform } from "../uniform/compute";
import { computeVar } from "./compute";

const TOL = 1e-9;

function toInput(distResult: MathValue): MathValue {
  return {
    ...distResult,
    type: distResult.type as { kind: "Distribution"; family: DistributionFamily },
  };
}

function varValue(dist: MathValue): number {
  return computeVar({ dist: toInput(dist) }, {}).payload as number;
}

describe("stats.var cross-engine (SymPy fixture moments)", () => {
  describe("Bernoulli: Var[X] = p(1-p) matches SymPy for all cases", () => {
    const fixture = loadBernoulliFixture();
    for (const c of fixture.cases) {
      test(`p=${c.parameters.p}`, () => {
        const v = varValue(computeBernoulli({}, { p: c.parameters.p }));
        expect(Math.abs(v - c.moments.variance)).toBeLessThan(TOL);
      });
    }
  });

  describe("Binomial: Var[X] = np(1-p) matches SymPy for all cases", () => {
    const fixture = loadBinomialFixture();
    for (const c of fixture.cases) {
      test(`n=${c.parameters.n}, p=${c.parameters.p}`, () => {
        const v = varValue(computeBinomial({}, { n: c.parameters.n, p: c.parameters.p }));
        expect(Math.abs(v - c.moments.variance)).toBeLessThan(TOL);
      });
    }
  });

  describe("Uniform: Var[X] = (b-a)^2/12 matches SymPy for all cases", () => {
    const fixture = loadUniformDistFixture();
    for (const c of fixture.cases) {
      test(`a=${c.parameters.a}, b=${c.parameters.b}`, () => {
        const v = varValue(computeUniform({}, { a: c.parameters.a, b: c.parameters.b }));
        expect(Math.abs(v - c.moments.variance)).toBeLessThan(TOL);
      });
    }
  });

  describe("Normal: Var[X] = sigma^2 matches SymPy for all cases", () => {
    const fixture = loadNormalDistFixture();
    for (const c of fixture.cases) {
      test(`mu=${c.parameters.mu}, sigma=${c.parameters.sigma}`, () => {
        const v = varValue(computeNormal({}, { mu: c.parameters.mu, sigma: c.parameters.sigma }));
        expect(Math.abs(v - c.moments.variance)).toBeLessThan(TOL);
      });
    }
  });

  describe("Poisson: Var[X] = lambda matches SymPy for all cases", () => {
    const fixture = loadPoissonFixture();
    for (const c of fixture.cases) {
      test(`lambda=${c.parameters.lambda}`, () => {
        const v = varValue(computePoisson({}, { lambda: c.parameters.lambda }));
        expect(Math.abs(v - c.moments.variance)).toBeLessThan(TOL);
      });
    }
  });

  describe("Beta: Var[X] matches SymPy for all cases", () => {
    const fixture = loadBetaDistFixture();
    for (const c of fixture.cases) {
      test(`alpha=${c.parameters.alpha}, beta=${c.parameters.beta}`, () => {
        const v = varValue(computeBeta({}, { alpha: c.parameters.alpha, beta: c.parameters.beta }));
        expect(Math.abs(v - c.moments.variance)).toBeLessThan(TOL);
      });
    }
  });

  describe("Gamma: Var[X] = alpha/beta^2 matches SymPy for all cases", () => {
    const fixture = loadGammaDistFixture();
    for (const c of fixture.cases) {
      test(`alpha=${c.parameters.alpha}, beta=${c.parameters.beta}`, () => {
        const v = varValue(
          computeGamma({}, { alpha: c.parameters.alpha, beta: c.parameters.beta }),
        );
        expect(Math.abs(v - c.moments.variance)).toBeLessThan(TOL);
      });
    }
  });
});
