import type { Meta, StoryObj } from "@storybook/nextjs";
import { BlockNode } from "~/editor/nodes/block-node";
import {
  makeStubProps,
  provenance,
  ResultPrimer,
  StoryFrame,
} from "~/editor/nodes/block-node-story-utils";

const meta: Meta<typeof BlockNode> = {
  title: "Blocks/linear-algebra/Qr",
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
                    { kind: "Matrix", m: 2, n: 2, field: "real" },
                  ],
                },
                // QR of [[1,2],[3,4]]:
                // Q ≈ [[-0.316,-0.949],[-0.949,0.316]], R ≈ [[-3.162,-4.427],[0,0.632]]
                payload: {
                  Q: [
                    [-0.3162277660168379, -0.9486832980505138],
                    [-0.9486832980505138, 0.3162277660168379],
                  ],
                  R: [
                    [-3.1622776601683795, -4.427188724235731],
                    [0, 0.6324555320336759],
                  ],
                } as unknown as number[][],
                provenance: provenance("la.qr"),
              },
            },
          },
        ]}
      />
      <BlockNode {...args} />
    </>
  ),
  args: makeStubProps("qr-story-2x2", "la.qr", {}),
};
