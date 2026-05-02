import type { Meta, StoryObj } from "@storybook/nextjs";
import { type NodeProps, ReactFlowProvider } from "@xyflow/react";
import { useEffect } from "react";
import { useGraphStore } from "~/store/graph-store";
import { BlockNode } from "./block-node";

const stubProps = (id: string, blockId: string, params: Record<string, unknown> = {}) =>
  ({
    id,
    type: "block",
    data: { blockId, params },
    selected: false,
    isConnectable: true,
    zIndex: 1,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    dragging: false,
  }) as unknown as NodeProps;

function ResultPrimer({ nodeId, payload }: { nodeId: string; payload?: number | undefined }) {
  useEffect(() => {
    if (payload === undefined) {
      useGraphStore.getState().setResults(new Map());
      return;
    }
    useGraphStore.getState().setResults(
      new Map([
        [
          nodeId,
          {
            kind: "value" as const,
            value: {
              type: {
                kind: "Scalar" as const,
                field: "real" as const,
                precision: "exact" as const,
              },
              payload,
              provenance: {
                blockId: "core.constant",
                inputs: [],
                computedAt: 0,
                engine: "native" as const,
              },
            },
          },
        ],
      ]),
    );
  }, [nodeId, payload]);
  return null;
}

const meta: Meta<typeof BlockNode> = {
  title: "Editor/Nodes/Block",
  component: BlockNode,
  decorators: [
    (Story) => (
      <ReactFlowProvider>
        <div className="bg-bg p-12">
          <Story />
        </div>
      </ReactFlowProvider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const ConstantWithValue: Story = {
  render: (args) => (
    <>
      <ResultPrimer nodeId={(args as NodeProps).id} payload={42} />
      <BlockNode {...args} />
    </>
  ),
  args: stubProps("c1", "core.constant", { value: 42 }),
};

export const ConstantComputing: Story = {
  render: (args) => (
    <>
      <ResultPrimer nodeId={(args as NodeProps).id} />
      <BlockNode {...args} />
    </>
  ),
  args: stubProps("c2", "core.constant", { value: 0 }),
};

export const UnknownBlock: Story = {
  args: stubProps("u1", "does.not.exist"),
};
