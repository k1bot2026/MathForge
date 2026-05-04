import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { SetPayload } from "~/math/types";
import {
  loadFactorintFixture,
  loadGcdFixture,
  loadModularFixture,
  loadPrimeFixture,
  loadTotientFixture,
} from "../../../tests/sympy-reference";
import { makeScalar } from "./combinatorics";
import { DivisorsBlock } from "./divisors/definition";
import { FactorBlock } from "./factor/definition";
import { GcdBlock } from "./gcd/definition";
import { IsPrimeBlock } from "./is-prime/definition";
import { LcmBlock } from "./lcm/definition";
import { ModpowBlock } from "./modpow/definition";
import { ModularInverseBlock } from "./modular-inverse/definition";
import {
  divisors,
  factor,
  gcd,
  isPrime,
  lcm,
  type makeBooleanScalar,
  modpow,
  modularInverse,
  NumberTheoryError,
  primeFactorize,
  totient,
} from "./number-theory";
import { PrimeFactorizeBlock } from "./prime-factorize/definition";
import { TotientBlock } from "./totient/definition";

const ctx = { signal: new AbortController().signal };

function getSetIntegers(v: ReturnType<typeof makeScalar>): ReadonlyArray<number> {
  return (v.payload as SetPayload).map((mv) => mv.payload as number);
}

// ──────────────────────────────────────────────────────────────────────
// gcd
// ──────────────────────────────────────────────────────────────────────

describe("gcd", () => {
  test("gcd(12, 8) = 4", () => expect(gcd(12, 8)).toBe(4));
  test("gcd(7, 13) = 1 (coprime primes)", () => expect(gcd(7, 13)).toBe(1));
  test("gcd(100, 75) = 25", () => expect(gcd(100, 75)).toBe(25));
  test("gcd(a, a) = a", () => expect(gcd(17, 17)).toBe(17));
  test("throws on zero", () => expect(() => gcd(0, 5)).toThrow(NumberTheoryError));

  test("property: gcd(a,b) * lcm(a,b) = a*b", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 500 }), fc.integer({ min: 1, max: 500 }), (a, b) => {
        expect(gcd(a, b) * lcm(a, b)).toBe(a * b);
      }),
    );
  });

  test("property: commutativity gcd(a,b) = gcd(b,a)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000 }), fc.integer({ min: 1, max: 1000 }), (a, b) => {
        expect(gcd(a, b)).toBe(gcd(b, a));
      }),
    );
  });

  test("property: gcd divides both a and b", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 500 }), fc.integer({ min: 1, max: 500 }), (a, b) => {
        const d = gcd(a, b);
        expect(a % d).toBe(0);
        expect(b % d).toBe(0);
      }),
    );
  });
});

// ──────────────────────────────────────────────────────────────────────
// lcm
// ──────────────────────────────────────────────────────────────────────

describe("lcm", () => {
  test("lcm(4, 6) = 12", () => expect(lcm(4, 6)).toBe(12));
  test("lcm(7, 13) = 91", () => expect(lcm(7, 13)).toBe(91));
  test("lcm(a, a) = a", () => expect(lcm(5, 5)).toBe(5));
  test("throws on zero", () => expect(() => lcm(0, 5)).toThrow(NumberTheoryError));

  test("property: lcm(a,b) divisible by both a and b", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 200 }), fc.integer({ min: 1, max: 200 }), (a, b) => {
        const l = lcm(a, b);
        expect(l % a).toBe(0);
        expect(l % b).toBe(0);
      }),
    );
  });
});

// ──────────────────────────────────────────────────────────────────────
// modpow
// ──────────────────────────────────────────────────────────────────────

describe("modpow", () => {
  test("2^10 mod 1000 = 24", () => expect(modpow(2, 10, 1000)).toBe(24));
  test("3^0 mod 7 = 1", () => expect(modpow(3, 0, 7)).toBe(1));
  test("0^5 mod 7 = 0", () => expect(modpow(0, 5, 7)).toBe(0));
  test("any mod 1 = 0", () => expect(modpow(123, 456, 1)).toBe(0));
  test("2^100 mod 13 = 3", () => expect(modpow(2, 100, 13)).toBe(3));
  test("throws on negative base", () => expect(() => modpow(-1, 2, 7)).toThrow(NumberTheoryError));

  test("property: (a^e mod m) < m", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 1, max: 97 }),
        (base, exp, m) => {
          expect(modpow(base, exp, m)).toBeLessThan(m);
        },
      ),
    );
  });

  test("property: Fermat's little theorem — modpow(g, totient(p), p) = 1 for prime p, gcd(g,p)=1", () => {
    const PRIMES = [5, 7, 11, 13, 17, 19, 23, 29, 31, 37];
    fc.assert(
      fc.property(fc.constantFrom(...PRIMES), fc.integer({ min: 1, max: 200 }), (p, g) => {
        fc.pre(gcd(g, p) === 1);
        expect(modpow(g, totient(p), p)).toBe(1);
      }),
    );
  });
});

