import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { VectorPayload } from "~/math/types";
import { FibonacciBlock, FibonacciError, fibSequence } from "./fibonacci/definition";
import { PartialSumBlock, PartialSumError } from "./partial-sum/definition";
import { linearRecurrence, RecurrenceBlock, RecurrenceError } from "./recurrence/definition";

const ctx = { signal: new AbortController().signal };

function makeVector(values: ReadonlyArray<number>) {
  return {
    type: { kind: "Vector" as const, n: values.length, field: "integer" as const },
    payload: values as number[],
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" as const },
  };
}

function getPayload(result: unknown): ReadonlyArray<number> {
  return (result as { payload: VectorPayload }).payload as ReadonlyArray<number>;
}

// ──────────────────────────────────────────────────────────────────────
// fibSequence
// ──────────────────────────────────────────────────────────────────────

describe("fibSequence", () => {
  test("fibSequence(0) = []", () => expect(fibSequence(0)).toEqual([]));
  test("fibSequence(1) = [0]", () => expect(fibSequence(1)).toEqual([0]));
  test("fibSequence(2) = [0,1]", () => expect(fibSequence(2)).toEqual([0, 1]));
  test("fibSequence(8) = [0,1,1,2,3,5,8,13]", () => {
    expect(fibSequence(8)).toEqual([0, 1, 1, 2, 3, 5, 8, 13]);
  });
  test("throws on negative n", () => {
    expect(() => fibSequence(-1)).toThrow(FibonacciError);
  });
  test("throws on n > 78", () => {
    expect(() => fibSequence(79)).toThrow(FibonacciError);
  });

  test("property: F(n) = F(n-1) + F(n-2) for n >= 2", () => {
    fc.assert(
      fc.property(fc.integer({ min: 3, max: 20 }), (n) => {
        const seq = fibSequence(n);
        for (let i = 2; i < seq.length; i++) {
          expect(seq[i]).toBe((seq[i - 1] ?? 0) + (seq[i - 2] ?? 0));
        }
      }),
    );
  });

  test("property: all fibonacci terms are non-negative", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 20 }), (n) => {
        for (const v of fibSequence(n)) {
          expect(v).toBeGreaterThanOrEqual(0);
        }
      }),
    );
  });
});

// ──────────────────────────────────────────────────────────────────────
// linearRecurrence
// ──────────────────────────────────────────────────────────────────────

describe("linearRecurrence", () => {
  test("Fibonacci: c1=1,c2=1,d=0,a0=0,a1=1", () => {
    expect(linearRecurrence(0, 1, 1, 1, 0, 8)).toEqual([0, 1, 1, 2, 3, 5, 8, 13]);
  });

  test("Arithmetic: c1=1,c2=0,d=3,a0=1 gives 1,4,7,10,…", () => {
    expect(linearRecurrence(1, 4, 1, 0, 3, 5)).toEqual([1, 4, 7, 10, 13]);
  });

  test("Geometric: c1=2,c2=0,d=0,a0=1 gives powers of 2", () => {
    expect(linearRecurrence(1, 2, 2, 0, 0, 5)).toEqual([1, 2, 4, 8, 16]);
  });

  test("empty sequence when terms=0", () => {
    expect(linearRecurrence(0, 1, 1, 1, 0, 0)).toEqual([]);
  });

  test("throws on divergence", () => {
    expect(() => linearRecurrence(Infinity, 0, 1, 0, 0, 2)).toThrow(RecurrenceError);
  });

  test("property: c2=0 first-order: a(n) = c1*a(n-1) + d", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(-5), max: Math.fround(5), noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: Math.fround(0.1), max: Math.fround(2), noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: Math.fround(-5), max: Math.fround(5), noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 2, max: 10 }),
        (a0, c1, d, terms) => {
          const seq = linearRecurrence(a0, a0 * c1 + d, c1, 0, d, terms);
          for (let i = 1; i < seq.length; i++) {
            const expected = c1 * (seq[i - 1] ?? 0) + d;
            expect(Math.abs((seq[i] ?? 0) - expected)).toBeLessThan(1e-9);
          }
        },
      ),
    );
  });
});

