import { describe, expect, test } from "vitest";
import { multiply } from "./mathjs-adapter";

describe("mathjs-adapter / multiply", () => {
  test("[[1,2],[3,4]] · [[5,6],[7,8]] = [[19,22],[43,50]]", () => {
    expect(
      multiply(
        [
          [1, 2],
          [3, 4],
        ],
        [
          [5, 6],
          [7, 8],
        ],
      ),
    ).toEqual([
      [19, 22],
      [43, 50],
    ]);
  });

  test("identity: A · I = A on a 3×3 integer matrix", () => {
    const A = [
      [2, -1, 3],
      [0, 5, 1],
      [4, 4, -2],
    ];
    const I = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
    expect(multiply(A, I)).toEqual(A);
  });
});
