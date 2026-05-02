import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useHistoryStore } from "~/store/history-store";
import { useGraphProjection } from "./use-graph-projection";

beforeEach(() => useHistoryStore.getState().reset());

describe("useGraphProjection", () => {
  it("returns empty projection when log is empty", () => {
    const { result } = renderHook(() => useGraphProjection());
    expect(result.current.nodes).toEqual([]);
    expect(result.current.edges).toEqual([]);
    expect(result.current.justAppearedIds).toEqual([]);
  });

  it("projects events up to currentStep", () => {
    act(() => {
      useHistoryStore.getState().setEvents([
        {
          kind: "node-added",
          node: { id: "a", type: "block", position: { x: 0, y: 0 }, data: {} },
          at: 0,
        },
        {
          kind: "node-added",
          node: { id: "b", type: "block", position: { x: 0, y: 0 }, data: {} },
          at: 1,
        },
      ]);
      useHistoryStore.getState().setCurrentStep(1);
    });
    const { result } = renderHook(() => useGraphProjection());
    expect(result.current.nodes.map((n) => n.id)).toEqual(["a"]);
    expect(result.current.justAppearedIds).toEqual(["a"]);
  });

  it("re-renders when currentStep changes", () => {
    act(() => {
      useHistoryStore.getState().setEvents([
        {
          kind: "node-added",
          node: { id: "a", type: "block", position: { x: 0, y: 0 }, data: {} },
          at: 0,
        },
        {
          kind: "node-added",
          node: { id: "b", type: "block", position: { x: 0, y: 0 }, data: {} },
          at: 1,
        },
      ]);
    });
    const { result } = renderHook(() => useGraphProjection());
    expect(result.current.nodes).toHaveLength(2);
    act(() => {
      useHistoryStore.getState().setCurrentStep(1);
    });
    expect(result.current.nodes).toHaveLength(1);
  });

  it("memoizes the projection object across re-renders with same deps", () => {
    act(() => {
      useHistoryStore.getState().setEvents([
        {
          kind: "node-added",
          node: { id: "a", type: "block", position: { x: 0, y: 0 }, data: {} },
          at: 0,
        },
      ]);
    });
    const { result, rerender } = renderHook(() => useGraphProjection());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
