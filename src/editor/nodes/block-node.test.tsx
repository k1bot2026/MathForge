import { render, screen } from "@testing-library/react";
import { type NodeProps, ReactFlowProvider } from "@xyflow/react";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { useGraphStore } from "~/store/graph-store";
import { BlockNode } from "./block-node";

const initialState = useGraphStore.getState();

beforeEach(() => {
  useGraphStore.setState(initialState, true);
});

afterEach(() => {
  useGraphStore.setState(initialState, true);
});

const stubProps = (id: string, blockId: string) =>
  ({
    id,
    type: "block",
    data: { blockId, params: { value: 0 } },
    selected: false,
    isConnectable: true,
    zIndex: 1,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    dragging: false,
  }) as unknown as NodeProps;

describe("BlockNode", () => {
  test("renders an unknown-block fallback when blockId isn't registered", () => {
    render(
      <ReactFlowProvider>
        <BlockNode {...stubProps("n1", "does.not.exist")} />
      </ReactFlowProvider>,
    );
    expect(screen.getByTestId("unknown-block-n1")).toHaveTextContent(
      "Unknown block: does.not.exist",
    );
  });

  test("renders the registered constant block's label and 'computing' state when no result", () => {
    render(
      <ReactFlowProvider>
        <BlockNode {...stubProps("c1", "core.constant")} />
      </ReactFlowProvider>,
    );
    expect(screen.getByTestId("block-core.constant")).toBeInTheDocument();
    expect(screen.getByText("Constant")).toBeInTheDocument();
    expect(screen.getByText(/computing/i)).toBeInTheDocument();
  });

  test("renders the value when a result is present in the store", () => {
    useGraphStore.getState().setResults(
      new Map([
        [
          "c1",
          {
            kind: "value" as const,
            value: {
              type: {
                kind: "Scalar" as const,
                field: "real" as const,
                precision: "exact" as const,
              },
              payload: 42,
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
    render(
      <ReactFlowProvider>
        <BlockNode {...stubProps("c1", "core.constant")} />
      </ReactFlowProvider>,
    );
    expect(screen.getByTestId("block-value")).toHaveTextContent("42");
  });

  test("renders the error message when the result is an error", () => {
    useGraphStore.getState().setResults(
      new Map([
        [
          "c1",
          {
            kind: "error" as const,
            error: { nodeId: "c1", message: 'Required input "a" is not connected' },
          },
        ],
      ]),
    );
    render(
      <ReactFlowProvider>
        <BlockNode {...stubProps("c1", "core.constant")} />
      </ReactFlowProvider>,
    );
    const err = screen.getByTestId("block-error");
    expect(err).toHaveTextContent(/Required input/);
  });
});