// ──────────────────────────────────────────────────────────────────────
// FibonacciBlock
// ──────────────────────────────────────────────────────────────────────

describe("FibonacciBlock", () => {
  test("id is discrete.fibonacci", () => expect(FibonacciBlock.id).toBe("discrete.fibonacci"));

  test("default 10 terms", () => {
    const result = FibonacciBlock.compute({}, { n: 10 }, ctx);
    expect(getPayload(result)).toEqual([0, 1, 1, 2, 3, 5, 8, 13, 21, 34]);
  });

  test("0 terms returns empty vector", () => {
    const result = FibonacciBlock.compute({}, { n: 0 }, ctx);
    expect(getPayload(result)).toHaveLength(0);
  });

  test("output type is Vector", () => {
    const result = FibonacciBlock.compute({}, { n: 5 }, ctx);
    expect((result as ReturnType<typeof makeVector>).type.kind).toBe("Vector");
  });
});

// ──────────────────────────────────────────────────────────────────────
// PartialSumBlock
// ──────────────────────────────────────────────────────────────────────

describe("PartialSumBlock", () => {
  test("id is discrete.partial-sum", () => expect(PartialSumBlock.id).toBe("discrete.partial-sum"));

  test("partial sums of [1,2,3,4] = [1,3,6,10]", () => {
    const result = PartialSumBlock.compute({ seq: makeVector([1, 2, 3, 4]) }, {}, ctx);
    expect(getPayload(result)).toEqual([1, 3, 6, 10]);
  });

  test("empty input returns empty output", () => {
    const result = PartialSumBlock.compute({ seq: makeVector([]) }, {}, ctx);
    expect(getPayload(result)).toHaveLength(0);
  });

  test("throws when seq missing", () => {
    expect(() => PartialSumBlock.compute({}, {}, ctx)).toThrow(PartialSumError);
  });

  test("property: last partial sum equals sum of all inputs", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 1, maxLength: 20 }),
        (vals) => {
          const result = PartialSumBlock.compute({ seq: makeVector(vals) }, {}, ctx);
          const partials = getPayload(result);
          const total = vals.reduce((a, b) => a + b, 0);
          expect(partials[partials.length - 1]).toBe(total);
        },
      ),
    );
  });

  test("property: partial sums are non-decreasing for non-negative inputs", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 20 }),
        (vals) => {
          const result = PartialSumBlock.compute({ seq: makeVector(vals) }, {}, ctx);
          const partials = getPayload(result);
          for (let i = 1; i < partials.length; i++) {
            expect(partials[i] ?? 0).toBeGreaterThanOrEqual(partials[i - 1] ?? 0);
          }
        },
      ),
    );
  });
});

// ──────────────────────────────────────────────────────────────────────
// RecurrenceBlock
// ──────────────────────────────────────────────────────────────────────

describe("RecurrenceBlock", () => {
  test("id is discrete.recurrence", () => expect(RecurrenceBlock.id).toBe("discrete.recurrence"));

  test("Fibonacci config reproduces fibonacci sequence", () => {
    const result = RecurrenceBlock.compute({}, { terms: 8, a0: 0, a1: 1, c1: 1, c2: 1, d: 0 }, ctx);
    expect(getPayload(result)).toEqual([0, 1, 1, 2, 3, 5, 8, 13]);
  });

  test("arithmetic sequence via c1=1,c2=0,d=3", () => {
    const result = RecurrenceBlock.compute({}, { terms: 5, a0: 1, a1: 4, c1: 1, c2: 0, d: 3 }, ctx);
    expect(getPayload(result)).toEqual([1, 4, 7, 10, 13]);
  });

  test("0 terms returns empty vector", () => {
    const result = RecurrenceBlock.compute({}, { terms: 0 }, ctx);
    expect(getPayload(result)).toHaveLength(0);
  });

  test("output type is Vector", () => {
    const result = RecurrenceBlock.compute({}, { terms: 3, a0: 1, a1: 1, c1: 1, c2: 0, d: 0 }, ctx);
    expect((result as ReturnType<typeof makeVector>).type.kind).toBe("Vector");
  });
});
