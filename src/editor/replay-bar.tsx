"use client";

// Bottom-bar Construction Protocol timeline. Mounted only when the
// history store is in "replay" mode (canvas controls visibility).
//
// 400 ms per step, the centre of the 300–600 ms band specified in
// docs/DESIGN_PRINCIPLES.md "Animation grammar — Replay step advance".
// prefers-reduced-motion is honoured globally in src/app/globals.css;
// the auto-advance tick still fires, but the per-block glow is
// neutralised to a static outline.

import { useEffect } from "react";
import type { ConstructionEvent } from "~/engine/construction-events";
import { useHistoryStore } from "~/store/history-store";

const STEP_MS = 400;

function describeEvent(events: readonly ConstructionEvent[], step: number): string {
  if (step === 0) return "start";
  const ev = events[step - 1];
  if (ev === undefined) return "";
  switch (ev.kind) {
    case "node-added":
      return `${ev.node.id} added`;
    case "node-removed":
      return `${ev.nodeId} removed`;
    case "node-moved":
      return `${ev.nodeId} moved`;
    case "params-updated":
      return `${ev.nodeId} params changed`;
    case "edge-added":
      return `connected ${ev.edge.source} → ${ev.edge.target}`;
    case "edge-removed":
      return `edge ${ev.edgeId} removed`;
    case "graph-reset":
      return `graph reset (${ev.reason})`;
  }
}

export function ReplayBar() {
  const events = useHistoryStore((s) => s.events);
  const step = useHistoryStore((s) => s.currentStep);
  const playing = useHistoryStore((s) => s.playing);
  const setStep = useHistoryStore((s) => s.setCurrentStep);
  const setPlaying = useHistoryStore((s) => s.setPlaying);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      const state = useHistoryStore.getState();
      const next = state.currentStep + 1;
      if (next > state.events.length) {
        state.setPlaying(false);
        return;
      }
      state.setCurrentStep(next);
      if (next === state.events.length) state.setPlaying(false);
    }, STEP_MS);
    return () => {
      window.clearInterval(id);
    };
  }, [playing]);

  const total = events.length;

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 flex h-14 items-center gap-3 border-t border-border bg-bg/95 px-4 backdrop-blur">
      <button
        type="button"
        aria-label={playing ? "pause" : "play"}
        onClick={() => {
          setPlaying(!playing);
        }}
        className="rounded border border-border bg-surface px-3 py-1 text-sm hover:bg-surface-2"
      >
        {playing ? "Pause" : "Play"}
      </button>
      <input
        aria-label="construction-step"
        type="range"
        min={0}
        max={total}
        value={step}
        onChange={(e) => {
          setStep(Number(e.target.value));
        }}
        className="flex-1 accent-[var(--accent)]"
      />
      <span
        data-testid="replay-step-description"
        className="min-w-[18ch] text-right font-mono text-xs text-fg-muted"
      >
        step {step}/{total}: {describeEvent(events, step)}
      </span>
    </div>
  );
}
