import { expect, test } from "@playwright/test";

test("URL hash round-trips the graph (edit → reload → identical)", async ({ page }) => {
  await page.goto("/");

  // Wait for the seed graph + auto-evaluate to settle.
  const matvecValue = page.getByTestId("block-la.matvec").getByTestId("block-value");
  await expect(matvecValue).toHaveText("[2, 1]");

  // The hash should be populated after the URL-sync hook's debounce window
  // (~120ms). Give it a small buffer.
  await page.waitForFunction(() => window.location.hash.length > 1, undefined, { timeout: 2000 });

  // Edit a parameter via the inspector to make the graph non-default.
  await page.getByTestId("block-la.matrix2x2").click();
  const aField = page.getByTestId("inspector-panel").getByLabel("a (row 0, col 0)");
  await aField.fill("4");
  await aField.blur();
  await expect(matvecValue).toHaveText("[4, 1]");

  // Wait for the new hash to be written.
  await page.waitForFunction(() => window.location.hash.length > 1, undefined, { timeout: 2000 });
  const sharedUrl = page.url();
  expect(sharedUrl).toMatch(/#.+/);

  // Open the shared URL fresh and confirm matvec recomputes to [4, 1].
  await page.goto(sharedUrl);
  await expect(page.getByTestId("block-la.matvec").getByTestId("block-value")).toHaveText("[4, 1]");
});
