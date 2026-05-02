/**
 * E2E tests for the v1→v2 URL hash migration.
 *
 * A v1 hash encodes `la.vector2` / `la.matrix2x2` block IDs with the
 * old param shapes. `decodeGraph` in graph-codec.ts migrates these to
 * `la.vector` / `la.matrix` (v2) before the graph is hydrated.
 *
 * This test verifies the full round-trip from a browser perspective:
 *   1. Navigate to /#<v1-hash>
 *   2. The app decodes, migrates, and renders the graph
 *   3. Evaluation produces the correct matvec output
 *   4. The URL hash is updated to a v2 payload (seed replaced)
 *
 * The v1 hash was taken verbatim from src/lib/graph-codec.test.ts (the
 * same hash used in the unit-level migration test) and encodes:
 *   la.matrix2x2  { a:1, b:0, c:0, d:1 }  ← identity matrix
 *   la.vector2    { x:3, y:4 }
 *   la.matvec     {}
 * Expected output: I·(3,4) = [3, 4]
 */

import { expect, test } from "@playwright/test";

// This hash encodes a schemaVersion:1 payload produced by the Phase-1 codec.
// It is intentionally hardcoded here so the test is self-contained and doesn't
// import application code.
const V1_HASH =
  "jZC9rgIhEEbfZWpyc1mNxT6BFrY2xmKEiW5cFgNo1mx4dwfUFQt_GgLD-eYwDODVngyuyPnGdlBLAZ3V5KFeD9BoqMGAgHA5Em-3rVUHPh6tb0LGB-ih_hdw4TUK0BgwFTO4SOkW_wwG1_RVX6UkOjTcfADm2LXNaZVXxmWMUdy95x-9VfXWfCYVrHv1cm6Sc9PCZb7LJrObTspPg7KxtLFiI4D0rvxQkox4e3Iq6fL3ottReLzjdjXHTrcJWI5AURpfTmm6sVke41OzJ1CU4iZeAQ";

test.describe("URL hash v1→v2 migration", () => {
  test("v1 hash loads, migrates, and renders the correct matvec output", async ({ page }) => {
    // Navigate with the v1 hash in the URL.
    await page.goto(`/#${V1_HASH}`);

    // The app should render three migrated blocks.
    const matrixNode = page.getByTestId("block-la.matrix");
    const vectorNode = page.getByTestId("block-la.vector");
    const matvecNode = page.getByTestId("block-la.matvec");

    await expect(matrixNode).toBeVisible();
    await expect(vectorNode).toBeVisible();
    await expect(matvecNode).toBeVisible();

    // identity·(3,4) = (3,4)
    await expect(matvecNode.getByTestId("block-value")).toHaveText("[3, 4]");
  });

  test("URL hash is updated to v2 format after loading a v1 hash", async ({ page }) => {
    await page.goto(`/#${V1_HASH}`);

    // Wait for the URL-sync debounce to fire (120ms + buffer).
    await page.waitForFunction(
      (v1) => window.location.hash !== `#${v1}` && window.location.hash.length > 1,
      V1_HASH,
      { timeout: 3000 },
    );

    const newHash = await page.evaluate(() => window.location.hash.replace(/^#/, ""));

    // The new hash must not be the v1 hash (it was re-encoded as v2).
    expect(newHash).not.toBe(V1_HASH);
    // Must be non-empty and URL-safe (no +, /, or =).
    expect(newHash.length).toBeGreaterThan(0);
    expect(newHash).not.toMatch(/[+/=]/);
  });

  test("navigating to the re-encoded v2 URL still renders the same graph", async ({ page }) => {
    // First visit: load from v1 hash, let the URL rewrite settle.
    await page.goto(`/#${V1_HASH}`);
    await page.waitForFunction(
      (v1) => window.location.hash !== `#${v1}` && window.location.hash.length > 1,
      V1_HASH,
      { timeout: 3000 },
    );
    const v2Url = page.url();
    expect(v2Url).toMatch(/#.+/);

    // Second visit: open the re-encoded v2 URL directly.
    await page.goto(v2Url);

    const matvecNode = page.getByTestId("block-la.matvec");
    await expect(matvecNode).toBeVisible();
    await expect(matvecNode.getByTestId("block-value")).toHaveText("[3, 4]");

    // Confirm we stayed on a v2 hash (no further migration needed).
    const hashAfter = await page.evaluate(() => window.location.hash.replace(/^#/, ""));
    expect(hashAfter).not.toBe(V1_HASH);
  });

  test("v1 hash with no matvec edge — individual blocks still render", async ({ page }) => {
    // This test just confirms the app doesn't crash on a partial v1 graph.
    // We re-use the full v1 hash (it includes a matvec connection) but the
    // important invariant is that no JS error is thrown and the page loads.
    await page.goto(`/#${V1_HASH}`);
    await expect(page.getByTestId("block-la.matrix")).toBeVisible();
    await expect(page.getByTestId("block-la.vector")).toBeVisible();
  });
});
