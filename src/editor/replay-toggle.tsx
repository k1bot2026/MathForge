"use client";

// Top-bar toggle that flips the canvas between live editing and the
// Construction Protocol replay. Sits in the canvas's top-right corner;
// the bottom-bar ReplayBar mounts conditionally based on the same
// store's `mode`.

import { useHistoryStore } from "~/store/history-store";

export function ReplayToggle() {
  const mode = useHistoryStore((s) => s.mode);
  const setMode = useHistoryStore((s) => s.setMode);
  const isReplay = mode === "replay";
  return (
    <button
      type="button"
      onClick={() => {
        setMode(isReplay ? "edit" : "replay");
      }}
      aria-pressed={isReplay}
      className="absolute right-4 top-4 z-10 rounded border border-border bg-surface px-3 py-1 text-sm shadow-block-1 hover:bg-surface-2"
    >
      {isReplay ? "Exit replay" : "Replay"}
    </button>
  );
}
