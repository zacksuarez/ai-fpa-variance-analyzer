import type { VarianceInput } from "@/lib/variance";

type ParseResult =
  | {
      ok: true;
      input: VarianceInput;
    }
  | {
      ok: false;
      error: string;
    };

const numericFields = [
  "actual",
  "forecast",
  "priorYear",
  "materialityPercent",
  "materialityAmount"
] as const;

type NumericField = (typeof numericFields)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseTextField(
  source: Record<string, unknown>,
  field: "account" | "period"
): string | null {
  const value = source[field];

  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  return value.trim();
}

function parseNumberField(
  source: Record<string, unknown>,
  field: NumericField
): number | null {
  const value = source[field];

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

export function parseVarianceInputPayload(payload: unknown): ParseResult {
  if (!isRecord(payload)) {
    return {
      ok: false,
      error: "Request body must be an object."
    };
  }

  const account = parseTextField(payload, "account");
  const period = parseTextField(payload, "period");

  if (account === null || period === null) {
    return {
      ok: false,
      error: "Account and period are required."
    };
  }

  const parsedNumbers = numericFields.reduce<Partial<Record<NumericField, number>>>(
    (values, field) => {
      const parsed = parseNumberField(payload, field);

      if (parsed !== null) {
        values[field] = parsed;
      }

      return values;
    },
    {}
  );

  const invalidNumericField = numericFields.find(
    (field) => parsedNumbers[field] === undefined
  );

  if (invalidNumericField !== undefined) {
    return {
      ok: false,
      error: `${invalidNumericField} must be a finite number.`
    };
  }

  const actual = parsedNumbers.actual;
  const forecast = parsedNumbers.forecast;
  const priorYear = parsedNumbers.priorYear;
  const materialityPercent = parsedNumbers.materialityPercent;
  const materialityAmount = parsedNumbers.materialityAmount;

  if (
    actual === undefined ||
    forecast === undefined ||
    priorYear === undefined ||
    materialityPercent === undefined ||
    materialityAmount === undefined
  ) {
    return {
      ok: false,
      error: "Request includes invalid numeric inputs."
    };
  }

  return {
    ok: true,
    input: {
      account,
      period,
      actual,
      forecast,
      priorYear,
      materialityPercent,
      materialityAmount
    }
  };
}
