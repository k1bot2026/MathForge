import type { BlockDefinition } from "~/blocks/types";
import type { MathValue, ModularPayload } from "~/math/types";

export class ModularError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModularError";
  }
}

export const ModularBlock: BlockDefinition = {
  id: "discrete.modular",
  label: "Modular Value",
  symbol: "mod",
  category: "source",
  domain: "discrete",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "source",
  inputs: [],
  outputs: [
    {
      id: "M",
      label: "M",
      type: { kind: "Modular", modulus: "any" },
    },
  ],
  params: {
    value: {
      kind: "integer",
      default: 3,
      min: 0,
      max: 999,
      label: "Value",
    },
    modulus: {
      kind: "integer",
      default: 12,
      min: 2,
      max: 100,
      label: "Modulus n",
    },
  },
  compute(_inputs, params): MathValue {
    const m = typeof params.modulus === "number" ? Math.floor(params.modulus) : 12;
    const v = typeof params.value === "number" ? Math.floor(params.value) : 0;
    if (m < 2) {
      throw new ModularError("discrete.modular: modulus must be ≥ 2");
    }
    const reduced = ((v % m) + m) % m;
    const payload: ModularPayload = { value: reduced, modulus: m };
    return {
      type: { kind: "Modular", modulus: m },
      payload,
      provenance: {
        blockId: "discrete.modular",
        inputs: [],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Creates an element of Z/nZ: a value in the ring of integers modulo n. The value is automatically reduced to [0, n-1].",
    why: "Explicit Modular values let you feed discrete.modular-inverse, viz.modular-clock, and other modular arithmetic blocks without needing to wire through a full computation chain.",
    effect: (_inputs, output) => {
      const { value, modulus } = output.payload as ModularPayload;
      return `${value} in Z/${modulus}Z.`;
    },
  },
};