// ──────────────────────────────────────────────────────────────────────
// isPrime
// ──────────────────────────────────────────────────────────────────────

describe("isPrime", () => {
  test("0 is not prime", () => expect(isPrime(0)).toBe(false));
  test("1 is not prime", () => expect(isPrime(1)).toBe(false));
  test("2 is prime", () => expect(isPrime(2)).toBe(true));
  test("3 is prime", () => expect(isPrime(3)).toBe(true));
  test("4 is not prime", () => expect(isPrime(4)).toBe(false));
  test("17 is prime", () => expect(isPrime(17)).toBe(true));
  test("97 is prime", () => expect(isPrime(97)).toBe(true));
  test("100 is not prime", () => expect(isPrime(100)).toBe(false));
  test("7919 is prime", () => expect(isPrime(7919)).toBe(true));
  test("throws on negative", () => expect(() => isPrime(-1)).toThrow(NumberTheoryError));

  test("property: prime * prime > 1 is composite", () => {
    const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23];
    fc.assert(
      fc.property(fc.constantFrom(...primes), fc.constantFrom(...primes), (p, q) => {
        fc.pre(p !== q);
        expect(isPrime(p * q)).toBe(false);
      }),
    );
  });
});

// ──────────────────────────────────────────────────────────────────────
// primeFactorize
// ──────────────────────────────────────────────────────────────────────

describe("primeFactorize", () => {
  test("primeFactorize(1) = []", () => expect(primeFactorize(1)).toEqual([]));
  test("primeFactorize(2) = [2]", () => expect(primeFactorize(2)).toEqual([2]));
  test("primeFactorize(12) = [2,2,3]", () => expect(primeFactorize(12)).toEqual([2, 2, 3]));
  test("primeFactorize(30) = [2,3,5]", () => expect(primeFactorize(30)).toEqual([2, 3, 5]));
  test("primeFactorize(prime) = [prime]", () => expect(primeFactorize(97)).toEqual([97]));
  test("throws on zero", () => expect(() => primeFactorize(0)).toThrow(NumberTheoryError));

  test("property: product of factors = n", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000 }), (n) => {
        const product = primeFactorize(n).reduce((a, b) => a * b, 1);
        expect(product).toBe(n);
      }),
    );
  });

  test("property: all factors are prime", () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 1000 }), (n) => {
        for (const p of primeFactorize(n)) {
          expect(isPrime(p)).toBe(true);
        }
      }),
    );
  });
});

// ──────────────────────────────────────────────────────────────────────
// factor
// ──────────────────────────────────────────────────────────────────────

describe("factor", () => {
  test("factor(12) = [2, 3]", () => expect(factor(12)).toEqual([2, 3]));
  test("factor(prime) = [prime]", () => expect(factor(7)).toEqual([7]));
  test("factor(1) = []", () => expect(factor(1)).toEqual([]));

  test("property: factor returns distinct values", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000 }), (n) => {
        const f = factor(n);
        expect(new Set(f).size).toBe(f.length);
      }),
    );
  });
});

// ──────────────────────────────────────────────────────────────────────
// totient
// ──────────────────────────────────────────────────────────────────────

describe("totient", () => {
  test("φ(1) = 1", () => expect(totient(1)).toBe(1));
  test("φ(2) = 1", () => expect(totient(2)).toBe(1));
  test("φ(prime p) = p-1", () => expect(totient(7)).toBe(6));
  test("φ(12) = 4", () => expect(totient(12)).toBe(4));
  test("φ(100) = 40", () => expect(totient(100)).toBe(40));
  test("throws on zero", () => expect(() => totient(0)).toThrow(NumberTheoryError));

  test("property: multiplicativity for coprime inputs", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), fc.integer({ min: 1, max: 100 }), (a, b) => {
        fc.pre(gcd(a, b) === 1);
        expect(totient(a * b)).toBe(totient(a) * totient(b));
      }),
    );
  });
});

// ──────────────────────────────────────────────────────────────────────
// divisors
// ──────────────────────────────────────────────────────────────────────

describe("divisors", () => {
  test("divisors(1) = [1]", () => expect(divisors(1)).toEqual([1]));
  test("divisors(6) = [1,2,3,6]", () => expect(divisors(6)).toEqual([1, 2, 3, 6]));
  test("divisors(prime) = [1, prime]", () => expect(divisors(7)).toEqual([1, 7]));
  test("throws on zero", () => expect(() => divisors(0)).toThrow(NumberTheoryError));

  test("property: 1 and n are always divisors", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 500 }), (n) => {
        const d = divisors(n);
        expect(d[0]).toBe(1);
        expect(d[d.length - 1]).toBe(n);
      }),
    );
  });

  test("property: all divisors divide n", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 500 }), (n) => {
        for (const d of divisors(n)) {
          expect(n % d).toBe(0);
        }
      }),
    );
  });
});

