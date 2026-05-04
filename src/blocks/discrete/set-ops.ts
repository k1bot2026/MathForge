// Shared utilities for set-operation blocks (union, intersection, difference,
// cartesian product). All operate on SetPayload (ReadonlyArray<MathValue>)
// where elements are Scalar(integer) values.

import type { MathType, MathValue, SetPayload } from "~/math/types";

export class SetOpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SetOpError";
  }
}

function scalarKey(v: MathValue): string {
  return String(v.payload);
}

function makeSetValue(
  elements: ReadonlyArray<MathValue>,
  elementType: MathType,
  blockId: string,
): MathValue {
  const payload: SetPayload = elements;
  return {
    type: { kind: "Set", element: elementType },
    payload,
    provenance: { blockId, inputs: [], computedAt: Date.now(), engine: "native" },
  };
}

function toKeyedMap(payload: SetPayload): Map<string, MathValue> {
  const m = new Map<string, MathValue>();
  for (const v of payload) {
    m.set(scalarKey(v), v);
  }
  return m;
}

export function setUnion(a: MathValue, b: MathValue): MathValue {
  if (a.type.kind !== "Set" || b.type.kind !== "Set") {
    throw new SetOpError("discrete.union: both inputs must be Set");
  }
  const aPayload = a.payload as SetPayload;
  const bPayload = b.payload as SetPayload;
  const seen = new Set<string>();
  const out: MathValue[] = [];
  for (const v of [...aPayload, ...bPayload]) {
    const k = scalarKey(v);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(v);
    }
  }
  return makeSetValue(out, a.type.element, "discrete.union");
}

export function setIntersection(a: MathValue, b: MathValue): MathValue {
  if (a.type.kind !== "Set" || b.type.kind !== "Set") {
    throw new SetOpError("discrete.intersection: both inputs must be Set");
  }
  const aPayload = a.payload as SetPayload;
  const bMap = toKeyedMap(b.payload as SetPayload);
  const out = aPayload.filter((v) => bMap.has(scalarKey(v)));
  return makeSetValue(out, a.type.element, "discrete.intersection");
}

export function setDifference(a: MathValue, b: MathValue): MathValue {
  if (a.type.kind !== "Set" || b.type.kind !== "Set") {
    throw new SetOpError("discrete.difference: both inputs must be Set");
  }
  const aPayload = a.payload as SetPayload;
  const bMap = toKeyedMap(b.payload as SetPayload);
  const out = aPayload.filter((v) => !bMap.has(scalarKey(v)));
  return makeSetValue(out, a.type.element, "discrete.difference");
}

export function setCartesianProduct(a: MathValue, b: MathValue): MathValue {
  if (a.type.kind !== "Set" || b.type.kind !== "Set") {
    throw new SetOpError("discrete.cartesian-product: both inputs must be Set");
  }
  const aPayload = a.payload as SetPayload;
  const bPayload = b.payload as SetPayload;

  // Each element of the product is a Tuple of two integers
  const tupleType: MathType = {
    kind: "Tuple",
    elements: [a.type.element, b.type.element],
  };

  const out: MathValue[] = [];
  for (const va of aPayload) {
    for (const vb of bPayload) {
      out.push({
        type: tupleType,
        payload: [va, vb] as unknown as number,
        provenance: {
          blockId: "discrete.cartesian-product",
          inputs: [],
          computedAt: 0,
          engine: "native",
        },
      });
    }
  }

  return {
    type: { kind: "Set", element: tupleType },
    payload: out as SetPayload,
    provenance: {
      blockId: "discrete.cartesian-product",
      inputs: [],
      computedAt: Date.now(),
      engine: "native",
    },
  };
}
