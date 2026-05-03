import { afterEach, describe, expect, test, vi } from "vitest";
import type { ExpressionPayload, MathValue } from "~/math/types";
import type { DistributionPayload } from "../distribution-payload";
import { computeMgf, MgfError } from "./compute";

// The pyodide worker is unavailable in jsdom — mock the client module.
vi.mock("~/engine/workers/pyodide.client", () => ({
  mgf: vi.fn(),
}));

async function mockMgf(impl: (family: string, params: Record<string, number>) => string) {
  const { mgf } = await import("~/engine/workers/pyodide.client");
  vi.mocked(mgf).mockImplementation((_f, _p) => Promise.resolve(impl(_f, _p)));
}

afterEach(() => {
  vi.clearAllMocks();
});

function normalInput(mu = 0, sigma = 1): MathValue {
  const payload: DistributionPayload = {
    parameters: { family: "Normal", mu, sigma },
    moments: { mean: mu, variance: sigma ** 2 },
    support: { kind: "continuous", lo: -Infinity, hi: Infinity },
  };
  return {
    type: { kind: "Distribution", family: "Normal" },
    payload: payload as unknown as number,
    provenance: { blockId: "stats.normal", inputs: [], computedAt: 0, engine: "native" },
  };
}

function bernoulliInput(p = 0.5): MathValue {
  const payload: DistributionPayload = {
    parameters: { family: "Bernoulli", p },
    moments: { mean: p, variance: p * (1 - p) },
    support: { kind: "discrete", values: [0, 1] },
  };
  return {
    type: { kind: "Distribution", family: "Bernoulli" },
    payload: payload as unknown as number,
    provenance: { blockId: "stats.bernoulli", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("stats.mgf compute", () => {
  test("returns Expression(freeVars=['t']) type", async () => {
    await mockMgf(() => "exp(t**2/2)");
    const result = await computeMgf({ distribution: normalInput() }, {});
    expect(result.type).toEqual({ kind: "Expression", freeVars: ["t"] });
  });

  test("payload has form=sympy and serialized string returned by worker", async () => {
    const expectedExpr = "exp(mu*t + sigma**2*t**2/2)";
    await mockMgf(() => expectedExpr);
    const result = await computeMgf({ distribution: normalInput(2, 3) }, {});
    const payload = result.payload as unknown as ExpressionPayload;
    expect(payload.form).toBe("sympy");
    expect(payload.serialized).toBe(expectedExpr);
    expect(payload.freeVars).toEqual(["t"]);
  });

  test("provenance engine is sympy", async () => {
    await mockMgf(() => "exp(t**2/2)");
    const result = await computeMgf({ distribution: normalInput() }, {});
    expect(result.provenance.engine).toBe("sympy");
    expect(result.provenance.blockId).toBe("stats.mgf");
  });

  test("passes correct family and parameters to worker", async () => {
    const { mgf } = await import("~/engine/workers/pyodide.client");
    vi.mocked(mgf).mockResolvedValue("exp(t**2/2)");
    await computeMgf({ distribution: normalInput(1, 2) }, {});
    expect(vi.mocked(mgf)).toHaveBeenCalledWith(
      "Normal",
      expect.objectContaining({ mu: 1, sigma: 2 }),
    );
  });

  test("passes Bernoulli family and p parameter to worker", async () => {
    const { mgf } = await import("~/engine/workers/pyodide.client");
    vi.mocked(mgf).mockResolvedValue("1 - p + p*exp(t)");
    await computeMgf({ distribution: bernoulliInput(0.3) }, {});
    expect(vi.mocked(mgf)).toHaveBeenCalledWith("Bernoulli", expect.objectContaining({ p: 0.3 }));
  });

  test("throws MgfError when distribution input is missing", async () => {
    await expect(computeMgf({}, {})).rejects.toThrow(MgfError);
    await expect(computeMgf({}, {})).rejects.toThrow("requires a distribution input");
  });

  test("throws MgfError when worker throws", async () => {
    const { mgf } = await import("~/engine/workers/pyodide.client");
    vi.mocked(mgf).mockRejectedValue(new Error("SymPy internal error"));
    await expect(computeMgf({ distribution: normalInput() }, {})).rejects.toThrow(MgfError);
    await expect(computeMgf({ distribution: normalInput() }, {})).rejects.toThrow(
      /SymPy MGF computation failed/,
    );
  });

  test("throws MgfError for non-Distribution input", async () => {
    const scalarInput: MathValue = {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: 42,
      provenance: { blockId: "some.block", inputs: [], computedAt: 0, engine: "native" },
    };
    await expect(computeMgf({ distribution: scalarInput }, {})).rejects.toThrow(MgfError);
  });
});

describe("stats.mgf definition explain", () => {
  test("effect returns placeholder when no distribution connected", async () => {
    const { MgfBlock } = await import("./definition");
    const effect = MgfBlock.explain.effect;
    if (effect === undefined) throw new Error("effect is undefined");
    const placeholder = effect(
      {},
      {
        type: { kind: "Expression", freeVars: ["t"] },
        payload: {} as unknown as number,
        provenance: { blockId: "stats.mgf", inputs: [], computedAt: 0, engine: "sympy" },
      },
    );
    expect(placeholder).toMatch(/Connect a distribution/);
  });
});
