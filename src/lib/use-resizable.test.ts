import { act, renderHook } from "@testing-library/react";
import type { KeyboardEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { useResizable } from "./use-resizable";

const fakeKey = (key: string): KeyboardEvent =>
  ({ key, preventDefault: vi.fn() }) as unknown as KeyboardEvent;

describe("useResizable", () => {
  it("returns separator props with the right ARIA attributes", () => {
    const { result } = renderHook(() =>
      useResizable({ value: 380, onChange: () => {}, min: 320, max: 520 }),
    );
    expect(result.current.separatorProps).toMatchObject({
      role: "separator",
      "aria-orientation": "vertical",
      "aria-valuemin": 320,
      "aria-valuemax": 520,
      "aria-valuenow": 380,
      tabIndex: 0,
    });
  });

  it("ArrowLeft decreases value by step (default 16px)", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useResizable({ value: 400, onChange, min: 320, max: 520 }));
    act(() => {
      result.current.separatorProps.onKeyDown(fakeKey("ArrowLeft"));
    });
    expect(onChange).toHaveBeenCalledWith(384);
  });

  it("ArrowRight increases value by step", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useResizable({ value: 400, onChange, min: 320, max: 520 }));
    act(() => {
      result.current.separatorProps.onKeyDown(fakeKey("ArrowRight"));
    });
    expect(onChange).toHaveBeenCalledWith(416);
  });

  it("clamps at the minimum", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useResizable({ value: 320, onChange, min: 320, max: 520 }));
    act(() => {
      result.current.separatorProps.onKeyDown(fakeKey("ArrowLeft"));
    });
    expect(onChange).toHaveBeenCalledWith(320);
  });

  it("clamps at the maximum", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useResizable({ value: 520, onChange, min: 320, max: 520 }));
    act(() => {
      result.current.separatorProps.onKeyDown(fakeKey("ArrowRight"));
    });
    expect(onChange).toHaveBeenCalledWith(520);
  });

  it("ignores other keys", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useResizable({ value: 400, onChange, min: 320, max: 520 }));
    act(() => {
      result.current.separatorProps.onKeyDown(fakeKey("Enter"));
    });
    expect(onChange).not.toHaveBeenCalled();
  });
});
