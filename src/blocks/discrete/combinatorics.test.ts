import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import { BinomialBlock } from "./binomial/definition";
import {
  binomial,
  CombinatoricsError,
  FACTORIAL_MAX_N,
  factorial,
  makeScalar,
  multinomial,
} from "./combinatorics";
import { FactorialBlock } from "./factorial/definition";
import { MultinomialBlock } from "./multinomial/definition";

const ctx = { signal: new AbortController().signal };

// ──────────────────────────────────────────────────────────────────────
// factorial
// ──────────────────────────────────────────────────────────────────────

describe("factorial", () => {
  test("0! = 1", () => expect(factorial(0)).toBe(1));
  test("1! = 1", () => expect(factorial(1)).toBe(1));
  test("5! = 120", () => expect(factorial(5)).toBe(120));
  test("10! = 3628800", () => expect(factorial(10)).toBe(3_628_800));
  test("20! exact", () => expect(factorial(20)).toBe(2_432_902_008_176_640_000));

  test("throws on negative", () => {
    expect(() => factorial(-1)).toThrow(CombinatoricsError);
  });
  test("throws on non-integer", () => {
    expect(() => factorial(1.5)).toThrow(CombinatoricsError);
  });
  test(`throws on n > ${String(FACTORIAL_MAX_N)}`, () => {
    expect(() => factorial(FACTORIAL_MAX_N + 1)).toThrow(CombinatoricsError);
  });

  test("property: n! = n * (n-1)! for n in [1..20]", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: FACTORIAL_MAX_N }), (n) => {
        expect(factorial(n)).toBe(n * factorial(n - 1));
      }),
    );
  });
});

// ──────────────────────────────────────────────────────────────────────
// binomial
// ──────────────────────────────────────────────────────────────────────

describe("binomial", () => {
  test("C(5,2) = 10", () => expect(binomial(5, 2)).toBe(10));
  test("C(10,3) = 120", () => expect(binomial(10, 3)).toBe(120));
  test("C(n,0) = 1", () => expect(binomial(7, 0)).toBe(1));
  test("C(n,n) = 1", () => expect(binomial(7, 7)).toBe(1));
  test("C(n,k) = 0 when k > n", () => expect(binomial(3, 5)).toBe(0));
  test("C(0,0) = 1", () => expect(binomial(0, 0)).toBe(1));

  test("throws on negative n", () => {
    expect(() => binomial(-1, 0)).toThrow(CombinatoricsError);
  });
  test("throws on negative k", () => {
    expect(() => binomial(5, -1)).toThrow(CombinatoricsError);
  });

  test("property: Pascal identity C(n,k) = C(n-1,k-1) + C(n-1,k)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 15 }), fc.integer({ min: 1, max: 14 }), (n, k) => {
        fc.pre(k < n);
        expect(binomial(n, k)).toBe(binomial(n - 1, k - 1) + binomial(n - 1, k));
      }),
    );
  });

  test("property: symmetry C(n,k) = C(n,n-k)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 15 }), fc.integer({ min: 0, max: 15 }), (n, k) => {
        fc.pre(k <= n);
        expect(binomial(n, k)).toBe(binomial(n, n - k));
      }),
    );
  });

  test("property: binomial sum = 2^n", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 12 }), (n) => {
        let sum = 0;
        for (let k = 0; k <= n; k++) sum += binomial(n, k);
        expect(sum).toBe(2 ** n);
      }),
    );
  });
});

// ──────────────────────────────────────────────────────────────────────
// multinomial
// ──────────────────────────────────────────────────────────────────────

describe("multinomial", () => {
  test("multinomial([]) = 1", () => expect(multinomial([])).toBe(1));
  test("multinomial([n]) = 1 (only one group)", () => expect(multinomial([5])).toBe(1));
  test("multinomial([2,2]) = C(4,2) = 6", () => {
    expect(multinomial([2, 2])).toBe(6);
  });
  test("multinomial([1,2,3]) = 6!/1!/2!/3! = 60", () => {
    expect(multinomial([1, 2, 3])).toBe(60);
  });
  test("multinomial([0,0,0]) = 1", () => {
    expect(multinomial([0, 0, 0])).toBe(1);
  });

  test("throws on negative count", () => {
    expect(() => multinomial([2, -1])).toThrow(CombinatoricsError);
  });

  test("throws when total > FACTORIAL_MAX_N", () => {
    const counts = Array.from({ length: 3 }, () => FACTORIAL_MAX_N);
    expect(() => multinomial(counts)).toThrow(CombinatoricsError);
  });

  test("property: multinomial([k, n-k]) = C(n,k)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 15 }), fc.integer({ min: 0, max: 15 }), (n, k) => {
        fc.pre(k <= n);
        expect(multinomial([k, n - k])).toBe(binomial(n, k));
      }),
    );
  });
});

// ──────────────────────────────────────────────────────────────────────
// Block smoke tests
// ──────────────────────────────────────────────────────────────────────

describe("FactorialBlock", () => {
  test("id is discrete.factorial", () => expect(FactorialBlock.id).toBe("discrete.factorial"));

  test("5! = 120", () => {
    const result = FactorialBlock.compute({ n: makeScalar(5) }, {}, ctx);
    expect((result as ReturnType<typeof makeScalar>).payload).toBe(120);
  });

  test("0! = 1", () => {
    const result = FactorialBlock.compute({ n: makeScalar(0) }, {}, ctx);
    expect((result as ReturnType<typeof makeScalar>).payload).toBe(1);
  });

  test("throws when n missing", () => {
    expect(() => FactorialBlock.compute({}, {}, ctx)).toThrow(CombinatoricsError);
  });
});

describe("BinomialBlock", () => {
  test("id is discrete.binomial", () => expect(BinomialBlock.id).toBe("discrete.binomial"));

  test("C(5,2) = 10", () => {
    const result = BinomialBlock.compute({ n: makeScalar(5), k: makeScalar(2) }, {}, ctx);
    expect((result as ReturnType<typeof makeScalar>).payload).toBe(10);
  });

  test("C(10,0) = 1", () => {
    const result = BinomialBlock.compute({ n: makeScalar(10), k: makeScalar(0) }, {}, ctx);
    expect((result as ReturnType<typeof makeScalar>).payload).toBe(1);
  });

  test("throws when k missing", () => {
    expect(() => BinomialBlock.compute({ n: makeScalar(5) }, {}, ctx)).toThrow(CombinatoricsError);
  });
});

describe("MultinomialBlock", () => {
  test("id is discrete.multinomial", () =>
    expect(MultinomialBlock.id).toBe("discrete.multinomial"));

  test("M(1,2,3) = 60 (groups=3, k0=1, k1=2, k2=3)", () => {
    const result = MultinomialBlock.compute({}, { groups: 3, k0: 1, k1: 2, k2: 3 }, ctx);
    expect((result as ReturnType<typeof makeScalar>).payload).toBe(60);
  });

  test("M(2,2) = 6 (groups=2, k0=2, k1=2)", () => {
    const result = MultinomialBlock.compute({}, { groups: 2, k0: 2, k1: 2 }, ctx);
    expect((result as ReturnType<typeof makeScalar>).payload).toBe(6);
  });

  test("M(5) = 1 (groups=1, k0=5)", () => {
    const result = MultinomialBlock.compute({}, { groups: 1, k0: 5 }, ctx);
    expect((result as ReturnType<typeof makeScalar>).payload).toBe(1);
  });
});
