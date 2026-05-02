import { expect, test } from "@playwright/test";

test.describe("home canvas / Phase-1 seed graph", () => {
  test("renders the seed pipeline and the matvec output equals [2, 1]", async ({ page }) => {
    await page.goto("/");

    const matrixNode = page.getByTestId("block-la.matrix2x2");
    const vectorNode = page.getByTestId("block-la.vector2");
    const matvecNode = page.getByTestId("block-la.matvec");
    const constantNode = page.getByTestId("block-core.constant");

    await expect(matrixNode).toBeVisible();
    await expect(vectorNode).toBeVisible();
    await expect(matvecNode).toBeVisible();
    await expect(constantNode).toBeVisible();

    // Seed: M = [[2,0],[0,1]] (scale x by 2), v = (1, 1) ⇒ M·v = (2, 1).
    await expect(matvecNode.getByTestId("block-value")).toHaveText("[2, 1]");

    // The standalone constant still computes to its seed value of 42.
    await expect(constantNode.getByTestId("block-value")).toHaveText("42");

    // The viz.unit-grid renders an SVG (we don't pixel-compare in Phase 1).
    const unitGrid = page.getByTestId("block-viz.unit-grid");
    await expect(unitGrid).toBeVisible();
    await expect(unitGrid.getByTestId("unit-grid-svg")).toBeVisible();
  });
});
