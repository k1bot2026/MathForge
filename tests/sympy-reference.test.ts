/**
 * Smoke tests for the SymPy fixture loader (tests/sympy-reference.ts).
 * Catches drift between the generator and loader — e.g., renamed fields,
 * missing fixture files, or structural changes that break cross-engine tests.
 */

import { describe, expect, test } from "vitest";
import {
  loadAddSubTraceFixture,
  loadDetMultiplicativityFixture,
  loadFixtureJson,
  loadInverseFixture,
  loadMatrixFixture,
  loadRrefRankFixture,
  loadTransposeFixture,
  loadVectorFixture,
} from "./sympy-reference";

describe("loadVectorFixture", () => {
  test("returns an object with schemaVersion 1", () => {
    const f = loadVectorFixture();
    expect(f.schemaVersion).toBe(1);
  });

  test("cases array is non-empty", () => {
    const f = loadVectorFixture();
    expect(f.cases.length).toBeGreaterThan(0);
  });

  test("every case has a, b, dot, normASq, normBSq fields of expected types", () => {
    const f = loadVectorFixture();
    for (const c of f.cases) {
      expect(Array.isArray(c.a)).toBe(true);
      expect(Array.isArray(c.b)).toBe(true);
      expect(typeof c.dot).toBe("number");
      expect(typeof c.normASq).toBe("number");
      expect(typeof c.normBSq).toBe("number");
    }
  });

  test("normASq is non-negative for all cases", () => {
    for (const c of loadVectorFixture().cases) {
      expect(c.normASq).toBeGreaterThanOrEqual(0);
      expect(c.normBSq).toBeGreaterThanOrEqual(0);
    }
  });

  test("a and b vectors have equal length within each case", () => {
    for (const c of loadVectorFixture().cases) {
      expect(c.a.length).toBe(c.b.length);
    }
  });

  test("description field is a non-empty string", () => {
    const f = loadVectorFixture();
    expect(typeof f.description).toBe("string");
    expect(f.description.length).toBeGreaterThan(0);
  });
});

describe("loadMatrixFixture", () => {
  test("returns an object with schemaVersion 1", () => {
    const f = loadMatrixFixture();
    expect(f.schemaVersion).toBe(1);
  });

  test("squareCases is non-empty", () => {
    const f = loadMatrixFixture();
    expect(f.squareCases.length).toBeGreaterThan(0);
  });

  test("nonSquareCases is non-empty", () => {
    const f = loadMatrixFixture();
    expect(f.nonSquareCases.length).toBeGreaterThan(0);
  });

  test("every square case has required fields of expected types", () => {
    for (const c of loadMatrixFixture().squareCases) {
      expect(Array.isArray(c.A)).toBe(true);
      expect(Array.isArray(c.B)).toBe(true);
      expect(Array.isArray(c.v)).toBe(true);
      expect(Array.isArray(c.AB)).toBe(true);
      expect(Array.isArray(c.Av)).toBe(true);
      expect(Array.isArray(c.At)).toBe(true);
      expect(typeof c.trA).toBe("number");
      expect(typeof c.detA).toBe("number");
    }
  });

  test("every square case has consistent dimensions (A is n×n, v has length n)", () => {
    for (const c of loadMatrixFixture().squareCases) {
      const n = c.A.length;
      expect(n).toBeGreaterThan(0);
      for (const row of c.A) {
        expect(row.length).toBe(n);
      }
      expect(c.v.length).toBe(n);
      expect(c.AB.length).toBe(n);
      expect(c.Av.length).toBe(n);
      expect(c.At.length).toBe(n);
    }
  });

  test("every non-square case has A·B with correct output dimensions", () => {
    for (const c of loadMatrixFixture().nonSquareCases) {
      const bCols = c.B[0]?.length ?? 0;
      expect(c.AB.length).toBe(c.A.length);
      for (const row of c.AB) {
        expect(row.length).toBe(bCols);
      }
    }
  });
});

describe("loadDetMultiplicativityFixture", () => {
  test("returns an object with schemaVersion 1", () => {
    const f = loadDetMultiplicativityFixture();
    expect(f.schemaVersion).toBe(1);
  });

  test("cases array is non-empty", () => {
    const f = loadDetMultiplicativityFixture();
    expect(f.cases.length).toBeGreaterThan(0);
  });

  test("every case has required fields of expected types", () => {
    for (const c of loadDetMultiplicativityFixture().cases) {
      expect(Array.isArray(c.A)).toBe(true);
      expect(Array.isArray(c.B)).toBe(true);
      expect(typeof c.detA).toBe("number");
      expect(typeof c.detB).toBe("number");
      expect(Array.isArray(c.AB)).toBe(true);
      expect(typeof c.detAB).toBe("number");
    }
  });

  test("multiplicativity holds: detAB = detA * detB for all cases", () => {
    for (const c of loadDetMultiplicativityFixture().cases) {
      expect(c.detAB).toBe(c.detA * c.detB);
    }
  });

  test("A and B are square with matching dimensions in all cases", () => {
    for (const c of loadDetMultiplicativityFixture().cases) {
      const n = c.A.length;
      expect(c.B.length).toBe(n);
      expect(c.AB.length).toBe(n);
      for (const row of c.A) {
        expect(row.length).toBe(n);
      }
    }
  });
});

describe("loadFixtureJson error handling", () => {
  test("throws a descriptive error mentioning the fixture name and pnpm generate:fixtures", () => {
    expect(() => loadFixtureJson("nonexistent-fixture")).toThrow(
      /nonexistent-fixture.*pnpm generate:fixtures/s,
    );
  });

  test("throws an Error (not ENOENT or opaque system error) for missing fixtures", () => {
    expect(() => loadFixtureJson("does-not-exist")).toThrow(Error);
  });
});

