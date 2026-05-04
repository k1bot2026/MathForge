import type { BlockDefinition } from "~/blocks/types";
import type { SetPayload } from "~/math/types";
import { SetOpError, setCartesianProduct } from "../set-ops";

const SET_INTEGER = {
  kind: "Set",
  element: { kind: "Scalar", field: "integer", precision: "exact" },
} as const;

export const CartesianProductBlock: BlockDefinition = {
  id: "discrete.cartesian-product",
  label: "Cartesian Product",
  symbol: "×",
  category: "operation",
  domain: "discrete",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    { id: "A", label: "A", type: SET_INTEGER },
    { id: "B", label: "B", type: SET_INTEGER },
  ],
  outputs: [
    {
      id: "S",
      label: "A × B",
      type: {
        kind: "Set",
        element: {
          kind: "Tuple",
          elements: [
            { kind: "Scalar", field: "integer", precision: "exact" },
            { kind: "Scalar", field: "integer", precision: "exact" },
          ],
        },
      },
    },
  ],
  compute(inputs) {
    const { A, B } = inputs;
    if (A === undefined || B === undefined) {
      throw new SetOpError("discrete.cartesian-product: A and B inputs are required");
    }
    return setCartesianProduct(A, B);
  },
  explain: {
    what: "Cartesian product: all ordered pairs (a, b) with a ∈ A and b ∈ B.",
    why: "Foundation for combinatorial construction — feeds downstream enumeration, permutation, and relation-building blocks.",
    effect: (_inputs, output) => {
      const payload = output.payload as SetPayload;
      return `A × B has ${String(payload.length)} pair${payload.length === 1 ? "" : "s"}.`;
    },
  },
};
