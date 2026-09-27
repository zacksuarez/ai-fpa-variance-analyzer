import test from "node:test";
import assert from "node:assert/strict";
import {
  validateManagementAnalysisStructure,
  type ManagementAnalysis
} from "../lib/management-analysis-schema.ts";
import { validAnalysis } from "./helpers/analysis-fixtures.ts";

test("structured analysis schema accepts a valid response", () => {
  assert.deepEqual(validateManagementAnalysisStructure(validAnalysis), validAnalysis);
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
