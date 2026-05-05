"use client";

import type { Edge, Node } from "@xyflow/react";
import { useMemo, useState } from "react";
import { blockRegistry } from "~/blocks";
import type { BlockDefinition, BlockDomain, ColorToken } from "~/blocks/types";
import { TEMPLATES } from "~/lib/templates";
import { useGraphStore } from "~/store/graph-store";

const DOMAIN_LABELS: Record<BlockDomain, string> = {
  common: "Core",
  "linear-algebra": "Linear Algebra",
  statistics: "Statistics",
  calculus: "Calculus",
  discrete: "Discrete Math",
  optimization: "Optimization",
  geometry: "Geometry",
};

const DOMAIN_ORDER: BlockDomain[] = [
  "common",
  "linear-algebra",
  "statistics",
  "calculus",
  "geometry",
  "optimization",
  "discrete",
];

const COLOR_DOT: Record<ColorToken, string> = {
  source: "bg-role-source-border",
  operation: "bg-role-operation-border",
  function: "bg-role-function-border",
  visualizer: "bg-role-visualizer-border",
  stochastic: "bg-role-stochastic-border",
  control: "bg-role-control-border",
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function BlockLibrary() {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<BlockDomain>>(new Set());

  const allBlocks = useMemo(() => blockRegistry.list(), []);

  const filtered = useMemo(() => {
    if (query.trim() === "") return allBlocks;
    const q = normalize(query);
    return allBlocks.filter(
      (b) =>
        normalize(b.label).includes(q) ||
        normalize(b.id).includes(q) ||
        normalize(b.domain).includes(q),
    );
  }, [allBlocks, query]);

  const byDomain = useMemo(() => {
    const map = new Map<BlockDomain, BlockDefinition[]>();
    for (const b of filtered) {
      const list = map.get(b.domain) ?? [];
      list.push(b);
      map.set(b.domain, list);
    }
    return map;
  }, [filtered]);

  const domains = DOMAIN_ORDER.filter((d) => byDomain.has(d));

  function toggleDomain(domain: BlockDomain) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) {
        next.delete(domain);
      } else {
        next.add(domain);
      }
      return next;
    });
  }

  function handleDragStart(e: React.DragEvent, def: BlockDefinition) {
    e.dataTransfer.setData("application/mathforge-block-id", def.id);
    e.dataTransfer.effectAllowed = "copy";
  }

  return (
    <aside
      data-testid="block-library"
      className="flex h-full w-56 shrink-0 flex-col border-r border-border bg-surface"
    >
      <header className="border-b border-border px-3 pt-3 pb-2">
        <span className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-fg-muted">
          Block Library
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          placeholder="Search blocks…"
          aria-label="Search blocks"
          className="w-full rounded border border-border bg-surface-2 px-2 py-1 font-mono text-xs text-fg placeholder:text-fg-faint focus:outline-none focus:ring-1 focus:ring-role-control-border"
        />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {domains.length === 0 ? (
          <p className="px-3 py-4 text-xs text-fg-faint">No blocks match your search.</p>
        ) : (
          domains.map((domain) => {
            const blocks = byDomain.get(domain) ?? [];
            const isCollapsed = collapsed.has(domain);
            return (
              <DomainSection
                key={domain}
                domain={domain}
                blocks={blocks}
                isCollapsed={isCollapsed}
                onToggle={() => {
                  toggleDomain(domain);
                }}
                onDragStart={handleDragStart}
              />
            );
          })
        )}
      </div>
      <TemplateGallery />
    </aside>
  );
}

function DomainSection({
  domain,
  blocks,
  isCollapsed,
  onToggle,
  onDragStart,
}: {
  domain: BlockDomain;
  blocks: BlockDefinition[];
  isCollapsed: boolean;
  onToggle: () => void;
  onDragStart: (e: React.DragEvent, def: BlockDefinition) => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-1 text-left hover:bg-surface-2"
        aria-expanded={!isCollapsed}
      >
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
          {DOMAIN_LABELS[domain]}
        </span>
        <span className="font-mono text-[10px] text-fg-faint" aria-hidden="true">
          {isCollapsed ? "+" : "−"}
        </span>
      </button>
      {!isCollapsed &&
        blocks.map((def) => <BlockLibraryItem key={def.id} def={def} onDragStart={onDragStart} />)}
    </div>
  );
}

function BlockLibraryItem({
  def,
  onDragStart,
}: {
  def: BlockDefinition;
  onDragStart: (e: React.DragEvent, def: BlockDefinition) => void;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        onDragStart(e, def);
      }}
      title={`${def.id} — drag to canvas to add`}
      aria-label={`${def.label} block — drag to canvas to add`}
      className="mx-1 mb-0.5 flex w-[calc(100%-0.5rem)] cursor-grab items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-surface-2 active:cursor-grabbing"
      data-testid={`library-item-${def.id}`}
    >
      <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${COLOR_DOT[def.color]}`} />
      <span className="min-w-0 flex-1 truncate text-xs text-fg">{def.label}</span>
      {def.symbol !== undefined ? (
        <span className="shrink-0 font-mono text-[10px] text-fg-faint">{def.symbol}</span>
      ) : null}
    </button>
  );
}

function TemplateGallery() {
  const replaceGraph = useGraphStore((s) => s.replaceGraph);

  function loadTemplate(templateId: string) {
    const tpl = TEMPLATES.find((t) => t.id === templateId);
    if (tpl === undefined) return;
    const nodes = tpl.graph.nodes.map((n) => ({ ...n })) as Node[];
    const edges = tpl.graph.edges.map((e) => ({ ...e })) as Edge[];
    replaceGraph(nodes, edges, "template");
  }

  return (
    <div className="border-t border-border px-3 py-2" data-testid="template-gallery">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-fg-muted">
        Templates
      </span>
      <div className="flex flex-col gap-1">
        {TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => {
              loadTemplate(tpl.id);
            }}
            title={tpl.description}
            className="w-full rounded border border-border px-2 py-1.5 text-left hover:bg-surface-2"
            data-testid={`template-${tpl.id}`}
          >
            <span className="block text-xs font-medium text-fg">{tpl.label}</span>
            <span className="block truncate font-mono text-[10px] text-fg-faint">
              {tpl.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
