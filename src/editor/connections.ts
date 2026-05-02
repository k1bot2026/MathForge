// Structural type-checker for graph edges. Implements docs/TYPES.md.
//
// `canConnect(out, into)` is called both at edit time (React Flow's
// `<Handle isValidConnection={…}>`) and at evaluator time when a block's
// polymorphic output type needs resolving against downstream slots.
//
// Returns:
//   { ok: true, bindings?, warning? } — connection accepted; `bindings`
//     records any concrete values inferred for shape variables that the
//     evaluator should propagate downstream; `warning` carries soft
//     diagnostics like "precision will be lost downstream".
//   { ok: false, reason } — hard rejection. `reason` is a single
//     end-user sentence suitable for the on-handle tooltip.

import {
  type Field,
  isFieldSubtype,
  isShapeVar,
  type MathType,
  type Precision,
  type Shape,
  shapeToString,
} from "~/math/types";

export type ConnectResult =
  | { ok: true; bindings?: Readonly<Record<string, number>>; warning?: string }
  | { ok: false; reason: string };

// ──────────────────────────────────────────────────────────────────────
// Top-level entry point
// ──────────────────────────────────────────────────────────────────────

export function canConnect(out: MathType, into: MathType): ConnectResult {
  if (out.kind !== into.kind) {
    return {
      ok: false,
      reason: `Cannot connect ${out.kind} to ${into.kind}`,
    };
  }
  switch (out.kind) {
    case "Scalar":
      return checkScalar(out, into as Extract<MathType, { kind: "Scalar" }>);
    case "Vector":
      return checkVector(out, into as Extract<MathType, { kind: "Vector" }>);
    case "Matrix":
      return checkMatrix(out, into as Extract<MathType, { kind: "Matrix" }>);
    case "Function":
      return checkFunction(out, into as Extract<MathType, { kind: "Function" }>);
    case "Tuple":
      return checkTuple(out, into as Extract<MathType, { kind: "Tuple" }>);
    case "Set":
      return checkSet(out, into as Extract<MathType, { kind: "Set" }>);
    // Expression / RandomVariable / Distribution: same-kind connections
    // are accepted in Phase 1; deeper structural rules land alongside
    // those domains' first blocks (Phase 3+).
    default:
      return { ok: true };
  }
}

// ──────────────────────────────────────────────────────────────────────
// Per-kind checks
// ──────────────────────────────────────────────────────────────────────

function checkScalar(
  out: Extract<MathType, { kind: "Scalar" }>,
  into: Extract<MathType, { kind: "Scalar" }>,
): ConnectResult {
  const fieldResult = checkField(out.field, into.field);
  if (!fieldResult.ok) return fieldResult;
  return checkPrecision(out.precision, into.precision);
}

function checkVector(
  out: Extract<MathType, { kind: "Vector" }>,
  into: Extract<MathType, { kind: "Vector" }>,
): ConnectResult {
  const fieldResult = checkField(out.field, into.field);
  if (!fieldResult.ok) return fieldResult;
  return unifyShape(out.n, into.n, "n");
}

function checkMatrix(
  out: Extract<MathType, { kind: "Matrix" }>,
  into: Extract<MathType, { kind: "Matrix" }>,
): ConnectResult {
  const fieldResult = checkField(out.field, into.field);
  if (!fieldResult.ok) return fieldResult;
  const mResult = unifyShape(out.m, into.m, "m");
  if (!mResult.ok) return mResult;
  const nResult = unifyShape(out.n, into.n, "n");
  if (!nResult.ok) return nResult;
  return mergeOk(mResult, nResult);
}

function checkFunction(
  out: Extract<MathType, { kind: "Function" }>,
  into: Extract<MathType, { kind: "Function" }>,
): ConnectResult {
  if (out.arity !== into.arity) {
    return {
      ok: false,
      reason: `Function arity mismatch: ${out.arity} → ${into.arity}`,
    };
  }
  // Functions are nominally invariant in their domain/codomain. We're
  // generous: domain must subtype contravariantly (into.domain →
  // out.domain) and codomain covariantly. For Phase 1 we keep it simple
  // — both directions must accept canConnect of the same orientation.
  const dom = canConnect(into.domain, out.domain);
  if (!dom.ok) return { ok: false, reason: `Function domain: ${dom.reason}` };
  const cod = canConnect(out.codomain, into.codomain);
  if (!cod.ok) return { ok: false, reason: `Function codomain: ${cod.reason}` };
  return mergeOk(dom, cod);
}

