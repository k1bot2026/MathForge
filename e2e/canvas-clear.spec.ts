/**
 * TDD contract: clear canvas action (Phase 8 UX overhaul).
 *
 * The clear-canvas button removes all nodes and edges after a
 * confirmation step. These tests are fixme until the clear UX lands.
 */

import { expect, test } from "@playwright/test";

test.describe("canvas — clear action", () => {
  test.fixme("clear button removes all nodes after confirmation", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".react-flow__node").first()).toBeVisible();
    expect(await page.locator(".react-flow__node").count()).toBeGreaterThan(0);

    const clearBtn = page.getByTestId("canvas-clear-button");
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();

    // Confirmation dialog must appear.
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible({ timeout: 2000 });

    const confirmBtn = dialog.getByRole("button", { name: /confirm|yes|clear/i });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    await expect(page.locator(".react-flow__node")).toHaveCount(0, { timeout: 3000 });
  });

  test.fixme("cancel in confirm dialog leaves nodes intact", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".react-flow__node").first()).toBeVisible();
    const initialCount = await page.locator(".react-flow__node").count();

    const clearBtn = page.getByTestId("canvas-clear-button");
    await clearBtn.click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible({ timeout: 2000 });

    const cancelBtn = dialog.getByRole("button", { name: /cancel|no/i });
    await cancelBtn.click();

    // Node count must be unchanged.
    await expect(page.locator(".react-flow__node")).toHaveCount(initialCount, { timeout: 1000 });
  });

  test.fixme("clear also removes all edges", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".react-flow__edge").first()).toBeVisible();

    const clearBtn = page.getByTestId("canvas-clear-button");
    await clearBtn.click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible({ timeout: 2000 });
    await dialog.getByRole("button", { name: /confirm|yes|clear/i }).click();

    await expect(page.locator(".react-flow__node")).toHaveCount(0, { timeout: 3000 });
    await expect(page.locator(".react-flow__edge")).toHaveCount(0, { timeout: 1000 });
  });
});
