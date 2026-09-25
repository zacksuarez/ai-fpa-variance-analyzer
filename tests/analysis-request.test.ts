import test from "node:test";
import assert from "node:assert/strict";
import { parseVarianceInputPayload } from "../lib/analysis-request.ts";
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
