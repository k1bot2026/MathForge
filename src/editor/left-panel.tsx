"use client";

// Left panel — icon rail with 4 tabs:
//   Blocks (block library), Templates, Graphs (saved user blocks + new), Import.
// Each tab fills the content area. The rail is a narrow column of icon buttons.

import type { Edge, Node } from "@xyflow/react";
import { useEffect, useState } from "react";
import { TEMPLATES } from "~/lib/templates";
import { deleteUserBlock, loadUserBlocks, type UserBlockRecord } from "~/lib/user-blocks";
import { useGraphStore } from "~/store/graph-store";
import { BlockLibrary } from "./block-library";
import { ImportPanel } from "./import-dialog";

type Tab = "blocks" | "templates" | "graphs" | "import";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "blocks", label: "Blocks", icon: "⬡" },
  { id: "templates", label: "Templates", icon: "⊞" },
  { id: "graphs", label: "Graphs", icon: "⊕" },
  { id: "import", label: "Import", icon: "↓" },
];

export function LeftPanel() {
  const [active, setActive] = useState<Tab>("blocks");

  return (
    <aside
      data-testid="left-panel"
      className="flex h-full shrink-0 border-r border-border bg-surface"
      style={{ width: 272 }}
    >
      {/* Icon rail */}
      <div className="flex w-10 shrink-0 flex-col border-r border-border bg-surface-2 py-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            title={tab.label}
            aria-label={tab.label}
            aria-pressed={active === tab.id}
            className={`relative flex h-10 w-10 items-center justify-center font-mono text-base transition-colors ${
              active === tab.id
                ? "text-fg before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-r before:bg-role-source-border"
                : "text-fg-faint hover:text-fg-muted"
            }`}
            data-testid={`left-panel-tab-${tab.id}`}
          >
            {tab.icon}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="min-w-0 flex-1 overflow-hidden">
        {active === "blocks" && <BlockLibrary />}
        {active === "templates" && <TemplatesTab />}
        {active === "graphs" && <GraphsTab />}
        {active === "import" && <ImportTab />}
      </div>
    </aside>
  );
}

// ── Blocks tab header label ───────────────────────────────────────────────────
// BlockLibrary renders its own header; nothing extra needed here.

// ── Templates tab ─────────────────────────────────────────────────────────────

function TemplatesTab() {
  const replaceGraph = useGraphStore((s) => s.replaceGraph);

  function loadTemplate(templateId: string) {
    const tpl = TEMPLATES.find((t) => t.id === templateId);
    if (tpl === undefined) return;
    const nodes = tpl.graph.nodes.map((n) => ({ ...n })) as Node[];
    const edges = tpl.graph.edges.map((e) => ({ ...e })) as Edge[];
    replaceGraph(nodes, edges, "template");
  }

  return (
    <div className="flex h-full flex-col" data-testid="templates-tab">
      <header className="border-b border-border px-3 pt-3 pb-2">
        <span className="block font-mono text-[10px] uppercase tracking-wider text-fg-muted">
          Templates
        </span>
      </header>
      <div className="themed-scrollbar flex-1 overflow-y-auto p-3">
        <p className="mb-3 text-[11px] text-fg-muted">
          Load a starter graph to explore or build on.
        </p>
        <div className="flex flex-col gap-2">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => loadTemplate(tpl.id)}
              className="w-full rounded-lg border border-border px-3 py-2.5 text-left hover:bg-surface-2"
              data-testid={`template-${tpl.id}`}
            >
              <span className="block text-xs font-semibold text-fg">{tpl.label}</span>
              <span className="mt-0.5 block font-mono text-[10px] leading-snug text-fg-faint">
                {tpl.description}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Graphs tab ────────────────────────────────────────────────────────────────

function GraphsTab() {
  const replaceGraph = useGraphStore((s) => s.replaceGraph);
  const liveNodes = useGraphStore((s) => s.nodes);
  const [records, setRecords] = useState<UserBlockRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void loadUserBlocks().then((all) => {
      setRecords([...all]);
      setLoaded(true);
    });
  }, []);

  function handleNew() {
    replaceGraph([], [], "user");
  }

  async function handleDelete(id: string) {
    await deleteUserBlock(id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="flex h-full flex-col" data-testid="graphs-tab">
      <header className="flex items-center justify-between border-b border-border px-3 pt-3 pb-2">
        <span className="block font-mono text-[10px] uppercase tracking-wider text-fg-muted">
          Graphs
        </span>
        <button
          type="button"
          onClick={handleNew}
          disabled={liveNodes.length === 0}
          className="rounded border border-border px-2 py-0.5 font-mono text-[10px] text-fg-muted hover:bg-surface-2 hover:text-fg disabled:opacity-40"
          title="Clear canvas and start a new graph"
          data-testid="graphs-new-btn"
        >
          + New
        </button>
      </header>
      <div className="themed-scrollbar flex-1 overflow-y-auto p-3">
        {!loaded ? (
          <p className="text-[11px] text-fg-faint">Loading…</p>
        ) : records.length === 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] text-fg-muted">No saved graphs yet.</p>
            <p className="text-[11px] text-fg-faint">
              Build a graph, then use the inspector to save it as a reusable block. Saved blocks
              appear here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {records.map((rec) => (
              <div
                key={rec.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-fg">{rec.label}</span>
                  <span className="block break-all font-mono text-[10px] text-fg-faint">
                    {rec.id}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDelete(rec.id)}
                  className="shrink-0 font-mono text-[10px] text-fg-faint hover:text-error"
                  aria-label={`Delete ${rec.label}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Import tab ────────────────────────────────────────────────────────────────

function ImportTab() {
  return (
    <div className="flex h-full flex-col" data-testid="import-tab">
      <header className="border-b border-border px-3 pt-3 pb-2">
        <span className="block font-mono text-[10px] uppercase tracking-wider text-fg-muted">
          Import
        </span>
      </header>
      <div className="themed-scrollbar flex-1 overflow-y-auto">
        <ImportPanel />
      </div>
    </div>
  );
}
