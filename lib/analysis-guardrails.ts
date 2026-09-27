import type { ManagementAnalysis } from "@/lib/management-analysis-schema";
import type { SupportingEvidenceSummary } from "@/lib/supporting-detail";
import type { VarianceResult } from "@/lib/variance";

export type GuardrailFailure =
  | "UNSUPPORTED_ROOT_CAUSE"
  | "CONTRIBUTOR_SUFFICIENCY_MISMATCH"
  | "MISSING_VERIFIED_DRIVER"
  | "INVENTED_DRIVER"
  | "DUPLICATE_DRIVER"
  | "DRIVER_VARIANCE_MISMATCH"
  | "DRIVER_CONTRIBUTION_MISMATCH"
  | "TOP_LEVEL_VARIANCE_MISMATCH"
  | "TOP_LEVEL_PERCENT_MISMATCH"
  | "MATERIALITY_MISMATCH"
  | "RECONCILIATION_MISMATCH";

export type GuardrailResult = {
  passed: boolean;
  failures: GuardrailFailure[];
};

export type GuardrailContext = {
  variance: VarianceResult;
  supportingEvidence: SupportingEvidenceSummary;
  causalEvidenceAvailable?: boolean;
};

const NUMERIC_TOLERANCE = 0.01;

function roundPercentage(value: number | null): number | null {
  return value === null ? null : Math.round(value * 10) / 10;
}

function numbersMatch(left: number | null, right: number | null): boolean {
  if (left === null || right === null) {
    return left === right;
  }

  return Math.abs(left - right) <= NUMERIC_TOLERANCE;
}

function addFailure(
  failures: GuardrailFailure[],
  failure: GuardrailFailure
): void {
  if (!failures.includes(failure)) {
    failures.push(failure);
  }
}

export function evaluateAnalysisGuardrails(
  analysis: ManagementAnalysis,
  context: GuardrailContext
): GuardrailResult {
  const failures: GuardrailFailure[] = [];
  const { variance, supportingEvidence } = context;
  const financials = analysis.verifiedFinancials;

  if (analysis.rootCauseKnown && !context.causalEvidenceAvailable) {
    addFailure(failures, "UNSUPPORTED_ROOT_CAUSE");
  }

  if (
    financials.contributorEvidenceSufficient !==
    supportingEvidence.evidenceSufficient
  ) {
    addFailure(failures, "CONTRIBUTOR_SUFFICIENCY_MISMATCH");
  }

  if (
    supportingEvidence.evidenceSufficient &&
    analysis.evidenceBasedDrivers.length === 0
  ) {
    addFailure(failures, "MISSING_VERIFIED_DRIVER");
  }

  const seenDriverNames = new Set<string>();

  for (const driver of analysis.evidenceBasedDrivers) {
    if (seenDriverNames.has(driver.name)) {
      addFailure(failures, "DUPLICATE_DRIVER");
    }
    seenDriverNames.add(driver.name);

    const matchingRows = supportingEvidence.rows.filter(
      (row) => row.name === driver.name
    );

    if (matchingRows.length === 0) {
      addFailure(failures, "INVENTED_DRIVER");
      continue;
    }

    const matchingVariance = matchingRows.some((row) =>
      numbersMatch(driver.varianceDollars, row.varianceDollars)
    );
    const matchingContribution = matchingRows.some((row) =>
      numbersMatch(
        driver.contributionPercent,
        roundPercentage(row.contributionPercent)
      )
    );
    const matchingVerifiedRow = matchingRows.some(
      (row) =>
        numbersMatch(driver.varianceDollars, row.varianceDollars) &&
        numbersMatch(
          driver.contributionPercent,
          roundPercentage(row.contributionPercent)
        )
    );

    if (!matchingVariance || (!matchingVerifiedRow && matchingContribution)) {
      addFailure(failures, "DRIVER_VARIANCE_MISMATCH");
    }

    if (!matchingContribution || (!matchingVerifiedRow && matchingVariance)) {
      addFailure(failures, "DRIVER_CONTRIBUTION_MISMATCH");
    }
  }

  if (
    !numbersMatch(
      financials.forecastVarianceDollars,
      variance.forecastVarianceAmount
    )
  ) {
    addFailure(failures, "TOP_LEVEL_VARIANCE_MISMATCH");
  }

  if (
    !numbersMatch(
      financials.forecastVariancePercent,
      roundPercentage(variance.forecastVariancePercent)
    )
  ) {
    addFailure(failures, "TOP_LEVEL_PERCENT_MISMATCH");
  }

  if (financials.material !== variance.isMaterial) {
    addFailure(failures, "MATERIALITY_MISMATCH");
  }

  if (
    financials.actualReconciles !== supportingEvidence.actualReconciles ||
    financials.forecastReconciles !== supportingEvidence.forecastReconciles ||
    financials.varianceReconciles !== supportingEvidence.varianceReconciles
  ) {
    addFailure(failures, "RECONCILIATION_MISMATCH");
  }

  return {
    passed: failures.length === 0,
    failures
  };
}
