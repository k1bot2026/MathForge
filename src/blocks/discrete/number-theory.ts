import type { MathValue, SetPayload } from "~/math/types";
import { makeScalar } from "./combinatorics";

export class NumberTheoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NumberTheoryError";
  }
}

function assertPositiveInteger(n: number, name: string): void {
  if (!Number.isInteger(n) || n < 1) {
    throw new NumberTheoryError(`${name} must be a positive integer, got ${String(n)}`);
  }
}

function assertNonNegativeInteger(n: number, name: string): void {
  if (!Number.isInteger(n) || n < 0) {
    throw new NumberTheoryError(`${name} must be a non-negative integer, got ${String(n)}`);
  }
}

export function gcd(a: number, b: number): number {
  assertPositiveInteger(a, "a");
  assertPositiveInteger(b, "b");
  let x = a;
  let y = b;
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

export function lcm(a: number, b: number): number {
  assertPositiveInteger(a, "a");
  assertPositiveInteger(b, "b");
  return (a / gcd(a, b)) * b;
}

/** Modular exponentiation: base^exp mod m (all non-negative integers). */
export function modpow(base: number, exp: number, m: number): number {
  assertNonNegativeInteger(base, "base");
  assertNonNegativeInteger(exp, "exp");
  assertPositiveInteger(m, "m");
  if (m === 1) return 0;
  let result = 1;
  let b = base % m;
  let e = exp;
  while (e > 0) {
    if (e % 2 === 1) result = (result * b) % m;
    e = Math.floor(e / 2);
    b = (b * b) % m;
  }
  return result;
}

/** Miller-Rabin deterministic check for n < 3,215,031,751 (covers 32-bit integers). */
export function isPrime(n: number): boolean {
  assertNonNegativeInteger(n, "n");
  if (n < 2) return false;
  if (n === 2 || n === 3 || n === 5 || n === 7) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  // Trial division up to sqrt(n) for n up to 10^9
  const limit = Math.sqrt(n);
  for (let i = 5; i <= limit; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}

/** Returns sorted prime factors with multiplicity (e.g. 12 → [2,2,3]). */
export function primeFactorize(n: number): ReadonlyArray<number> {
  assertPositiveInteger(n, "n");
  const factors: number[] = [];
  let remaining = n;
  for (let d = 2; d * d <= remaining; d++) {
    while (remaining % d === 0) {
      factors.push(d);
      remaining = remaining / d;
    }
  }
  if (remaining > 1) factors.push(remaining);
  return factors;
}

/** Returns sorted list of distinct prime factors (e.g. 12 → [2,3]). */
export function factor(n: number): ReadonlyArray<number> {
  const all = primeFactorize(n);
  return [...new Set(all)];
}

/** Euler's totient: count of integers in [1,n] coprime to n. */
export function totient(n: number): number {
  assertPositiveInteger(n, "n");
  if (n === 1) return 1;
  const factors = factor(n);
  let result = n;
  for (const p of factors) {
    result = result - result / p;
  }
  return result;
}

/** Returns sorted list of all positive divisors of n. */
export function divisors(n: number): ReadonlyArray<number> {
  assertPositiveInteger(n, "n");
  const divs: number[] = [];
  const limit = Math.sqrt(n);
  for (let i = 1; i <= limit; i++) {
    if (n % i === 0) {
      divs.push(i);
      if (i !== n / i) divs.push(n / i);
    }
  }
  return divs.sort((a, b) => a - b);
}

/** Modular multiplicative inverse of a mod m (requires gcd(a,m)=1). Extended Euclidean. */
export function modularInverse(a: number, m: number): number {
  assertPositiveInteger(a, "a");
  assertPositiveInteger(m, "m");
  if (m === 1) return 0;
  let [old_r, r] = [a % m, m];
  let [old_s, s] = [1, 0];
  while (r !== 0) {
    const q = Math.floor(old_r / r);
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  if (old_r !== 1) {
    throw new NumberTheoryError(
      `modular-inverse: gcd(${String(a)}, ${String(m)}) = ${String(old_r)} ≠ 1; inverse does not exist`,
    );
  }
  return ((old_s % m) + m) % m;
}

export function makeSetOfIntegers(elements: ReadonlyArray<number>): MathValue {
  const payload: SetPayload = elements.map((v) => makeScalar(v));
  return {
    type: { kind: "Set", element: { kind: "Scalar", field: "integer", precision: "exact" } },
    payload,
    provenance: { blockId: "discrete", inputs: [], computedAt: Date.now(), engine: "native" },
  };
}

export function makeBooleanScalar(value: boolean): MathValue {
  return {
    type: { kind: "Scalar", field: "boolean", precision: "exact" },
    payload: value,
    provenance: { blockId: "discrete", inputs: [], computedAt: Date.now(), engine: "native" },
  };
}
