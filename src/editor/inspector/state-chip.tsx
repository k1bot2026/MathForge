// State chip for the inspector header. Three layered signals replace
// the design-rejected coloured banner — chip is signal 1; the body
// treatment (skeleton, tinted left rail, callout block) is signal 2;
// the block-side red border in block-node.tsx is signal 3. Per the
// explanation-panel handoff README §3 ("colour is never the only
// signal"), every state pairs a coloured token with both a textual
// label and a small dot indicator.

import type { PanelState } from "./panel-state";

const LABELS: Readonly<Record<PanelState, string>> = {
  computing: "computing",
  value: "value · ok",
  warn: "precision loss",
  error: "type mismatch",
  unknown: "unregistered",
};

const TONE: Readonly<Record<PanelState, string>> = {
  computing: "border-info-border-soft bg-info-soft text-info",
  value: "border-border bg-surface-2 text-fg-muted",
  warn: "border-warn-border-soft bg-warn-soft text-warn",
  error: "border-error-border-soft bg-error-soft text-error",
  unknown: "border-border bg-surface-2 text-fg-muted",
};

export function StateChip({ state }: { state: PanelState }) {
  return (
    <span
      data-testid={`state-chip-${state}`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${TONE[state]}`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {LABELS[state]}
    </span>
  );
}
