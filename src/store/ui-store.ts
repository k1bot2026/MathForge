// Workspace-scoped UI state — survives node selection changes within a
// session, but not across reloads. Per the explanation-panel handoff
// (docs/plans/2026-05-02-construction-protocol-design.md sibling
// design-handoff/2026-05-02-explanation-panel/README.md §3), tab
// persistence is workspace-scoped, not selection-scoped, not cross-
// reload. The inspector width follows the same lifecycle.

import { create } from "zustand";

export type ExplanationTabId = "what" | "why" | "effect" | "impact";

const MIN_WIDTH = 320;
const MAX_WIDTH = 520;
const DEFAULT_WIDTH = 380;

export const INSPECTOR_WIDTH_LIMITS = {
  min: MIN_WIDTH,
  max: MAX_WIDTH,
  default: DEFAULT_WIDTH,
} as const;

export type UiState = {
  activeExplanationTab: ExplanationTabId;
  inspectorWidth: number;
  setActiveExplanationTab: (tab: ExplanationTabId) => void;
  setInspectorWidth: (px: number) => void;
  reset: () => void;
};

const clamp = (n: number): number => Math.max(MIN_WIDTH, Math.min(n, MAX_WIDTH));

export const useUiStore = create<UiState>((set) => ({
  activeExplanationTab: "what",
  inspectorWidth: DEFAULT_WIDTH,
  setActiveExplanationTab: (tab) => {
    set({ activeExplanationTab: tab });
  },
  setInspectorWidth: (px) => {
    set({ inspectorWidth: clamp(px) });
  },
  reset: () => {
    set({ activeExplanationTab: "what", inspectorWidth: DEFAULT_WIDTH });
  },
}));
