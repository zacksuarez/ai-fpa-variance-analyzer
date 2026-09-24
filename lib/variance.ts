export type VarianceDirection = "Favorable" | "Unfavorable" | "Neutral";

export type NullablePercentage = number | null;

export type VarianceInput = {
  account: string;
  period: string;
  actual: number;
  forecast: number;
  priorYear: number;
  materialityPercent: number;
  materialityAmount: number;
};

export type VarianceResult = {
  account: string;
  period: string;
  actual: number;
  forecast: number;
  priorYear: number;
  forecastVarianceAmount: number;
  forecastVariancePercent: NullablePercentage;
  priorYearVarianceAmount: number;
  priorYearVariancePercent: NullablePercentage;
  forecastDirection: VarianceDirection;
  isMaterial: boolean;
};

function calculatePercentageVariance(numerator: number, denominator: number): NullablePercentage {
  if (denominator === 0) {
    return null;
  }

  return (numerator / denominator) * 100;
}

function getExpenseForecastDirection(actual: number, forecast: number): VarianceDirection {
  // V1 assumes an expense account: spending above forecast is unfavorable.
  // Revenue accounts require a separate direction rule in a later version.
  if (actual > forecast) {
    return "Unfavorable";
  }

  if (actual < forecast) {
    return "Favorable";
  }

  return "Neutral";
}

export function calculateVariance(input: VarianceInput): VarianceResult {
  const forecastVarianceAmount = input.actual - input.forecast;
  const priorYearVarianceAmount = input.actual - input.priorYear;
  const forecastVariancePercent = calculatePercentageVariance(
    forecastVarianceAmount,
    input.forecast
  );
  const priorYearVariancePercent = calculatePercentageVariance(
    priorYearVarianceAmount,
    input.priorYear
  );

  const exceedsPercentThreshold =
    forecastVariancePercent !== null &&
    Math.abs(forecastVariancePercent) > input.materialityPercent;
  const exceedsAmountThreshold =
    Math.abs(forecastVarianceAmount) > input.materialityAmount;

  return {
    account: input.account,
    period: input.period,
    actual: input.actual,
    forecast: input.forecast,
    priorYear: input.priorYear,
    forecastVarianceAmount,
    forecastVariancePercent,
    priorYearVarianceAmount,
    priorYearVariancePercent,
    forecastDirection: getExpenseForecastDirection(input.actual, input.forecast),
    isMaterial: exceedsPercentThreshold || exceedsAmountThreshold
  };
}
