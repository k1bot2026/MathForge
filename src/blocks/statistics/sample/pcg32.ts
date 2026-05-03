// PCG32 pseudo-random number generator.
// Reference: O'Neill, "PCG: A Family of Simple Fast Space-Efficient
// Statistically Good Algorithms for Random Number Generation" (2014).
// Uses BigInt for correct 64-bit arithmetic.

const MULT = BigInt("6364136223846793005");
const MASK64 = (BigInt(1) << BigInt(64)) - BigInt(1);
const MASK32 = BigInt(0xffffffff);

export class Pcg32 {
  private state: bigint;
  private readonly inc: bigint;

  constructor(seed: number, seq = 1) {
    this.inc = (BigInt(seq) << BigInt(1)) | BigInt(1);
    this.state = BigInt(0);
    this.advance();
    this.state = (this.state + BigInt(seed >>> 0)) & MASK64;
    this.advance();
  }

  private advance(): void {
    this.state = (this.state * MULT + this.inc) & MASK64;
  }

  nextUint32(): number {
    const state = this.state;
    this.advance();
    // XSH-RR output function
    const xorshifted = Number((((state >> BigInt(18)) ^ state) >> BigInt(27)) & MASK32);
    const rot = Number(state >> BigInt(59));
    return ((xorshifted >>> rot) | (xorshifted << (-rot & 31))) >>> 0;
  }

  /** Returns a uniform float in [0, 1) */
  nextFloat(): number {
    return this.nextUint32() / 0x100000000;
  }

  /** Returns a uniform float in [a, b) */
  nextUniform(a: number, b: number): number {
    return a + this.nextFloat() * (b - a);
  }

  /** Returns true with probability p */
  nextBernoulli(p: number): boolean {
    return this.nextFloat() < p;
  }

  /** Box-Muller transform — returns one N(0,1) sample */
  nextNormal(): number {
    const u1 = this.nextFloat() + 1e-300; // avoid log(0)
    const u2 = this.nextFloat();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /** Marsaglia-Tsang Gamma(alpha, 1) sampler */
  nextGamma(alpha: number): number {
    if (alpha < 1) {
      return this.nextGamma(alpha + 1) * this.nextFloat() ** (1 / alpha);
    }
    const d = alpha - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    for (;;) {
      let x: number;
      let v: number;
      do {
        x = this.nextNormal();
        v = 1 + c * x;
      } while (v <= 0);
      v = v * v * v;
      const u = this.nextFloat() + 1e-300;
      if (u < 1 - 0.0331 * x * x * x * x) return d * v;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  }
}
