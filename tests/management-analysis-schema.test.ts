import test from "node:test";
import assert from "node:assert/strict";
import {
  validateManagementAnalysis,
  validateManagementAnalysisBusinessRules,
  validateManagementAnalysisStructure,
  type ManagementAnalysis
} from "../lib/management-analysis-schema.ts";

const validAnalysis: ManagementAnalysis = {
  executiveCommentary:
    "Software Expense is materially unfavorable to forecast, with root cause still unresolved.",
  knownFacts: [
    "Actual spend exceeded forecast.",
    "The forecast variance is material."
  ],
  rootCauseKnown: false,
  unknownDrivers: ["No supporting driver evidence has been provided."],
  recommendedFollowUp: ["Review vendor-level spend detail."]
};

test("structured analysis schema accepts a valid response", () => {
  assert.deepEqual(validateManagementAnalysis(validAnalysis), validAnalysis);
});

test("structured analysis schema rejects missing required fields", () => {
  const invalid = {
    ...validAnalysis
  };

  delete (invalid as Partial<ManagementAnalysis>).executiveCommentary;

  assert.throws(() => validateManagementAnalysisStructure(invalid));
});

test("structured analysis schema rejects incorrect field types", () => {
  assert.throws(() =>
    validateManagementAnalysisStructure({
      ...validAnalysis,
      knownFacts: "Actual spend exceeded forecast."
    })
  );
});

test("structured analysis schema rejects unexpected fields", () => {
  assert.throws(() =>
    validateManagementAnalysisStructure({
      ...validAnalysis,
      inventedDriver: "License renewal timing"
    })
  );
});

test("V3 business validation rejects rootCauseKnown=true", () => {
  assert.throws(() =>
    validateManagementAnalysisBusinessRules({
      ...validAnalysis,
      rootCauseKnown: true
    })
  );
});
