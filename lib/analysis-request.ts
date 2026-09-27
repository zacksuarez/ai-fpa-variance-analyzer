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
      category: InputValidationFailureCategory;
    };

export type InputValidationFailureCategory =
  | "request_shape"
  | "required_text"
  | "text_length"
  | "numeric"
  | "materiality"
  | "supporting_details_shape"
  | "supporting_row_limit"
  | "supporting_row_name"
  | "supporting_row_id"
  | "supporting_row_numeric";

export const MAX_REQUEST_BODY_BYTES = 100_000;
export const MAX_SUPPORTING_ROWS = 100;
const MAX_ACCOUNT_LENGTH = 120;
const MAX_PERIOD_LENGTH = 80;
const MAX_SUPPORT_NAME_LENGTH = 200;
const MAX_SUPPORT_ID_LENGTH = 100;

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
  field: "account" | "period",
  maxLength: number
):
  | { ok: true; value: string }
  | { ok: false; category: InputValidationFailureCategory } {
  const value = source[field];

  if (typeof value !== "string" || value.trim() === "") {
    return { ok: false, category: "required_text" };
  }

  const trimmed = value.trim();

  if (trimmed.length > maxLength) {
    return { ok: false, category: "text_length" };
  }

  return { ok: true, value: trimmed };
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
      category: InputValidationFailureCategory;
    } {
  const rows = payload.supportingDetails;

  if (!Array.isArray(rows)) {
    return {
      ok: false,
      error: "supportingDetails must be an array.",
      category: "supporting_details_shape"
    };
  }

  if (rows.length > MAX_SUPPORTING_ROWS) {
    return {
      ok: false,
      error: `supportingDetails cannot contain more than ${MAX_SUPPORTING_ROWS} rows.`,
      category: "supporting_row_limit"
    };
  }

  const parsedRows: SupportingDetailInput[] = [];

  for (const [index, row] of rows.entries()) {
    if (!isRecord(row)) {
      return {
        ok: false,
        error: `supportingDetails[${index}] must be an object.`,
        category: "supporting_details_shape"
      };
    }

    const id =
      typeof row.id === "string" && row.id.trim() !== ""
        ? row.id.trim()
        : `row-${index + 1}`;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    const actual = row.actual;
    const forecast = row.forecast;

    if (name === "") {
      return {
        ok: false,
        error: `supportingDetails[${index}].name is required.`,
        category: "supporting_row_name"
      };
    }

    if (name.length > MAX_SUPPORT_NAME_LENGTH) {
      return {
        ok: false,
        error: `supportingDetails[${index}].name is too long.`,
        category: "text_length"
      };
    }

    if (id.length > MAX_SUPPORT_ID_LENGTH) {
      return {
        ok: false,
        error: `supportingDetails[${index}].id is too long.`,
        category: "supporting_row_id"
      };
    }

    if (typeof actual !== "number" || !Number.isFinite(actual)) {
      return {
        ok: false,
        error: `supportingDetails[${index}].actual must be a finite number.`,
        category: "supporting_row_numeric"
      };
    }

    if (typeof forecast !== "number" || !Number.isFinite(forecast)) {
      return {
        ok: false,
        error: `supportingDetails[${index}].forecast must be a finite number.`,
        category: "supporting_row_numeric"
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
      error: "Request body must be an object.",
      category: "request_shape"
    };
  }

  const account = parseTextField(payload, "account", MAX_ACCOUNT_LENGTH);
  const period = parseTextField(payload, "period", MAX_PERIOD_LENGTH);

  if (!account.ok || !period.ok) {
    const category = !account.ok
      ? account.category
      : !period.ok
        ? period.category
        : "required_text";

    return {
      ok: false,
      error:
        category === "text_length"
          ? "Account or period exceeds the allowed length."
          : "Account and period are required.",
      category
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
      error: `${invalidNumericField} must be a finite number.`,
      category: "numeric"
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
      error: "Request includes invalid numeric inputs.",
      category: "numeric"
    };
  }

  if (materialityPercent < 0 || materialityAmount < 0) {
    return {
      ok: false,
      error: "Materiality percentage and dollars must be non-negative.",
      category: "materiality"
    };
  }

  const supportingDetails = parseSupportingDetailRows(payload);

  if (!supportingDetails.ok) {
    return {
      ok: false,
      error: supportingDetails.error,
      category: supportingDetails.category
    };
  }

  return {
    ok: true,
    input: {
      account: account.value,
      period: period.value,
      actual,
      forecast,
      priorYear,
      materialityPercent,
      materialityAmount
    },
    supportingDetails: supportingDetails.rows
  };
}
