import test from "node:test";
import assert from "node:assert/strict";
import { calculateVariance } from "../lib/variance.ts";

test("default deterministic variance calculations remain unchanged", () => {
  const result = calculateVariance({
    account: "Software Expense",
    period: "August 2026",
    actual: 625000,
    forecast: 500000,
    priorYear: 450000,
    materialityPercent: 10,
    materialityAmount: 50000
  });

  assert.equal(result.forecastVarianceAmount, 125000);
  assert.equal(result.forecastVariancePercent, 25);
  assert.equal(result.priorYearVarianceAmount, 175000);
  assert.equal(Math.round((result.priorYearVariancePercent ?? 0) * 10) / 10, 38.9);
  assert.equal(result.forecastDirection, "Unfavorable");
  assert.equal(result.isMaterial, true);
});

test("zero denominators return null percentages instead of NaN or Infinity", () => {
  const result = calculateVariance({
    account: "Software Expense",
    period: "August 2026",
    actual: 100,
    forecast: 0,
    priorYear: 0,
    materialityPercent: 10,
    materialityAmount: 50
  });

  assert.equal(result.forecastVariancePercent, null);
  assert.equal(result.priorYearVariancePercent, null);
  assert.equal(Number.isFinite(result.forecastVarianceAmount), true);
  assert.equal(Number.isFinite(result.priorYearVarianceAmount), true);
});
