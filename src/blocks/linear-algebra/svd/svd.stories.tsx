import type { Meta, StoryObj } from "@storybook/nextjs";
import { BlockNode } from "~/editor/nodes/block-node";
import {
  makeStubProps,
  provenance,
  ResultPrimer,
  StoryFrame,
} from "~/editor/nodes/block-node-story-utils";

const meta: Meta<typeof BlockNode> = {
  title: "Blocks/linear-algebra/Svd",
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
                    { kind: "Matrix", m: 2, n: 2, field: "real" },
                    { kind: "Vector", n: 2, field: "real" },
                    { kind: "Matrix", m: 2, n: 2, field: "real" },
                  ],
                },
                // SVD of [[1,2],[3,4]]:
                // U ≈ [[-0.404,-0.915],[-0.915,0.404]]
                // S ≈ [5.465, 0.366]
                // V ≈ [[-0.576,-0.818],[-0.818,0.576]]
                payload: {
                  U: [
                    [-0.4045535848927383, -0.9145142956773045],
                    [-0.9145142956773045, 0.4045535848927383],
                  ],
                  S: [5.464985704219043, 0.3659661906262574],
                  V: [
                    [-0.5760484367663189, -0.8174155604703632],
                    [-0.8174155604703632, 0.5760484367663189],
                  ],
                } as unknown as number[][],
                provenance: provenance("la.svd"),
              },
            },
          },
        ]}
      />
      <BlockNode {...args} />
    </>
  ),
  args: makeStubProps("svd-story-2x2", "la.svd", {}),
};

export const ThreeByTwo: Story = {
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
                    { kind: "Matrix", m: 3, n: 3, field: "real" },
                    { kind: "Vector", n: 2, field: "real" },
                    { kind: "Matrix", m: 2, n: 2, field: "real" },
                  ],
                },
                // SVD of [[1,0],[0,2],[0,0]]:
                // U is 3×3 orthogonal, S=[2,1], V is 2×2 orthogonal
                payload: {
                  U: [
                    [0, 1, 0],
                    [1, 0, 0],
                    [0, 0, 1],
                  ],
                  S: [2, 1],
                  V: [
                    [0, 1],
                    [1, 0],
                  ],
                } as unknown as number[][],
                provenance: provenance("la.svd"),
              },
            },
          },
        ]}
      />
      <BlockNode {...args} />
    </>
  ),
  args: makeStubProps("svd-story-3x2", "la.svd", {}),
};
