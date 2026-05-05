/**
 * TDD contract: block library panel drag-to-canvas (Phase 8 UX overhaul).
 *
 * When a block is dragged from the library panel onto the canvas, a new
 * React Flow node should appear. These tests are fixme until the block
 * library drag-and-drop UX lands.
 */

import { expect, test } from "@playwright/test";

test.describe("block library — drag to canvas", () => {
  test.fixme("dragging a block from the library creates a new node on the canvas", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator(".react-flow__node").first()).toBeVisible();

    const initialCount = await page.locator(".react-flow__node").count();

    // Open the library panel if it has a trigger.
    const libraryTrigger = page.getByTestId("block-library-open");
    if (await libraryTrigger.isVisible()) {
      await libraryTrigger.click();
    }

    // Locate the first draggable library item.
    const libraryItem = page.getByTestId("library-item").first();
    await expect(libraryItem).toBeVisible();

    // Drag onto the centre of the canvas.
    const canvas = page.locator(".react-flow__pane");
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error("canvas bounding box not found");

    await libraryItem.dragTo(canvas, {
      targetPosition: { x: canvasBox.width / 2, y: canvasBox.height / 2 },
    });

    // A new node should have been added.
    await expect(page.locator(".react-flow__node")).toHaveCount(initialCount + 1, {
      timeout: 3000,
    });
  });

  test.fixme("dropped block appears near the drop position on the canvas", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".react-flow__node").first()).toBeVisible();

    const libraryTrigger = page.getByTestId("block-library-open");
    if (await libraryTrigger.isVisible()) {
      await libraryTrigger.click();
    }

    const libraryItem = page.getByTestId("library-item").first();
    await expect(libraryItem).toBeVisible();

    const canvas = page.locator(".react-flow__pane");
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error("canvas bounding box not found");

    await libraryItem.dragTo(canvas, { targetPosition: { x: 100, y: 100 } });

    // The newest node's data-id attribute should be present.
    const newNode = page.locator(".react-flow__node").last();
    await expect(newNode).toBeVisible({ timeout: 3000 });
  });
});
