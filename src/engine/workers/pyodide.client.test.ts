import { afterEach, describe, expect, test } from "vitest";
import {
  __resetForTests,
  definiteIntegrate,
  diff,
  init,
  integrate,
  isReady,
  limit,
  mgf,
  sympify,
  taylor,
} from "./pyodide.client";

afterEach(() => {
  __resetForTests();
});

describe("pyodide.client", () => {
  test("isReady() returns false before init() is called", async () => {
    expect(await isReady()).toBe(false);
  });

  test("init() rejects with a friendly message when Worker is unavailable", async () => {
    await expect(init()).rejects.toThrow(/Worker is not available/);
  });

  test("__resetForTests() clears proxy so isReady() returns false again", async () => {
    __resetForTests();
    expect(await isReady()).toBe(false);
  });

  const workerUnavailableMsg = /Worker is not available/;

  test("sympify() surfaces Worker unavailable error before RPC", async () => {
    await expect(sympify("sin(x)", ["x"])).rejects.toThrow(workerUnavailableMsg);
  });

  test("diff() surfaces Worker unavailable error before RPC", async () => {
    await expect(diff("x**2", ["x"], "x")).rejects.toThrow(workerUnavailableMsg);
  });

  test("integrate() surfaces Worker unavailable error before RPC", async () => {
    await expect(integrate("x**2", ["x"], "x")).rejects.toThrow(workerUnavailableMsg);
  });

  test("definiteIntegrate() surfaces Worker unavailable error before RPC", async () => {
    await expect(definiteIntegrate("x**2", ["x"], "x", 0, 1)).rejects.toThrow(workerUnavailableMsg);
  });

  test("limit() surfaces Worker unavailable error before RPC", async () => {
    await expect(limit("sin(x)/x", ["x"], "x", 0)).rejects.toThrow(workerUnavailableMsg);
  });

  test("taylor() surfaces Worker unavailable error before RPC", async () => {
    await expect(taylor("sin(x)", ["x"], "x", 0, 4)).rejects.toThrow(workerUnavailableMsg);
  });

  test("mgf() surfaces Worker unavailable error before RPC", async () => {
    await expect(mgf("Normal", { mu: 0, sigma: 1 })).rejects.toThrow(workerUnavailableMsg);
  });
});
