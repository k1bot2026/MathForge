import type { Meta, StoryObj } from "@storybook/nextjs";
import { BlockNode } from "~/editor/nodes/block-node";
import {
  makeStubProps,
  provenance,
  ResultPrimer,
  StoryFrame,
} from "~/editor/nodes/block-node-story-utils";

const meta: Meta<typeof BlockNode> = {
  title: "Blocks/linear-algebra/Eigen",
  component: BlockNode,
  decorators: [(Story) => <StoryFrame>{Story()}</StoryFrame>],
};
export default meta;

type Story = StoryObj<typeof meta>;

export const TwoByTwo: Story = {
  render: (args) => (
    <>
      <ResultPrimer
        results={[
          {
            id: (args as { id: string }).id,
            result: {
              kind: "value",
              value: {
                type: {
                  kind: "Tuple",
                  elements: [
                    { kind: "Vector", n: 2, field: "real" },
                    { kind: "Matrix", m: 2, n: 2, field: "real" },
                  ],
                },
                // Eigen of [[1,2],[2,1]]: eigenvalues [-1, 3],
                // eigenvectors: col 0 = [-0.707, 0.707], col 1 = [0.707, 0.707]
                payload: {
                  eigenvalues: [-1, 3],
                  eigenvectors: [
                    [-0.7071067811865476, 0.7071067811865476],
                    [0.7071067811865476, 0.7071067811865476],
                  ],
                } as unknown as number[][],
                provenance: provenance("la.eigen"),
              },
            },
          },
        ]}
      />
      <BlockNode {...args} />
    </>
  ),
  args: makeStubProps("eigen-story-2x2", "la.eigen", {}),
};

export const ThreeByThree: Story = {
  render: (args) => (
    <>
      <ResultPrimer
        results={[
          {
            id: (args as { id: string }).id,
            result: {
              kind: "value",
              value: {
                type: {
                  kind: "Tuple",
                  elements: [
                    { kind: "Vector", n: 3, field: "real" },
                    { kind: "Matrix", m: 3, n: 3, field: "real" },
                  ],
                },
                // Eigen of diag(1,2,3): eigenvalues [1,2,3], eigenvectors = I
                payload: {
                  eigenvalues: [1, 2, 3],
                  eigenvectors: [
                    [1, 0, 0],
                    [0, 1, 0],
                    [0, 0, 1],
                  ],
                } as unknown as number[][],
                provenance: provenance("la.eigen"),
              },
            },
          },
        ]}
      />
      <BlockNode {...args} />
    </>
  ),
  args: makeStubProps("eigen-story-3x3", "la.eigen", {}),
};
