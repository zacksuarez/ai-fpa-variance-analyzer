import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateSupportingEvidence,
  defaultSupportingDetailRows
} from "../lib/supporting-detail.ts";
import { calculateVariance } from "../lib/variance.ts";

const defaultTopLevelResult = calculateVariance({
  account: "Software Expense",
  period: "August 2026",
  actual: 625000,
  forecast: 500000,
  priorYear: 450000,
  materialityPercent: 10,
  materialityAmount: 50000
});

test("default support rows reconcile actual exactly", () => {
  const evidence = calculateSupportingEvidence(
    defaultSupportingDetailRows,
    defaultTopLevelResult
  );

  assert.equal(evidence.supportActualTotal, 625000);
  assert.equal(evidence.actualReconciles, true);
});

test("default support rows reconcile forecast exactly", () => {
  const evidence = calculateSupportingEvidence(
    defaultSupportingDetailRows,
    defaultTopLevelResult
  );

  assert.equal(evidence.supportForecastTotal, 500000);
  assert.equal(evidence.forecastReconciles, true);
});

test("default support rows reconcile variance exactly", () => {
  const evidence = calculateSupportingEvidence(
    defaultSupportingDetailRows,
    defaultTopLevelResult
  );

  assert.equal(evidence.supportingVarianceTotal, 125000);
  assert.equal(evidence.varianceReconciles, true);
});

test("default evidence coverage is 100%", () => {
  const evidence = calculateSupportingEvidence(
    defaultSupportingDetailRows,
    defaultTopLevelResult
  );

  assert.equal(evidence.evidenceCoveragePercent, 100);
});

test("default support row contributions match expected percentages", () => {
  const evidence = calculateSupportingEvidence(
    defaultSupportingDetailRows,
    defaultTopLevelResult
  );

  const salesforce = evidence.rows.find((row) => row.name === "Salesforce");
  const snowflake = evidence.rows.find((row) => row.name === "Snowflake");

  assert.equal(salesforce?.contributionPercent, 48);
  assert.equal(snowflake?.contributionPercent, 32);
});

test("zero support forecast safely produces null percentage", () => {
  const evidence = calculateSupportingEvidence(
    [
      {
        id: "zero",
        name: "Zero Forecast",
        actual: 10,
        forecast: 0
      }
    ],
    defaultTopLevelResult
  );

  assert.equal(evidence.rows[0].variancePercent, null);
});

test("unreconciled support produces evidenceSufficient=false", () => {
  const evidence = calculateSupportingEvidence(
    defaultSupportingDetailRows.slice(0, 3),
    defaultTopLevelResult
  );

  assert.equal(evidence.varianceReconciles, false);
  assert.equal(evidence.evidenceSufficient, false);
});

test("less than 90% coverage produces evidenceSufficient=false", () => {
  const evidence = calculateSupportingEvidence(
    [
      {
        id: "partial",
        name: "Partial",
        actual: 560000,
        forecast: 460000
      }
    ],
    defaultTopLevelResult
  );

  assert.equal(evidence.evidenceCoveragePercent, 80);
  assert.equal(evidence.evidenceSufficient, false);
});

test("full default support produces evidenceSufficient=true", () => {
  const evidence = calculateSupportingEvidence(
    defaultSupportingDetailRows,
    defaultTopLevelResult
  );

  assert.equal(evidence.evidenceSufficient, true);
});
