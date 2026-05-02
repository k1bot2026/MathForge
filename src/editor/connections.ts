export type ConnectResult = { ok: true } | { ok: false; reason: string };

// TODO(phase-1): replace stub with structural type-checking per docs/TYPES.md
// — kind/field/shape compatibility, shape-variable unification, precision flow.
// The signature will tighten to (out: MathType, into: MathType) once
// src/math/types.ts is fleshed out beyond the discriminator skeleton.
export function canConnect(_out: unknown, _into: unknown): ConnectResult {
  return { ok: true };
}
