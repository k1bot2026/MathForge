/**
 * Cross-engine tests for stats.mgf — verifies that computeMgf passes correct
 * family/params to the Pyodide worker and that the returned sympyStr matches
 * offline SymPy-generated reference values from tests/fixtures/sympy/stats-mgf.json.
 *
 * Pyodide is unavailable in jsdom; the client module is mocked so that each
 * test case returns the fixture's pre-computed SymPy str() string. This verifies:
 *   1. computeMgf correctly maps DistributionPayload → (family, params) for each family.
 *   2. The serialized string stored in ExpressionPayload.serialized matches SymPy output.
 *
 * @cross-engine
 */

import { afterEach, describe, expect, test, vi } from "vitest";
import type { DistributionFamily, ExpressionPayload, MathValue } from "~/math/types";
import { loadMgfFixture } from "../../../../tests/sympy-reference";
import type { DistributionPayload } from "../distribution-payload";
import { computeMgf } from "./compute";

vi.mock("~/engine/workers/pyodide.client", () => ({
  mgf: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

const fixture = loadMgfFixture();

function makeDistInput(family: string, parameters: Record<string, number>): MathValue {
  const p = parameters.p ?? 0.5;
  const n = parameters.n ?? 1;
  const lambda = parameters.lambda ?? 1;
  const mu = parameters.mu ?? 0;
  const sigma = parameters.sigma ?? 1;
  const alpha = parameters.alpha ?? 1;
  const beta = parameters.beta ?? 1;

  const momentsByFamily: Record<string, { mean: number; variance: number }> = {
    Bernoulli: { mean: p, variance: p * (1 - p) },
    Binomial: { mean: n * p, variance: n * p * (1 - p) },
    Poisson: { mean: lambda, variance: lambda },
    Normal: { mean: mu, variance: sigma ** 2 },
    Gamma: { mean: alpha / beta, variance: alpha / beta ** 2 },
  };
  const moments = momentsByFamily[family] ?? { mean: 0, variance: 1 };

  const payload: DistributionPayload = {
    parameters: {
      family: family as DistributionFamily,
      ...parameters,
    } as DistributionPayload["parameters"],
    moments,
    support: { kind: "continuous", lo: 0, hi: Infinity },
  };
  return {
    type: { kind: "Distribution", family: family as DistributionFamily },
    payload: payload as unknown as number,
    provenance: {
      blockId: `stats.${family.toLowerCase()}`,
      inputs: [],
      computedAt: 0,
      engine: "native",
    },
  };
}

describe("stats.mgf cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  describe("serialized string matches SymPy str() for each family", () => {
    for (const c of fixture.cases) {
      test(`${c.family}(${JSON.stringify(c.parameters)}) → "${c.sympyStr}"`, async () => {
        const { mgf } = await import("~/engine/workers/pyodide.client");
        vi.mocked(mgf).mockResolvedValue(c.sympyStr);

        const result = await computeMgf(
          { distribution: makeDistInput(c.family, c.parameters) },
          {},
        );
        const payload = result.payload as unknown as ExpressionPayload;

        expect(payload.serialized).toBe(c.sympyStr);
        expect(payload.form).toBe("sympy");
        expect(payload.freeVars).toEqual(["t"]);
      });
    }
  });

  describe("worker called with correct family and parameters for each case", () => {
    for (const c of fixture.cases) {
      test(`${c.family} — correct family + params forwarded to worker`, async () => {
        const { mgf } = await import("~/engine/workers/pyodide.client");
        vi.mocked(mgf).mockResolvedValue(c.sympyStr);

        await computeMgf({ distribution: makeDistInput(c.family, c.parameters) }, {});

        expect(vi.mocked(mgf)).toHaveBeenCalledWith(
          c.family,
          expect.objectContaining(c.parameters),
        );
      });
    }
  });

  test("result type is Expression with freeVars=['t'] for all cases", async () => {
    for (const c of fixture.cases) {
      const { mgf } = await import("~/engine/workers/pyodide.client");
      vi.mocked(mgf).mockResolvedValue(c.sympyStr);
      const result = await computeMgf({ distribution: makeDistInput(c.family, c.parameters) }, {});
      expect(result.type).toEqual({ kind: "Expression", freeVars: ["t"] });
      vi.clearAllMocks();
    }
  });

  test("provenance engine is sympy for all cases", async () => {
    for (const c of fixture.cases) {
      const { mgf } = await import("~/engine/workers/pyodide.client");
      vi.mocked(mgf).mockResolvedValue(c.sympyStr);
      const result = await computeMgf({ distribution: makeDistInput(c.family, c.parameters) }, {});
      expect(result.provenance.engine).toBe("sympy");
      vi.clearAllMocks();
    }
  });
});
