import { expect, test } from "@playwright/test";

test("home page mounts the canvas with the seed Constant block displaying its value", async ({
  page,
}) => {
  await page.goto("/");
  const node = page.getByTestId("block-core.constant");
  await expect(node).toBeVisible();
  await expect(node).toContainText("Constant");
  // The seed value is 42 — wait for the auto-evaluator to fill it in.
  await expect(node.getByTestId("block-value")).toHaveText("42");
});
