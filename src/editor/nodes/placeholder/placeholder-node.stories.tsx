import type { Meta, StoryObj } from "@storybook/nextjs";
import { type NodeProps, ReactFlowProvider } from "@xyflow/react";
import { PlaceholderNode } from "./placeholder-node";

const stubNodeProps = {
  id: "story-placeholder",
  type: "placeholder",
  data: {},
  selected: false,
  isConnectable: true,
  zIndex: 1,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
  dragging: false,
} as unknown as NodeProps;

const meta: Meta<typeof PlaceholderNode> = {
  title: "Editor/Nodes/Placeholder",
  component: PlaceholderNode,
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

export const Default: Story = {
  args: stubNodeProps,
};
