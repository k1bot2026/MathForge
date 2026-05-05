/**
 * TDD contract: templates launcher (Phase 8 UX overhaul).
 *
 * The templates launcher lets users pick a starter graph (e.g. "rotation
 * matrix") and populates the canvas with pre-built nodes. These tests
 * are fixme until the templates launcher UX ships.
 */

import { expect, test } from "@playwright/test";

test.describe("templates launcher", () => {
  test.fixme("opening the launcher shows a list of templates", async ({ page }) => {
    await page.goto("/");

    const launcherTrigger = page.getByTestId("templates-launcher-trigger");
    await expect(launcherTrigger).toBeVisible();
    await launcherTrigger.click();

    const panel = page.getByTestId("templates-launcher-panel");
    await expect(panel).toBeVisible({ timeout: 2000 });

    // At least one template item should be present.
    const items = panel.getByTestId("template-item");
    expect(await items.count()).toBeGreaterThan(0);
  });

  test.fixme("selecting the rotation template populates the canvas with rotation nodes", async ({
    page,
  }) => {
    await page.goto("/");

    const launcherTrigger = page.getByTestId("templates-launcher-trigger");
    await launcherTrigger.click();

    const panel = page.getByTestId("templates-launcher-panel");
    await expect(panel).toBeVisible({ timeout: 2000 });

    // Select the rotation template by its test id or visible label.
    const rotationTemplate = panel
      .getByTestId("template-item-rotation")
      .or(panel.getByText(/rotation/i).first());
    await expect(rotationTemplate).toBeVisible();
    await rotationTemplate.click();

    // Canvas should now contain rotation-related nodes.
    await expect(page.locator(".react-flow__node")).toHaveCount(
      await page.locator(".react-flow__node").count(),
      { timeout: 3000 },
    );

    // At least one node should reference a rotation block.
    const rotationNode = page
      .locator(
        '[data-block-domain="geometry"][data-block-id*="rotation"], [data-testid*="rotation"]',
      )
      .first();
    await expect(rotationNode).toBeVisible({ timeout: 3000 });
  });

  test.fixme("loading a template clears the previous graph first", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".react-flow__node").first()).toBeVisible();
    const seedCount = await page.locator(".react-flow__node").count();

    const launcherTrigger = page.getByTestId("templates-launcher-trigger");
    await launcherTrigger.click();

    const panel = page.getByTestId("templates-launcher-panel");
    await expect(panel).toBeVisible({ timeout: 2000 });

    const firstTemplate = panel.getByTestId("template-item").first();
    await firstTemplate.click();

    // If a confirm dialog appears for replacing the existing graph, accept it.
    const confirmBtn = page.getByRole("button", { name: /confirm|replace|yes/i });
    if (await confirmBtn.isVisible({ timeout: 500 })) {
      await confirmBtn.click();
    }

    // The new node count should differ from the seed (template replaces old graph).
    await page.waitForTimeout(500);
    const newCount = await page.locator(".react-flow__node").count();
    expect(newCount).not.toBe(seedCount);
  });
});