describe("loadTransposeFixture", () => {
  test("returns an object with schemaVersion 1", () => {
    expect(loadTransposeFixture().schemaVersion).toBe(1);
  });

  test("cases array is non-empty", () => {
    expect(loadTransposeFixture().cases.length).toBeGreaterThan(0);
  });

  test("every case has A and At arrays of correct transposed dimensions", () => {
    for (const c of loadTransposeFixture().cases) {
      expect(Array.isArray(c.A)).toBe(true);
      expect(Array.isArray(c.At)).toBe(true);
      const m = c.A.length;
      const n = c.A[0]?.length ?? 0;
      expect(c.At.length).toBe(n);
      expect(c.At[0]?.length ?? 0).toBe(m);
    }
  });
});

describe("loadAddSubTraceFixture", () => {
  test("returns an object with schemaVersion 1", () => {
    expect(loadAddSubTraceFixture().schemaVersion).toBe(1);
  });

  test("cases array is non-empty", () => {
    expect(loadAddSubTraceFixture().cases.length).toBeGreaterThan(0);
  });

  test("every case has A, B, ApB, AmB arrays of matching dimensions", () => {
    for (const c of loadAddSubTraceFixture().cases) {
      expect(Array.isArray(c.A)).toBe(true);
      expect(Array.isArray(c.B)).toBe(true);
      expect(Array.isArray(c.ApB)).toBe(true);
      expect(Array.isArray(c.AmB)).toBe(true);
      const m = c.A.length;
      const n = c.A[0]?.length ?? 0;
      expect(c.B.length).toBe(m);
      expect(c.ApB.length).toBe(m);
      expect(c.AmB.length).toBe(m);
      expect(c.B[0]?.length ?? 0).toBe(n);
      expect(c.ApB[0]?.length ?? 0).toBe(n);
      expect(c.AmB[0]?.length ?? 0).toBe(n);
    }
  });

  test("square cases have trA, trB, trApB numeric fields", () => {
    const squareCases = loadAddSubTraceFixture().cases.filter((c) => c.trA !== undefined);
    expect(squareCases.length).toBeGreaterThan(0);
    for (const c of squareCases) {
      expect(typeof c.trA).toBe("number");
      expect(typeof c.trB).toBe("number");
      expect(typeof c.trApB).toBe("number");
    }
  });

  test("non-square cases have no trace fields", () => {
    for (const c of loadAddSubTraceFixture().cases) {
      const m = c.A.length;
      const n = c.A[0]?.length ?? 0;
      if (m !== n) {
        expect(c.trA).toBeUndefined();
      }
    }
  });
});

describe("fixture file integrity", () => {
  test("all seven fixture files exist and contain valid JSON (loader returns objects)", () => {
    // If any file is missing or corrupt, these calls will throw.
    const v = loadVectorFixture();
    const m = loadMatrixFixture();
    const d = loadDetMultiplicativityFixture();
    const t = loadTransposeFixture();
    const ast = loadAddSubTraceFixture();
    const inv = loadInverseFixture();
    const rr = loadRrefRankFixture();
    expect(typeof v).toBe("object");
    expect(typeof m).toBe("object");
    expect(typeof d).toBe("object");
    expect(typeof t).toBe("object");
    expect(typeof ast).toBe("object");
    expect(typeof inv).toBe("object");
    expect(typeof rr).toBe("object");
  });

  test("fixture generated timestamps are valid ISO-8601 strings", () => {
    const fixtures = [
      loadVectorFixture(),
      loadMatrixFixture(),
      loadDetMultiplicativityFixture(),
      loadTransposeFixture(),
      loadAddSubTraceFixture(),
      loadInverseFixture(),
      loadRrefRankFixture(),
    ];
    for (const f of fixtures) {
      expect(Number.isNaN(new Date(f.generated).getTime())).toBe(false);
    }
  });
});

describe("loadInverseFixture", () => {
  test("returns an object with schemaVersion 1", () => {
    expect(loadInverseFixture().schemaVersion).toBe(1);
  });

  test("cases array is non-empty", () => {
    expect(loadInverseFixture().cases.length).toBeGreaterThan(0);
  });

  test("every case has A (square), Ainv (same size), detA (non-zero)", () => {
    for (const c of loadInverseFixture().cases) {
      const n = c.A.length;
      expect(n).toBeGreaterThan(0);
      expect(c.Ainv.length).toBe(n);
      for (const row of c.A) expect(row.length).toBe(n);
      for (const row of c.Ainv) expect(row.length).toBe(n);
      expect(c.detA).not.toBe(0);
    }
  });
});

describe("loadRrefRankFixture", () => {
  test("returns an object with schemaVersion 1", () => {
    expect(loadRrefRankFixture().schemaVersion).toBe(1);
  });

  test("cases array is non-empty", () => {
    expect(loadRrefRankFixture().cases.length).toBeGreaterThan(0);
  });

  test("every case has A, rref (same dimensions), rank, pivots", () => {
    for (const c of loadRrefRankFixture().cases) {
      const m = c.A.length;
      const n = c.A[0]?.length ?? 0;
      expect(c.rref.length).toBe(m);
      expect(c.rref[0]?.length ?? 0).toBe(n);
      expect(typeof c.rank).toBe("number");
      expect(c.rank).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(c.pivots)).toBe(true);
      expect(c.pivots.length).toBe(c.rank);
    }
  });
});
