import type { ManagementAnalysis } from "../../lib/management-analysis-schema.ts";
import {
  calculateSupportingEvidence,
  defaultSupportingDetailRows
} from "../../lib/supporting-detail.ts";
import { calculateVariance } from "../../lib/variance.ts";

export const defaultVariance = calculateVariance({
  account: "Software Expense",
  period: "August 2026",
  actual: 625000,
  forecast: 500000,
  priorYear: 450000,
  materialityPercent: 10,
  materialityAmount: 50000
});

export const defaultEvidence = calculateSupportingEvidence(
  defaultSupportingDetailRows,
  defaultVariance
);

export const validAnalysis: ManagementAnalysis = {
  executiveCommentary:
    "Software Expense is materially unfavorable to forecast; financial contributors are identified while operational causes remain unresolved.",
  knownFacts: [
    "Actual spend exceeded forecast.",
    "The forecast variance is material."
  ],
  rootCauseKnown: false,
  evidenceBasedDrivers: [
    {
      name: "Salesforce",
      varianceDollars: 60000,
      contributionPercent: 48,
      contributionSummary: "Salesforce accounts for 48.0% of the forecast variance."
    }
  ],
  unknownDrivers: ["Underlying operational causes are not established."],
  recommendedFollowUp: ["Review vendor-level operational evidence."],
  verifiedFinancials: {
    forecastVarianceDollars: 125000,
    forecastVariancePercent: 25,
    material: true,
    contributorEvidenceSufficient: true,
    actualReconciles: true,
    forecastReconciles: true,
    varianceReconciles: true
  }
};