// ──────────────────────────────────────────────────────────────────────
// modularInverse
// ──────────────────────────────────────────────────────────────────────

describe("modularInverse", () => {
  test("3⁻¹ mod 7 = 5", () => expect(modularInverse(3, 7)).toBe(5));
  test("2⁻¹ mod 5 = 3", () => expect(modularInverse(2, 5)).toBe(3));
  test("1⁻¹ mod m = 1", () => expect(modularInverse(1, 11)).toBe(1));
  test("throws when gcd != 1", () => expect(() => modularInverse(2, 4)).toThrow(NumberTheoryError));
  test("throws on negative", () => expect(() => modularInverse(-1, 7)).toThrow(NumberTheoryError));

  test("property: a * inverse(a, m) ≡ 1 mod m", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), fc.integer({ min: 2, max: 97 }), (a, m) => {
        fc.pre(gcd(a, m) === 1);
        const inv = modularInverse(a, m);
        expect((a * inv) % m).toBe(1);
      }),
    );
  });
});

// ──────────────────────────────────────────────────────────────────────
// Block smoke tests
// ──────────────────────────────────────────────────────────────────────

describe("GcdBlock", () => {
  test("id is discrete.gcd", () => expect(GcdBlock.id).toBe("discrete.gcd"));
  test("gcd(12,8) = 4", () => {
    const r = GcdBlock.compute({ a: makeScalar(12), b: makeScalar(8) }, {}, ctx);
    expect((r as ReturnType<typeof makeScalar>).payload).toBe(4);
  });
  test("throws when a missing", () => {
    expect(() => GcdBlock.compute({ b: makeScalar(8) }, {}, ctx)).toThrow(NumberTheoryError);
  });
  test("explain.effect shows result", () => {
    const out = makeScalar(4);
    expect(GcdBlock.explain.effect?.({}, out)).toBe("gcd = 4");
  });
});

describe("LcmBlock", () => {
  test("id is discrete.lcm", () => expect(LcmBlock.id).toBe("discrete.lcm"));
  test("lcm(4,6) = 12", () => {
    const r = LcmBlock.compute({ a: makeScalar(4), b: makeScalar(6) }, {}, ctx);
    expect((r as ReturnType<typeof makeScalar>).payload).toBe(12);
  });
  test("throws when b missing", () => {
    expect(() => LcmBlock.compute({ a: makeScalar(4) }, {}, ctx)).toThrow(NumberTheoryError);
  });
  test("explain.effect shows result", () => {
    const out = makeScalar(12);
    expect(LcmBlock.explain.effect?.({}, out)).toBe("lcm = 12");
  });
});

describe("ModpowBlock", () => {
  test("id is discrete.modpow", () => expect(ModpowBlock.id).toBe("discrete.modpow"));
  test("2^10 mod 1000 = 24", () => {
    const r = ModpowBlock.compute(
      { base: makeScalar(2), exp: makeScalar(10), m: makeScalar(1000) },
      {},
      ctx,
    );
    expect((r as ReturnType<typeof makeScalar>).payload).toBe(24);
  });
});

describe("IsPrimeBlock", () => {
  test("id is discrete.is-prime", () => expect(IsPrimeBlock.id).toBe("discrete.is-prime"));
  test("17 is prime", () => {
    const r = IsPrimeBlock.compute({ n: makeScalar(17) }, {}, ctx);
    expect((r as ReturnType<typeof makeBooleanScalar>).payload).toBe(true);
  });
  test("4 is not prime", () => {
    const r = IsPrimeBlock.compute({ n: makeScalar(4) }, {}, ctx);
    expect((r as ReturnType<typeof makeBooleanScalar>).payload).toBe(false);
  });
  test("throws when n missing", () => {
    expect(() => IsPrimeBlock.compute({}, {}, ctx)).toThrow(NumberTheoryError);
  });
  test("explain.effect: prime case", () => {
    const out = {
      type: { kind: "Scalar", field: "boolean", precision: "exact" },
      payload: true,
      provenance: { blockId: "t", inputs: [], computedAt: 0, engine: "native" as const },
    };
    expect(IsPrimeBlock.explain.effect?.({}, out)).toBe("n is prime.");
  });
  test("explain.effect: composite case", () => {
    const out = {
      type: { kind: "Scalar", field: "boolean", precision: "exact" },
      payload: false,
      provenance: { blockId: "t", inputs: [], computedAt: 0, engine: "native" as const },
    };
    expect(IsPrimeBlock.explain.effect?.({}, out)).toBe("n is not prime.");
  });
});

