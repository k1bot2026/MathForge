"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "mathforge.onboarding-dismissed";

export function OnboardingHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === null) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable (private browsing, SSR guard)
    }
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  }

  if (!visible) return null;

  return (
    <div
      data-testid="onboarding-hint"
      className="pointer-events-auto absolute bottom-6 left-1/2 z-20 w-[420px] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl border border-border bg-surface p-4 shadow-block-3"
      role="dialog"
      aria-label="Getting started with MathForge"
    >
      <h3 className="mb-2 text-sm font-semibold text-fg">Welcome to MathForge</h3>
      <ol className="mb-3 list-decimal space-y-1.5 pl-4">
        <li className="text-xs text-fg-muted">
          <span className="font-medium text-fg">Browse the library</span> — the left panel lists
          every available block, grouped by domain. Use the search box to filter.
        </li>
        <li className="text-xs text-fg-muted">
          <span className="font-medium text-fg">Drag to build</span> — drag any block onto the
          canvas, then connect ports by drawing edges between them.
        </li>
        <li className="text-xs text-fg-muted">
          <span className="font-medium text-fg">Edit inline</span> — click a block to select it;
          simple blocks show sliders and inputs directly on the node. Open the inspector on the
          right for full controls and explanations.
        </li>
        <li className="text-xs text-fg-muted">
          <span className="font-medium text-fg">Load a template</span> — scroll to the bottom of the
          library panel and pick a starter example (rotation, shear, or eigen-demo).
        </li>
      </ol>
      <button
        type="button"
        onClick={dismiss}
        className="rounded border border-border bg-surface-2 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:bg-border hover:text-fg"
        data-testid="onboarding-dismiss"
      >
        Got it
      </button>
    </div>
  );
}
