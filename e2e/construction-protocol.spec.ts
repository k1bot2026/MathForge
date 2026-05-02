import { expect, test } from "@playwright/test";

// Construction Protocol — full record → scrub → re-render cycle.
//
// The Phase-1 seed graph synthesizes 9 events (1 graph-reset + 5
// node-added + 3 edge-added). Entering replay mode resets the cursor
// to step 0 and projects the canvas to empty. Scrubbing forward
// reveals nodes in the order they were synthesized; exiting replay
// mode restores the live graph.

test.describe("construction protocol", () => {
  test("record, scrub, and re-render the seed pipeline", async ({ page }) => {
    await page.goto("/");

    // Live graph: the seed pipeline renders 5 blocks.
    await expect(page.locator(".react-flow__node")).toHaveCount(5);

    // Enter replay mode.
    await page.getByRole("button", { name: /^replay$/i }).click();

    // Bottom-bar timeline appears, canvas projects to empty.
    const scrubber = page.getByRole("slider", { name: "construction-step" });
    await expect(scrubber).toBeVisible();
    await expect(scrubber).toHaveAttribute("max", "9");
    await expect(page.locator(".react-flow__node")).toHaveCount(0);

    // Scrub past graph-reset + 3 node-added events; canvas renders 3 nodes.
    await scrubber.fill("4");
    await expect(page.locator(".react-flow__node")).toHaveCount(3);

    // Scrub to the end; full seed graph projected.
    await scrubber.fill("9");
    await expect(page.locator(".react-flow__node")).toHaveCount(5);

    // Press play from step 0 — interval at 400 ms; after ~1.6 s we
    // expect the cursor to have advanced to at least 3.
    await scrubber.fill("0");
    await expect(page.locator(".react-flow__node")).toHaveCount(0);
    await page.getByRole("button", { name: /^play$/i }).click();
    await page.waitForTimeout(1700);
    const nodeCount = await page.locator(".react-flow__node").count();
    expect(nodeCount).toBeGreaterThanOrEqual(2);

    // Exit replay mode; the full live graph is restored.
    await page.getByRole("button", { name: /exit replay/i }).click();
    await expect(page.locator(".react-flow__node")).toHaveCount(5);
  });
});
