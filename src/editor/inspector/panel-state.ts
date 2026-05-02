// Panel-level visual state — a single discriminator deriving the
// inspector's chip + body treatment from the current EvalResult plus
// the block definition. Pure function; no React.
//
// Phase 1 produces 'computing' | 'value' | 'error' | 'unknown'. The
// 'warn' state (precision loss) is wired through the StateChip and
// its CSS but only lights up once a precision ledger lands in a later
// slice — see the explanation-panel handoff README §3 ("State as a
// glanceable signal, not a billboard").

import type { BlockDefinition } from "~/blocks/types";
import type { EvalResult } from "~/engine/types";

export type PanelState = "computing" | "value" | "warn" | "error" | "unknown";

export type DerivePanelStateArgs = {
  def: BlockDefinition | undefined;
  result: EvalResult | undefined;
};

export function derivePanelState({ def, result }: DerivePanelStateArgs): PanelState {
  if (def === undefined) return "unknown";
  if (result === undefined) return "computing";
  if (result.kind === "error") return "error";
  return "value";
}
