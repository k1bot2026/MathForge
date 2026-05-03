import type { ResolvedInputs, ResolvedParams } from "~/blocks/types";
import type { MathValue } from "~/math/types";
import type { DistributionParameters, DistributionPayload } from "../distribution-payload";
import { Pcg32 } from "./pcg32";

export class SampleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SampleError";
  }
}

function drawSample(rng: Pcg32, params: DistributionParameters): number {
  switch (params.family) {
    case "Bernoulli":
      return rng.nextBernoulli(params.p) ? 1 : 0;

    case "Binomial": {
      let k = 0;
      for (let i = 0; i < params.n; i++) {
        if (rng.nextBernoulli(params.p)) k++;
      }
      return k;
    }

    case "Uniform":
      return rng.nextUniform(params.a, params.b);

    case "Normal":
      return params.mu + params.sigma * rng.nextNormal();

    case "Poisson": {
      // Knuth algorithm (exact for all λ; efficient for λ < ~30)
      const L = Math.exp(-params.lambda);
      let k = 0;
      let p = 1;
      do {
        k++;
        p *= rng.nextFloat();
      } while (p > L);
      return k - 1;
    }

    case "Beta": {
      // X = Gamma(α,1) / (Gamma(α,1) + Gamma(β,1))
      const x = rng.nextGamma(params.alpha);
      const y = rng.nextGamma(params.beta);
      return x / (x + y);
    }

    case "Gamma":
      // shape/rate: Gamma(α, β) = Gamma(α, 1) / β
      return rng.nextGamma(params.alpha) / params.beta;

    case "Empirical": {
      const idx = Math.floor(rng.nextFloat() * params.samples.length);
      return params.samples[idx] ?? 0;
    }

    default: {
      const _exhaustive: never = params;
      throw new SampleError(`Unsupported distribution family`);
    }
  }
}

export function computeSample(inputs: ResolvedInputs, params: ResolvedParams): MathValue {
  const distValue = inputs.dist;
  if (distValue === undefined) {
    throw new SampleError("dist input is required");
  }

  const n = params.n as number;
  if (!Number.isInteger(n) || n <= 0) {
    throw new SampleError(`n must be a positive integer; got ${String(n)}`);
  }

  const seed = (params.seed as number) ?? 42;

  const distPayload = distValue.payload as unknown as DistributionPayload;
  const rng = new Pcg32(seed);
  const samples: number[] = Array.from({ length: n }, () =>
    drawSample(rng, distPayload.parameters),
  );

  return {
    type: { kind: "Vector", n, field: "real" },
    payload: samples,
    provenance: {
      blockId: "stats.sample",
      inputs: [distValue.provenance.blockId],
      computedAt: Date.now(),
      engine: "native",
    },
  };
}
