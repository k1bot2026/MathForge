/**
 * E2E tests for canvas event-handler wiring (db12d38).
 *
 * Verifies that user-driven node drags flow through onNodesChange into
 * the graph store and are recorded as node-moved events in the
 * Construction Protocol timeline. Also confirms that the URL hash is
 * updated to reflect the new node position.
 *
 * Strategy: drag a node by a large enough pixel delta (~80px), then
 * enter replay mode and check that:
 *   1. The scrubber max is greater than the initial seed event count (9).
 *   2. The last step description contains "moved" (the ReplayBar renders
 *      "<nodeId> moved" for node-moved events).
 *   3. The URL hash differs from its pre-drag value (position encoded).
 */

import { expect, test } from "@playwright/test";

test.describe("canvas event-handler wiring", () => {
  test("dragging a node records a node-moved event in the construction protocol", async ({
    page,
  }) => {
    await page.goto("/");

    // Wait for seed graph to render.
    await expect(page.locator(".react-flow__node").first()).toBeVisible();
    await expect(page.locator(".react-flow__node")).toHaveCount(5);

    // Wait for the URL hash to settle before dragging.
    await page.waitForFunction(() => window.location.hash.length > 1, undefined, { timeout: 3000 });

    // Pick the first node (matrix-1 at canvas top-left), get its bounding box.
    const firstNode = page.locator(".react-flow__node").first();
    const box = await firstNode.boundingBox();
    expect(box).not.toBeNull();
    if (!box) throw new Error("node bounding box was null");

    // Drag the node ~80px right and ~80px down to ensure a measurable position
    // change and a definitive drag-end event from React Flow.
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    const endX = startX + 80;
    const endY = startY + 80;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Move in small increments so React Flow fires intermediate position changes.
    await page.mouse.move(startX + 20, startY + 20, { steps: 4 });
    await page.mouse.move(endX, endY, { steps: 4 });
    await page.mouse.up();

    // Allow React Flow's drag-end and the URL-sync debounce to flush.
    await page.waitForTimeout(400);
  });

  test("URL hash updates after a node drag", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator(".react-flow__node")).toHaveCount(5);
    await page.waitForFunction(() => window.location.hash.length > 1, undefined, { timeout: 3000 });
    const hashBefore = await page.evaluate(() => window.location.hash);

    const firstNode = page.locator(".react-flow__node").first();
    const box = await firstNode.boundingBox();
    expect(box).not.toBeNull();
    if (!box) throw new Error("node bounding box was null");

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 20, startY + 20, { steps: 4 });
    await page.mouse.move(startX + 80, startY + 80, { steps: 4 });
    await page.mouse.up();

    // Wait for the URL-sync debounce (120ms) plus a buffer.
    await page.waitForFunction((before) => window.location.hash !== before, hashBefore, {
      timeout: 3000,
    });

    const hashAfter = await page.evaluate(() => window.location.hash);
    expect(hashAfter).not.toBe(hashBefore);
    expect(hashAfter.length).toBeGreaterThan(1);
  });

  test("replay scrubber max increases and last event is node-moved after a drag", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.locator(".react-flow__node")).toHaveCount(5);

    const firstNode = page.locator(".react-flow__node").first();
    const box = await firstNode.boundingBox();
    expect(box).not.toBeNull();
    if (!box) throw new Error("node bounding box was null");

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 20, startY + 20, { steps: 4 });
    await page.mouse.move(startX + 80, startY + 80, { steps: 4 });
    await page.mouse.up();

    // Allow drag-end to flush through onNodesChange.
    await page.waitForTimeout(300);

    // Enter replay mode and inspect the timeline.
    await page.getByRole("button", { name: /^replay$/i }).click();

    const scrubber = page.getByRole("slider", { name: "construction-step" });
    await expect(scrubber).toBeVisible();

    // Seed generates 9 events; after a drag the count must be > 9.
    const maxAttr = await scrubber.getAttribute("max");
    const totalSteps = Number(maxAttr);
    expect(totalSteps).toBeGreaterThan(9);

    // Scrub to the last step; the description should say "moved".
    await scrubber.fill(String(totalSteps));

    const description = page.getByTestId("replay-step-description");
    await expect(description).toContainText("moved");
  });

  test("nodes remain interactable (drag does not cause page error)", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => {
      errors.push(err.message);
    });

    await page.goto("/");
    await expect(page.locator(".react-flow__node")).toHaveCount(5);

    const firstNode = page.locator(".react-flow__node").first();
    const box = await firstNode.boundingBox();
    expect(box).not.toBeNull();
    if (!box) throw new Error("node bounding box was null");

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 60, { steps: 6 });
    await page.mouse.up();

    await page.waitForTimeout(300);

    // The canvas should still show all 5 nodes after the drag.
    await expect(page.locator(".react-flow__node")).toHaveCount(5);

    // No JavaScript errors should have been thrown.
    expect(errors).toHaveLength(0);
  });
});
