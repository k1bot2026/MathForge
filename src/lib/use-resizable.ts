// Generic horizontal resize hook driving the inspector handle.
//
// Returns a single `separatorProps` object spreadable onto a div: ARIA
// attributes (role="separator", aria-valuemin/max/now), tabIndex, and
// pointer + keyboard event handlers. Keyboard a11y is the must-have:
// ArrowLeft / ArrowRight nudge by STEP px and clamp to [min, max].
// Pointer-drag is wired but only lightly tested — keyboard is the
// bottleneck for accessibility.

import { type KeyboardEvent, type PointerEvent, useCallback, useRef } from "react";

const STEP = 16;

export type UseResizableArgs = {
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
};

export type SeparatorProps = {
  role: "separator";
  "aria-orientation": "vertical";
  "aria-valuemin": number;
  "aria-valuemax": number;
  "aria-valuenow": number;
  tabIndex: 0;
  onPointerDown: (e: PointerEvent) => void;
  onPointerMove: (e: PointerEvent) => void;
  onPointerUp: (e: PointerEvent) => void;
  onKeyDown: (e: KeyboardEvent) => void;
};

export function useResizable({ value, onChange, min, max }: UseResizableArgs): {
  separatorProps: SeparatorProps;
} {
  const startRef = useRef<{ x: number; v: number } | null>(null);

  const clamp = useCallback((n: number) => Math.max(min, Math.min(n, max)), [min, max]);

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      const target = e.target as Element & { setPointerCapture?: (id: number) => void };
      target.setPointerCapture?.(e.pointerId);
      startRef.current = { x: e.clientX, v: value };
    },
    [value],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (startRef.current === null) return;
      // Right-anchored panel: dragging left grows it.
      const dx = startRef.current.x - e.clientX;
      onChange(clamp(startRef.current.v + dx));
    },
    [clamp, onChange],
  );

  const onPointerUp = useCallback(() => {
    startRef.current = null;
  }, []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onChange(clamp(value - STEP));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onChange(clamp(value + STEP));
      }
    },
    [clamp, onChange, value],
  );

  return {
    separatorProps: {
      role: "separator",
      "aria-orientation": "vertical",
      "aria-valuemin": min,
      "aria-valuemax": max,
      "aria-valuenow": value,
      tabIndex: 0,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onKeyDown,
    },
  };
}
