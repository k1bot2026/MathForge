import { expect, test } from "@playwright/test";

test("home page renders the Hello block on the React Flow canvas", async ({ page }) => {
  await page.goto("/");
  const node = page.getByTestId("placeholder-node");
  await expect(node).toBeVisible();
  await expect(node).toContainText("Hello block");
});
