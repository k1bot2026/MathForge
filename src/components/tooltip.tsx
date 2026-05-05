"use client";

// Lightweight Tooltip component. Uses CSS positioning relative to a wrapper
// span rather than portals, which avoids React Flow stacking-context issues.
// ~300ms open delay per UX Round 2 spec. Keyboard accessible (role="tooltip").

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
};

export function Tooltip({
  content,
  children,
  delay = 300,
  side = "top",
  maxWidth = 220,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();

  const open = useCallback(() => {
    timerRef.current = setTimeout(() => setVisible(true), delay);
  }, [delay]);

  const close = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
  }, []);

  const posClass = SIDE_CLASSES[side];
  const widthStyle = maxWidth > 0 ? { maxWidth: `${maxWidth}px` } : {};

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: tooltip wrapper delegates interaction to child; no semantic role fits a transparent inline container
    <span
      className="relative inline-flex"
      onMouseEnter={open}
      onMouseLeave={close}
      onFocus={open}
      onBlur={close}
    >
      {children}
      {visible && content != null ? (
        <span
          role="tooltip"
          id={id}
          style={widthStyle}
          className={`pointer-events-none absolute z-50 w-max rounded-md border border-border bg-surface font-mono text-[11px] text-fg shadow-block-2 ${posClass}`}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}

const SIDE_CLASSES: Readonly<Record<NonNullable<TooltipProps["side"]>, string>> = {
  top: "bottom-full left-1/2 mb-1.5 -translate-x-1/2",
  bottom: "top-full left-1/2 mt-1.5 -translate-x-1/2",
  left: "right-full top-1/2 mr-1.5 -translate-y-1/2",
  right: "left-full top-1/2 ml-1.5 -translate-y-1/2",
};
