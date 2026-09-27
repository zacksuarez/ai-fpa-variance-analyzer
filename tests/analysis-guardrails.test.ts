import test from "node:test";
import assert from "node:assert/strict";
import { evaluateAnalysisGuardrails } from "../lib/analysis-guardrails.ts";
import {
  calculateSupportingEvidence,
  defaultSupportingDetailRows
} from "../lib/supporting-detail.ts";
import { calculateVariance } from "../lib/variance.ts";
import {
  defaultEvidence,
  defaultVariance,
  validAnalysis
} from "./helpers/analysis-fixtures.ts";

const defaultContext = {
  variance: defaultVariance,
  supportingEvidence: defaultEvidence,
  causalEvidenceAvailable: false
};

test("valid structured analysis passes deterministic business guardrails", () => {
  assert.deepEqual(evaluateAnalysisGuardrails(validAnalysis, defaultContext), {
    passed: true,
    failures: []
  });
});

test("unsupported root cause is rejected despite sufficient contributor evidence", () => {
  const result = evaluateAnalysisGuardrails(
    { ...validAnalysis, rootCauseKnown: true },
    defaultContext
  );

  assert.equal(result.passed, false);
  assert.ok(result.failures.includes("UNSUPPORTED_ROOT_CAUSE"));
});

test("invented evidence-based driver is rejected", () => {
  const result = evaluateAnalysisGuardrails(
    {
      ...validAnalysis,
      evidenceBasedDrivers: [
        {
          name: "Invented Vendor",
          varianceDollars: 60000,
          contributionPercent: 48,
          contributionSummary: "Unsupported vendor claim."
        }
      ]
    },
    defaultContext
  );

  assert.equal(result.passed, false);
  assert.ok(result.failures.includes("INVENTED_DRIVER"));
});

test("contradictory driver contribution is rejected", () => {
  const result = evaluateAnalysisGuardrails(
    {
      ...validAnalysis,
      evidenceBasedDrivers: [
        {
          ...validAnalysis.evidenceBasedDrivers[0],
          contributionPercent: 99
        }
      ]
    },
    defaultContext
  );

  assert.equal(result.passed, false);
  assert.ok(result.failures.includes("DRIVER_CONTRIBUTION_MISMATCH"));
});

test("insufficient evidence cannot be reported as sufficient", () => {
  const partialEvidence = calculateSupportingEvidence(
    defaultSupportingDetailRows.slice(0, 1),
    defaultVariance
  );
  const result = evaluateAnalysisGuardrails(validAnalysis, {
    variance: defaultVariance,
    supportingEvidence: partialEvidence
  });

  assert.equal(result.passed, false);
  assert.ok(result.failures.includes("CONTRIBUTOR_SUFFICIENCY_MISMATCH"));
  assert.ok(result.failures.includes("RECONCILIATION_MISMATCH"));
});

test("failed actual and forecast reconciliation cannot be reported as reconciled", () => {
  const evidence = calculateSupportingEvidence(
    [
      {
        id: "variance-only",
        name: "Variance Only",
        actual: 600000,
        forecast: 475000
      }
    ],
    defaultVariance
  );
  const result = evaluateAnalysisGuardrails(
    {
      ...validAnalysis,
      evidenceBasedDrivers: [
        {
          name: "Variance Only",
          varianceDollars: 125000,
          contributionPercent: 100,
          contributionSummary: "The row explains the variance amount."
        }
      ]
    },
    { variance: defaultVariance, supportingEvidence: evidence }
  );

  assert.equal(evidence.varianceReconciles, true);
  assert.equal(evidence.actualReconciles, false);
  assert.equal(evidence.forecastReconciles, false);
  assert.equal(result.passed, false);
  assert.ok(result.failures.includes("RECONCILIATION_MISMATCH"));
});

test("non-material variance cannot be represented as material", () => {
  const variance = calculateVariance({
    account: "Software Expense",
    period: "August 2026",
    actual: 505,
    forecast: 500,
    priorYear: 500,
    materialityPercent: 10,
    materialityAmount: 100
  });
  const evidence = calculateSupportingEvidence(
    [{ id: "support", name: "Support", actual: 505, forecast: 500 }],
    variance
  );
  const result = evaluateAnalysisGuardrails(
    {
      ...validAnalysis,
      evidenceBasedDrivers: [
        {
          name: "Support",
          varianceDollars: 5,
          contributionPercent: 100,
          contributionSummary: "Support accounts for the variance."
        }
      ],
      verifiedFinancials: {
        forecastVarianceDollars: 5,
        forecastVariancePercent: 1,
        material: true,
        contributorEvidenceSufficient: true,
        actualReconciles: true,
        forecastReconciles: true,
        varianceReconciles: true
      }
    },
    { variance, supportingEvidence: evidence }
  );

  assert.equal(variance.isMaterial, false);
  assert.equal(result.passed, false);
  assert.ok(result.failures.includes("MATERIALITY_MISMATCH"));
});