describe("FactorBlock", () => {
  test("id is discrete.factor", () => expect(FactorBlock.id).toBe("discrete.factor"));
  test("factor(12) = {2,3}", () => {
    const r = FactorBlock.compute({ n: makeScalar(12) }, {}, ctx);
    expect(getSetIntegers(r as ReturnType<typeof makeScalar>)).toEqual([2, 3]);
  });
});

describe("TotientBlock", () => {
  test("id is discrete.totient", () => expect(TotientBlock.id).toBe("discrete.totient"));
  test("φ(12) = 4", () => {
    const r = TotientBlock.compute({ n: makeScalar(12) }, {}, ctx);
    expect((r as ReturnType<typeof makeScalar>).payload).toBe(4);
  });
});

describe("DivisorsBlock", () => {
  test("id is discrete.divisors", () => expect(DivisorsBlock.id).toBe("discrete.divisors"));
  test("divisors(6) = {1,2,3,6}", () => {
    const r = DivisorsBlock.compute({ n: makeScalar(6) }, {}, ctx);
    expect(getSetIntegers(r as ReturnType<typeof makeScalar>)).toEqual([1, 2, 3, 6]);
  });
});

describe("PrimeFactorizeBlock", () => {
  test("id is discrete.prime-factorize", () =>
    expect(PrimeFactorizeBlock.id).toBe("discrete.prime-factorize"));
  test("primeFactorize(12) = {2,2,3}", () => {
    const r = PrimeFactorizeBlock.compute({ n: makeScalar(12) }, {}, ctx);
    expect(getSetIntegers(r as ReturnType<typeof makeScalar>)).toEqual([2, 2, 3]);
  });
});

describe("ModularInverseBlock", () => {
  test("id is discrete.modular-inverse", () =>
    expect(ModularInverseBlock.id).toBe("discrete.modular-inverse"));
  test("3⁻¹ mod 7 = 5", () => {
    const r = ModularInverseBlock.compute({ a: makeScalar(3), m: makeScalar(7) }, {}, ctx);
    expect((r as ReturnType<typeof makeScalar>).payload).toBe(5);
  });
});

// ──────────────────────────────────────────────────────────────────────
// SymPy cross-engine verification
// ──────────────────────────────────────────────────────────────────────

describe("gcd — SymPy cross-engine (positive inputs only)", () => {
  const fixture = loadGcdFixture();
  // gcd(a,b) is restricted to positive integers in this implementation.
  // SymPy fixture also contains zero-input cases; skip those here.
  for (const { a, b, gcd: expected } of fixture.cases) {
    if (a === 0 || b === 0) continue;
    test(`gcd(${String(a)}, ${String(b)}) = ${String(expected)}`, () => {
      expect(gcd(a, b)).toBe(expected);
    });
  }
});

describe("isPrime — SymPy cross-engine", () => {
  const fixture = loadPrimeFixture();
  for (const { n, isPrime: expected } of fixture.cases) {
    test(`isPrime(${String(n)}) = ${String(expected)}`, () => {
      expect(isPrime(n)).toBe(expected);
    });
  }
});

describe("primeFactorize — SymPy cross-engine (flat factors from factorint)", () => {
  const fixture = loadFactorintFixture();
  for (const { n, factors } of fixture.cases) {
    // Fixture stores [prime, exponent] pairs; expand to flat sorted list.
    const expected: number[] = [];
    for (const [p, e] of factors) {
      for (let i = 0; i < e; i++) expected.push(p);
    }
    expected.sort((a, b) => a - b);

    test(`primeFactorize(${String(n)}) matches SymPy factorint`, () => {
      const result = [...primeFactorize(n)].sort((a, b) => a - b);
      expect(result).toEqual(expected);
    });
  }
});

describe("totient — SymPy cross-engine", () => {
  const fixture = loadTotientFixture();
  for (const { n, totient: expected } of fixture.cases) {
    test(`totient(${String(n)}) = ${String(expected)}`, () => {
      expect(totient(n)).toBe(expected);
    });
  }
});

describe("modpow — SymPy cross-engine", () => {
  const fixture = loadModularFixture();
  for (const { a, b, m, result } of fixture.powCases) {
    test(`modpow(${String(a)}, ${String(b)}, ${String(m)}) = ${String(result)}`, () => {
      expect(modpow(a, b, m)).toBe(result);
    });
  }
});

describe("modularInverse — SymPy cross-engine", () => {
  const fixture = loadModularFixture();
  for (const { a, m, inverse } of fixture.inverseCases) {
    test(`modularInverse(${String(a)}, ${String(m)}) = ${String(inverse)}`, () => {
      expect(modularInverse(a, m)).toBe(inverse);
    });
  }
});
