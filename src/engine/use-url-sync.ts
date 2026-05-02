"use client";

// Two-way bind between window.location.hash and the graph store.
//
// On mount: if `#<encoded>` is present, decode and replace the seed
// graph with the URL's graph. Decode failures are logged to console
// and the seed is kept (we'd rather show *something* than a blank
// canvas).
//
// While running: a debounced subscription to nodes/edges encodes the
// current graph and writes it back to the hash via history.replaceState
// — no new history entries, so the back button still does what users
// expect.
//
// Phase-1 contract: the hash IS the share URL. Copying the address bar
// is the share action; no separate "share" button required (Claude
// Design will likely add a copy-to-clipboard button later).

import { useEffect } from "react";
import { decodeGraph, encodeGraph } from "~/lib/graph-codec";
import { useGraphStore } from "~/store/graph-store";

const HASH_DEBOUNCE_MS = 120;

export function useUrlSync(): void {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // ── On-mount: hydrate from #hash if present.
    const initialHash = window.location.hash.replace(/^#/, "");
    if (initialHash.length > 0) {
      const decoded = decodeGraph(initialHash);
      if (decoded.ok) {
        useGraphStore.getState().replaceGraph(
          decoded.graph.nodes.map((n) => ({
            id: n.id,
            type: n.type,
            position: n.position,
            data: n.data,
          })),
          decoded.graph.edges.map((e) => {
            const edge: {
              id: string;
              source: string;
              target: string;
              sourceHandle?: string;
              targetHandle?: string;
            } = {
              id: e.id,
              source: e.source,
              target: e.target,
            };
            if (e.sourceHandle !== undefined) edge.sourceHandle = e.sourceHandle;
            if (e.targetHandle !== undefined) edge.targetHandle = e.targetHandle;
            return edge;
          }),
          "url-hash",
        );
      } else {
        console.warn(`useUrlSync: failed to decode hash payload — ${decoded.reason}`);
      }
    }

    // ── On-change: debounced encode + replaceState.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const writeHash = () => {
      const { nodes, edges } = useGraphStore.getState();
      const encoded = encodeGraph(nodes, edges);
      const next = `#${encoded}`;
      if (window.location.hash === next) return;
      window.history.replaceState(null, "", next);
    };

    // Write the current graph to the hash immediately on mount so the URL
    // always reflects the live state and can be copied as the share link
    // even when the user hasn't touched anything yet.
    writeHash();

    const unsubscribe = useGraphStore.subscribe((state, prev) => {
      if (state.nodes === prev.nodes && state.edges === prev.edges) return;
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(writeHash, HASH_DEBOUNCE_MS);
    });

    return () => {
      if (timer !== null) clearTimeout(timer);
      unsubscribe();
    };
  }, []);
}