function checkTuple(
  out: Extract<MathType, { kind: "Tuple" }>,
  into: Extract<MathType, { kind: "Tuple" }>,
): ConnectResult {
  if (out.elements.length !== into.elements.length) {
    return {
      ok: false,
      reason: `Tuple length mismatch: ${out.elements.length} → ${into.elements.length}`,
    };
  }
  let acc: ConnectResult = { ok: true };
  for (let i = 0; i < out.elements.length; i += 1) {
    const o = out.elements[i];
    const t = into.elements[i];
    if (o === undefined || t === undefined) continue;
    const step = canConnect(o, t);
    if (!step.ok) return { ok: false, reason: `Tuple[${i}]: ${step.reason}` };
    acc = mergeOk(acc, step);
  }
  return acc;
}

function checkSet(
  out: Extract<MathType, { kind: "Set" }>,
  into: Extract<MathType, { kind: "Set" }>,
): ConnectResult {
  return canConnect(out.element, into.element);
}

// ──────────────────────────────────────────────────────────────────────
// Field, precision, and shape primitives
// ──────────────────────────────────────────────────────────────────────

function checkField(out: Field, into: Field): ConnectResult {
  if (isFieldSubtype(out, into)) return { ok: true };
  return { ok: false, reason: `Field mismatch: ${out} → ${into}` };
}

function checkPrecision(out: Precision, into: Precision): ConnectResult {
  if (out === "approximate" && into === "exact") {
    return {
      ok: true,
      warning: "Approximate value flowing into exact slot — precision will be lost downstream",
    };
  }
  return { ok: true };
}

/**
 * Unifies one shape dimension. Returns bindings for any shape variable
 * that resolved against a concrete number. Two shape-variable sides
 * succeed without binding (the constraint is recorded by the block's
 * polymorphic-output function at evaluator time, not by a single
 * canConnect call).
 */
export function unifyShape(out: Shape, into: Shape, dim: string): ConnectResult {
  // Wildcards short-circuit on either side.
  if (out === "any" || into === "any") return { ok: true };

  const outIsVar = isShapeVar(out);
  const intoIsVar = isShapeVar(into);

  // Both concrete numbers: must match.
  if (typeof out === "number" && typeof into === "number") {
    if (out === into) return { ok: true };
    return {
      ok: false,
      reason: `${dim} mismatch: ${shapeToString(out)} ≠ ${shapeToString(into)}`,
    };
  }

  // Concrete on output, variable on input: bind the input variable.
  if (typeof out === "number" && intoIsVar) {
    return { ok: true, bindings: { [into.var]: out } };
  }

  // Variable on output, concrete on input: bind the output variable.
  if (typeof into === "number" && outIsVar) {
    return { ok: true, bindings: { [out.var]: into } };
  }

  // Both variables: succeed without binding. Cross-port variable
  // unification within a single block is the manifest's responsibility
  // (its polymorphic output function); a single edge cannot tie two
  // unknowns together.
  if (outIsVar && intoIsVar) {
    return { ok: true };
  }

  // All combinations covered above — this branch is unreachable.
  /* c8 ignore next */
  return { ok: true };
}

// ──────────────────────────────────────────────────────────────────────
// Result combinator
// ──────────────────────────────────────────────────────────────────────

function mergeOk(a: ConnectResult, b: ConnectResult): ConnectResult {
  if (!a.ok) return a;
  if (!b.ok) return b;
  const bindings = { ...(a.bindings ?? {}), ...(b.bindings ?? {}) };
  const result: { ok: true; bindings?: Record<string, number>; warning?: string } = {
    ok: true,
  };
  if (Object.keys(bindings).length > 0) result.bindings = bindings;
  const warning = a.warning ?? b.warning;
  if (warning !== undefined) result.warning = warning;
  return result;
}
