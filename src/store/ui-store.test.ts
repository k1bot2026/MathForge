import { beforeEach, describe, expect, it } from "vitest";
import { INSPECTOR_WIDTH_LIMITS, useUiStore } from "./ui-store";

beforeEach(() => useUiStore.getState().reset());

describe("useUiStore", () => {
  it("starts with sensible defaults", () => {
    const s = useUiStore.getState();
    expect(s.activeExplanationTab).toBe("what");
    expect(s.inspectorWidth).toBe(INSPECTOR_WIDTH_LIMITS.default);
  });

  it("setActiveExplanationTab updates the active tab", () => {
    useUiStore.getState().setActiveExplanationTab("effect");
    expect(useUiStore.getState().activeExplanationTab).toBe("effect");
  });

  it("setInspectorWidth clamps below the minimum", () => {
    useUiStore.getState().setInspectorWidth(99);
    expect(useUiStore.getState().inspectorWidth).toBe(INSPECTOR_WIDTH_LIMITS.min);
  });

  it("setInspectorWidth clamps above the maximum", () => {
    useUiStore.getState().setInspectorWidth(9999);
    expect(useUiStore.getState().inspectorWidth).toBe(INSPECTOR_WIDTH_LIMITS.max);
  });

  it("setInspectorWidth accepts in-range values verbatim", () => {
    useUiStore.getState().setInspectorWidth(420);
    expect(useUiStore.getState().inspectorWidth).toBe(420);
  });

  it("reset returns to initial state", () => {
    useUiStore.getState().setActiveExplanationTab("impact");
    useUiStore.getState().setInspectorWidth(500);
    useUiStore.getState().reset();
    expect(useUiStore.getState()).toMatchObject({
      activeExplanationTab: "what",
      inspectorWidth: INSPECTOR_WIDTH_LIMITS.default,
    });
  });
});
