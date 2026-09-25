import type { VarianceResult } from "@/lib/variance";

export type SupportingDetailInput = {
  id: string;
  name: string;
  actual: number;
  forecast: number;
};

export type SupportingDetailResult = SupportingDetailInput & {
  varianceDollars: number;
  variancePercent: number | null;
  contributionPercent: number | null;
};

export type SupportingEvidenceSummary = {
  rows: SupportingDetailResult[];
  rankedRows: SupportingDetailResult[];
  supportActualTotal: number;
  supportForecastTotal: number;
  supportingVarianceTotal: number;
  topLevelActual: number;
  topLevelForecast: number;
  topLevelForecastVariance: number;
  unexplainedVariance: number;
  evidenceCoveragePercent: number | null;
  actualReconciles: boolean;
  forecastReconciles: boolean;
  varianceReconciles: boolean;
  evidenceSufficient: boolean;
};

const RECONCILIATION_TOLERANCE = 0.01;

export const defaultSupportingDetailRows: SupportingDetailInput[] = [
  {
    id: "salesforce",
    name: "Salesforce",
    actual: 180000,
    forecast: 120000
  },
  {
    id: "snowflake",
    name: "Snowflake",
    actual: 140000,
    forecast: 100000
  },
  {
    id: "microsoft",
    name: "Microsoft",
    actual: 105000,
    forecast: 100000
  },
  {
    id: "other",
    name: "Other",
    actual: 200000,
    forecast: 180000
  }
];

function calculatePercentage(numerator: number, denominator: number): number | null {
  if (denominator === 0) {
    return null;
  }

  return (numerator / denominator) * 100;
}

function reconciles(left: number, right: number): boolean {
  return Math.abs(left - right) <= RECONCILIATION_TOLERANCE;
}

export function calculateSupportingEvidence(
  inputs: SupportingDetailInput[],
  topLevelResult: VarianceResult
): SupportingEvidenceSummary {
  const rows = inputs.map<SupportingDetailResult>((input) => {
    const varianceDollars = input.actual - input.forecast;

    return {
      ...input,
      varianceDollars,
      variancePercent: calculatePercentage(varianceDollars, input.forecast),
      contributionPercent: calculatePercentage(
        varianceDollars,
        topLevelResult.forecastVarianceAmount
      )
    };
  });

  const supportActualTotal = rows.reduce((total, row) => total + row.actual, 0);
  const supportForecastTotal = rows.reduce((total, row) => total + row.forecast, 0);
  const supportingVarianceTotal = rows.reduce(
    (total, row) => total + row.varianceDollars,
    0
  );
  const topLevelForecastVariance = topLevelResult.forecastVarianceAmount;
  const unexplainedVariance = topLevelForecastVariance - supportingVarianceTotal;
  const evidenceCoveragePercent = calculatePercentage(
    supportingVarianceTotal,
    topLevelForecastVariance
  );
  const actualReconciles = reconciles(supportActualTotal, topLevelResult.actual);
  const forecastReconciles = reconciles(
    supportForecastTotal,
    topLevelResult.forecast
  );
  const varianceReconciles = reconciles(
    supportingVarianceTotal,
    topLevelForecastVariance
  );
  const hasNonZeroSupportVariance = rows.some(
    (row) => Math.abs(row.varianceDollars) > RECONCILIATION_TOLERANCE
  );
  const explainsAtLeastNinetyPercent =
    evidenceCoveragePercent !== null &&
    Math.abs(evidenceCoveragePercent) >= 90;

  return {
    rows,
    rankedRows: [...rows].sort(
      (first, second) =>
        Math.abs(second.varianceDollars) - Math.abs(first.varianceDollars)
    ),
    supportActualTotal,
    supportForecastTotal,
    supportingVarianceTotal,
    topLevelActual: topLevelResult.actual,
    topLevelForecast: topLevelResult.forecast,
    topLevelForecastVariance,
    unexplainedVariance,
    evidenceCoveragePercent,
    actualReconciles,
    forecastReconciles,
    varianceReconciles,
    evidenceSufficient:
      varianceReconciles &&
      explainsAtLeastNinetyPercent &&
      hasNonZeroSupportVariance
  };
}
