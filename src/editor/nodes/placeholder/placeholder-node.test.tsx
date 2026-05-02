import { render, screen } from "@testing-library/react";
import { type NodeProps, ReactFlowProvider } from "@xyflow/react";
import { describe, expect, test } from "vitest";
import { PlaceholderNode } from "./placeholder-node";

const stubNodeProps = {
  id: "test-placeholder",
  type: "placeholder",
  data: {},
  selected: false,
  isConnectable: true,
  zIndex: 1,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
  dragging: false,
} as unknown as NodeProps;

describe("PlaceholderNode", () => {
  test("renders the Hello block label with the test id", () => {
    render(
      <ReactFlowProvider>
        <PlaceholderNode {...stubNodeProps} />
      </ReactFlowProvider>,
    );
    const node = screen.getByTestId("placeholder-node");
    expect(node).toBeInTheDocument();
    expect(node).toHaveTextContent("Hello block");
  });
});
