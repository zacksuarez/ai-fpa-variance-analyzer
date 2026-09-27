import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_SUPPORTING_ROWS,
  parseVarianceInputPayload
} from "../lib/analysis-request.ts";
import { defaultSupportingDetailRows } from "../lib/supporting-detail.ts";

const validPayload = {
  account: "Software Expense",
  period: "August 2026",
  actual: 625000,
  forecast: 500000,
  priorYear: 450000,
  materialityPercent: 10,
  materialityAmount: 50000,
  supportingDetails: defaultSupportingDetailRows
};

test("valid request payload includes supporting detail rows", () => {
  const parsed = parseVarianceInputPayload(validPayload);

  assert.equal(parsed.ok, true);

  if (parsed.ok) {
    assert.equal(parsed.supportingDetails.length, 4);
  }
});

test("invalid support row is rejected", () => {
  const parsed = parseVarianceInputPayload({
    ...validPayload,
    supportingDetails: [
      {
        id: "bad",
        name: "",
        actual: 1,
        forecast: 1
      }
    ]
  });

  assert.equal(parsed.ok, false);
});

test("non-finite financial input is rejected before AI analysis", () => {
  const parsed = parseVarianceInputPayload({
    ...validPayload,
    actual: Number.POSITIVE_INFINITY
  });

  assert.equal(parsed.ok, false);
  if (!parsed.ok) {
    assert.equal(parsed.category, "numeric");
  }
});

test("negative materiality thresholds are rejected", () => {
  const parsed = parseVarianceInputPayload({
    ...validPayload,
    materialityPercent: -1
  });

  assert.equal(parsed.ok, false);
  if (!parsed.ok) {
    assert.equal(parsed.category, "materiality");
  }
});

test("oversized text input is rejected without truncation", () => {
  const account = "A".repeat(121);
  const parsed = parseVarianceInputPayload({ ...validPayload, account });

  assert.equal(parsed.ok, false);
  if (!parsed.ok) {
    assert.equal(parsed.category, "text_length");
  }
});

test("supporting row count is bounded", () => {
  const supportingDetails = Array.from(
    { length: MAX_SUPPORTING_ROWS + 1 },
    (_, index) => ({
      id: `row-${index}`,
      name: `Row ${index}`,
      actual: 1,
      forecast: 1
    })
  );
  const parsed = parseVarianceInputPayload({
    ...validPayload,
    supportingDetails
  });

  assert.equal(parsed.ok, false);
  if (!parsed.ok) {
    assert.equal(parsed.category, "supporting_row_limit");
  }
});

test("empty supporting rows are valid input but provide no evidence", () => {
  const parsed = parseVarianceInputPayload({
    ...validPayload,
    supportingDetails: []
  });

  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.deepEqual(parsed.supportingDetails, []);
  }
});
