import { expect, test } from "@playwright/test";

test("clicking a block opens the inspector and editing params triggers re-evaluation", async ({
  page,
}) => {
  await page.goto("/");

  // Click the matrix-1 block to select it.
  await page.getByTestId("block-la.matrix2x2").click();
  const inspector = page.getByTestId("inspector-panel");
  await expect(inspector).toBeVisible();
  await expect(inspector.getByText("Matrix (2×2)")).toBeVisible();

  // Bump matrix entry "a" from 2 to 3 — matvec should jump from [2, 1] to [3, 1].
  const aField = inspector.getByLabel("a (row 0, col 0)");
  await aField.fill("3");
  await aField.blur();

  await expect(page.getByTestId("block-la.matvec").getByTestId("block-value")).toHaveText("[3, 1]");

  // Close button hides the inspector.
  await inspector.getByTestId("inspector-close").click();
  await expect(page.getByTestId("inspector-panel")).toHaveCount(0);
});
