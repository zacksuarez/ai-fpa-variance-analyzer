import type { VarianceInput } from "@/lib/variance";
import type { SupportingDetailInput } from "@/lib/supporting-detail";

type ParseResult =
  | {
      ok: true;
      input: VarianceInput;
      supportingDetails: SupportingDetailInput[];
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

function parseSupportingDetailRows(payload: Record<string, unknown>):
  | {
      ok: true;
      rows: SupportingDetailInput[];
    }
  | {
      ok: false;
      error: string;
    } {
  const rows = payload.supportingDetails;

  if (!Array.isArray(rows)) {
    return {
      ok: false,
      error: "supportingDetails must be an array."
    };
  }

  const parsedRows: SupportingDetailInput[] = [];

  for (const [index, row] of rows.entries()) {
    if (!isRecord(row)) {
      return {
        ok: false,
        error: `supportingDetails[${index}] must be an object.`
      };
    }

    const id = typeof row.id === "string" && row.id.trim() !== ""
      ? row.id.trim()
      : `row-${index + 1}`;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    const actual = row.actual;
    const forecast = row.forecast;

    if (name === "") {
      return {
        ok: false,
        error: `supportingDetails[${index}].name is required.`
      };
    }

    if (typeof actual !== "number" || !Number.isFinite(actual)) {
      return {
        ok: false,
        error: `supportingDetails[${index}].actual must be a finite number.`
      };
    }

    if (typeof forecast !== "number" || !Number.isFinite(forecast)) {
      return {
        ok: false,
        error: `supportingDetails[${index}].forecast must be a finite number.`
      };
    }

    parsedRows.push({
      id,
      name,
      actual,
      forecast
    });
  }

  return {
    ok: true,
    rows: parsedRows
  };
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

  const supportingDetails = parseSupportingDetailRows(payload);

  if (!supportingDetails.ok) {
    return {
      ok: false,
      error: supportingDetails.error
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
    },
    supportingDetails: supportingDetails.rows
  };
}
