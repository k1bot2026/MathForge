"use client";

// Lightweight Tooltip component. Uses position:fixed with ref-based coords
// so the popup escapes any ancestor overflow:hidden (e.g. the block library
// sidebar). ~300ms open delay per UX Round 2 spec. Keyboard accessible.

import { useCallback, useId, useRef, useState } from "react";

export type TooltipProps = {
  content: React.ReactNode;
  children: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
  /** Delay in ms before the tooltip appears. Default 300. */
  delay?: number;
  /** Side to show the tooltip. Default "top". */
  side?: "top" | "bottom" | "left" | "right";
  /** Override the default max-width of 220px. Use 0 to remove max-width. */
  maxWidth?: number;
  /** Additional classes for the wrapper span (e.g. "block" to make it full-width). */
  wrapClass?: string;
};

type Coords = { top: number; left: number };

const GAP = 8;

function computeCoords(anchor: DOMRect, side: NonNullable<TooltipProps["side"]>): Coords {
  switch (side) {
    case "right":
      return { top: anchor.top + anchor.height / 2, left: anchor.right + GAP };
    case "left":
      return { top: anchor.top + anchor.height / 2, left: anchor.left - GAP };
    case "bottom":
      return { top: anchor.bottom + GAP, left: anchor.left + anchor.width / 2 };
    default:
      return { top: anchor.top - GAP, left: anchor.left + anchor.width / 2 };
  }
}

// CSS transform to centre the tooltip on the computed anchor point
const TRANSFORM: Readonly<Record<NonNullable<TooltipProps["side"]>, string>> = {
  top: "translateX(-50%) translateY(-100%)",
  bottom: "translateX(-50%)",
  left: "translateX(-100%) translateY(-50%)",
  right: "translateY(-50%)",
};

export function Tooltip({
  content,
  children,
  delay = 300,
  side = "top",
  maxWidth = 220,
  wrapClass = "",
}: TooltipProps) {
  const [coords, setCoords] = useState<Coords | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const id = useId();

  const open = useCallback(() => {
    timerRef.current = setTimeout(() => {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (rect !== undefined) setCoords(computeCoords(rect, side));
    }, delay);
  }, [delay, side]);

  const close = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setCoords(null);
  }, []);

  const widthStyle =
    maxWidth > 0
      ? { maxWidth: `${maxWidth}px`, transform: TRANSFORM[side] }
      : { transform: TRANSFORM[side] };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: tooltip wrapper delegates interaction to child; no semantic role fits a transparent inline container
    <span
      ref={wrapRef}
      className={`inline-flex${wrapClass.length > 0 ? ` ${wrapClass}` : ""}`}
      onMouseEnter={open}
      onMouseLeave={close}
      onFocus={open}
      onBlur={close}
    >
      {children}
      {coords !== null && content != null ? (
        <span
          role="tooltip"
          id={id}
          style={{ top: coords.top, left: coords.left, ...widthStyle }}
          className="pointer-events-none fixed z-[9999] w-max rounded-md border border-border bg-surface font-mono text-[11px] text-fg shadow-block-2"
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
