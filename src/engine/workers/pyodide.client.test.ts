import { afterEach, describe, expect, test } from "vitest";
import { __resetForTests, init, isReady } from "./pyodide.client";

afterEach(() => {
  __resetForTests();
});

describe("pyodide.client", () => {
  test("isReady() returns false before init() is called", async () => {
    expect(await isReady()).toBe(false);
  });

  test("init() rejects with a friendly message when Worker is unavailable", async () => {
    // jsdom doesn't provide Worker, so init() must surface a typed
    // error rather than throwing some opaque ReferenceError. This is
    // the contract that lets server-rendered code call init() safely.
    await expect(init()).rejects.toThrow(/Worker is not available/);
  });
});
