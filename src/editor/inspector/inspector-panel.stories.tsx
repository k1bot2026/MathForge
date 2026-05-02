import type { Meta, StoryObj } from "@storybook/nextjs";
import { useEffect } from "react";
import type { EvalResult } from "~/engine/types";
import { useGraphStore } from "~/store/graph-store";
import { useUiStore } from "~/store/ui-store";
import { InspectorPanel } from "./inspector-panel";

const valueResult: EvalResult = {
  kind: "value",
  value: {
    type: { kind: "Scalar", field: "real", precision: "exact" },
    payload: 42,
    provenance: { blockId: "core.constant", inputs: [], computedAt: 0, engine: "native" },
  },
};

const errorResult: EvalResult = {
  kind: "error",
  error: { nodeId: "constant-1", message: "Type mismatch: expected Matrix, got Scalar" },
};

type StateName = "computing" | "value" | "warn" | "error" | "unknown";

function StateSeed({
  state,
  selectedId = "constant-1",
  width,
  tab,
}: {
  state: StateName;
  selectedId?: string;
  width?: number;
  tab?: "what" | "why" | "effect" | "impact";
}) {
  useEffect(() => {
    useUiStore.getState().reset();
    if (width !== undefined) useUiStore.getState().setInspectorWidth(width);
    if (tab !== undefined) useUiStore.getState().setActiveExplanationTab(tab);

    if (state === "unknown") {
      useGraphStore.getState().addNode({
        id: "ghost",
        type: "block",
        position: { x: 0, y: 0 },
        data: { blockId: "not.a.block", params: {} },
      });
      useGraphStore.getState().setSelectedNodeId("ghost");
      useGraphStore.getState().setResults(new Map());
      return;
    }

    useGraphStore.getState().setSelectedNodeId(selectedId);
    if (state === "computing") {
      useGraphStore.getState().setResults(new Map());
    } else if (state === "value" || state === "warn") {
      useGraphStore.getState().setResults(new Map([[selectedId, valueResult]]));
    } else if (state === "error") {
      useGraphStore.getState().setResults(new Map([[selectedId, errorResult]]));
    }
  }, [state, selectedId, width, tab]);
  return null;
}

const meta: Meta<typeof InspectorPanel> = {
  component: InspectorPanel,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="relative h-[640px] w-[720px] bg-bg">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof InspectorPanel>;

export const Computing: Story = {
  render: () => (
    <>
      <StateSeed state="computing" />
      <InspectorPanel />
    </>
  ),
};

export const Value: Story = {
  render: () => (
    <>
      <StateSeed state="value" />
      <InspectorPanel />
    </>
  ),
};

export const Error_: Story = {
  name: "Error",
  render: () => (
    <>
      <StateSeed state="error" />
      <InspectorPanel />
    </>
  ),
};

export const Unknown: Story = {
  render: () => (
    <>
      <StateSeed state="unknown" />
      <InspectorPanel />
    </>
  ),
};

export const ResizeMin: Story = {
  render: () => (
    <>
      <StateSeed state="value" width={320} />
      <InspectorPanel />
    </>
  ),
};

export const ResizeMax: Story = {
  render: () => (
    <>
      <StateSeed state="value" width={520} />
      <InspectorPanel />
    </>
  ),
};

export const TabPersistedToEffect: Story = {
  name: "Tab persisted to Effect",
  render: () => (
    <>
      <StateSeed state="value" tab="effect" />
      <InspectorPanel />
    </>
  ),
};
