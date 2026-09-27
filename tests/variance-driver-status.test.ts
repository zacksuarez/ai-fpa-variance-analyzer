import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateSupportingEvidence,
  defaultSupportingDetailRows
} from "../lib/supporting-detail.ts";
import { calculateVariance } from "../lib/variance.ts";
import { getVarianceDriverStatus } from "../lib/variance-driver-status.ts";

test("default V4 evidence identifies contributors without claiming a causal root cause", () => {
  const variance = calculateVariance({
    account: "Software Expense",
    period: "August 2026",
    actual: 625000,
    forecast: 500000,
    priorYear: 450000,
    materialityPercent: 10,
    materialityAmount: 50000
  });
  const evidence = calculateSupportingEvidence(
    defaultSupportingDetailRows,
    variance
  );

  assert.equal(evidence.evidenceSufficient, true);
  assert.equal(
    getVarianceDriverStatus(evidence.evidenceSufficient),
    "CONTRIBUTORS IDENTIFIED — underlying causal drivers remain unresolved."
  );
});

test("insufficient contributor evidence keeps both layers unresolved", () => {
  assert.equal(
    getVarianceDriverStatus(false),
    "CONTRIBUTORS UNRESOLVED — supporting evidence is insufficient, and underlying causal drivers remain unresolved."
  );
});
