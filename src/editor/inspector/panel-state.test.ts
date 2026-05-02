import { describe, expect, it } from "vitest";
import type { BlockDefinition } from "~/blocks/types";
import type { EvalResult } from "~/engine/types";
import type { MathValue } from "~/math/types";
import { derivePanelState } from "./panel-state";

const stubDef = (): BlockDefinition =>
  ({
    id: "la.matmul",
    label: "Matrix multiply",
    role: "operation",
    domain: "linear-algebra",
    color: "operation",
    inputs: [],
    outputs: [],
    params: {},
    explain: { what: "x", why: "x" },
    compute: () => ({ type: { kind: "Scalar" } as never, payload: 0 }) as never,
  }) as unknown as BlockDefinition;

const valueResult = (): EvalResult => ({
  kind: "value",
  value: { type: { kind: "Scalar" } } as unknown as MathValue,
});

const errorResult = (): EvalResult => ({
  kind: "error",
  error: { nodeId: "n1", message: "type mismatch" },
});

describe("derivePanelState", () => {
  it("returns 'unknown' when block def is missing", () => {
    expect(derivePanelState({ def: undefined, result: undefined })).toBe("unknown");
  });

  it("returns 'computing' when result is undefined and def exists", () => {
    expect(derivePanelState({ def: stubDef(), result: undefined })).toBe("computing");
  });

  it("returns 'error' for an EvaluationError result", () => {
    expect(derivePanelState({ def: stubDef(), result: errorResult() })).toBe("error");
  });

  it("returns 'value' for a value result", () => {
    expect(derivePanelState({ def: stubDef(), result: valueResult() })).toBe("value");
  });

  it("'unknown' takes precedence over result presence", () => {
    expect(derivePanelState({ def: undefined, result: valueResult() })).toBe("unknown");
  });
});
