"use client";

// Renders the four-tab explanation panel from BlockDefinition.explain
// per docs/DESIGN_PRINCIPLES.md voice rules. effect/impact are
// inputs+output dependent — they're hidden when no result is available
// yet so the panel doesn't render half-empty text.
//
// Active tab is workspace-scoped via useUiStore (per the
// explanation-panel handoff README §3 "Tab persistence is workspace-
// scoped, not selection-scoped"). If the active tab vanishes for the
// current block (no `effect`/`impact`), we fall back to the first
// available tab without mutating the persisted preference — so when
// the user re-selects a block that does have it, they're back on it.

import type { BlockDefinition, ResolvedInputs } from "~/blocks/types";
import type { EvalResult } from "~/engine/types";
import { type ExplanationTabId, useUiStore } from "~/store/ui-store";

const TAB_LABELS: Readonly<Record<ExplanationTabId, string>> = {
  what: "What",
  why: "Why",
  effect: "Effect",
  impact: "Impact",
};

export type ExplanationTabsProps = {
  def: BlockDefinition;
  inputs: ResolvedInputs;
  result: EvalResult | undefined;
};

export function ExplanationTabs({ def, inputs, result }: ExplanationTabsProps) {
  const persistedTab = useUiStore((s) => s.activeExplanationTab);
  const setTab = useUiStore((s) => s.setActiveExplanationTab);

  const haveValue = result?.kind === "value";
  const tabs: ReadonlyArray<ExplanationTabId> = (
    ["what", "why", "effect", "impact"] satisfies ExplanationTabId[]
  ).filter((t) => availableForTab(def, t, haveValue));

  // If the persisted tab isn't available for this block, fall back to
  // the leftmost without mutating the store — the user gets back to
  // their preferred tab when they select a block that supports it.
  const activeTab: ExplanationTabId = tabs.includes(persistedTab)
    ? persistedTab
    : (tabs[0] ?? "what");

  const text = renderTab(def, activeTab, inputs, result);

  return (
    <section data-testid="explanation-tabs" className="flex flex-col gap-2">
      <div role="tablist" className="flex gap-1 border-b border-border text-xs">
        {tabs.map((t) => {
          const isActive = t === activeTab;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                setTab(t);
              }}
              data-testid={`explanation-tab-${t}`}
              className={`px-2 py-1.5 transition-colors ${
                isActive
                  ? "border-b-2 border-fg text-fg"
                  : "border-b-2 border-transparent text-fg-muted hover:text-fg"
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          );
        })}
      </div>
      <p data-testid={`explanation-text-${activeTab}`} className="text-sm leading-relaxed text-fg">
        {text}
      </p>
    </section>
  );
}

function availableForTab(def: BlockDefinition, tab: ExplanationTabId, haveValue: boolean): boolean {
  if (tab === "what" || tab === "why") return true;
  if (tab === "effect") return def.explain.effect !== undefined && haveValue;
  if (tab === "impact") return def.explain.impact !== undefined && haveValue;
  return false;
}

function renderTab(
  def: BlockDefinition,
  tab: ExplanationTabId,
  inputs: ResolvedInputs,
  result: EvalResult | undefined,
): string {
  const e = def.explain;
  if (tab === "what") return typeof e.what === "function" ? e.what(inputs) : e.what;
  if (tab === "why") return typeof e.why === "function" ? e.why(inputs) : e.why;
  if (tab === "effect" && e.effect !== undefined && result?.kind === "value") {
    return e.effect(inputs, result.value);
  }
  if (tab === "impact" && e.impact !== undefined && result?.kind === "value") {
    return e.impact(inputs, result.value);
  }
  return "";
}
