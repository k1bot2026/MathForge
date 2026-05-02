// Stable structural hashing for cache keys.
//
// JSON.stringify is order-dependent on object keys. This module sorts
// keys before serialising so two semantically-equal inputs always
// produce the same hash. math.js's Fraction / BigNumber objects have
// stable own-key ordering by construction; if we ever start hashing
// payloads that include non-plain class instances we'll need to extend
// this with a per-class serialiser.

export function stableStringify(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  const type = typeof value;
  if (type === "number" || type === "boolean" || type === "bigint") {
    return String(value);
  }
  if (type === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (type === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
