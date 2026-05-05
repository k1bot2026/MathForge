/**
 * TDD contract: empty canvas state (Phase 8 UX overhaul).
 *
 * When all nodes are removed, the canvas should render an empty-state
 * element (e.g. a prompt to add a first block). These tests are fixme
 * until the empty-state UX component lands.
 */

import { expect, test } from "@playwright/test";

test.describe("canvas — empty state", () => {
  test.fixme("shows an empty-state prompt when no nodes exist", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".react-flow__node").first()).toBeVisible();

    // Clear canvas via the clear action.
    const clearBtn = page.getByTestId("canvas-clear-button");
    await clearBtn.click();

    // Confirm the destructive dialog if present.
    const confirmBtn = page.getByRole("button", { name: /confirm|yes|clear/i });
    if (await confirmBtn.isVisible({ timeout: 500 })) {
      await confirmBtn.click();
    }

    await expect(page.locator(".react-flow__node")).toHaveCount(0, { timeout: 3000 });
    await expect(page.getByTestId("canvas-empty-state")).toBeVisible();
  });

  test.fixme("empty-state has a CTA that opens the block library", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".react-flow__node").first()).toBeVisible();

    const clearBtn = page.getByTestId("canvas-clear-button");
    await clearBtn.click();

    const confirmBtn = page.getByRole("button", { name: /confirm|yes|clear/i });
    if (await confirmBtn.isVisible({ timeout: 500 })) {
      await confirmBtn.click();
    }

    await expect(page.locator(".react-flow__node")).toHaveCount(0, { timeout: 3000 });

    // CTA inside the empty state should open the library.
    const cta = page.getByTestId("canvas-empty-state-cta");
    await expect(cta).toBeVisible();
    await cta.click();

    await expect(page.getByTestId("block-library-panel")).toBeVisible({ timeout: 2000 });
  });
});
