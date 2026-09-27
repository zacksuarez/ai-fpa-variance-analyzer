import test from "node:test";
import assert from "node:assert/strict";
import {
  idleAiAnalysisState,
  invalidateAiAnalysis,
  type AiAnalysisState
} from "../lib/ai-analysis-state.ts";
import { validAnalysis } from "./helpers/analysis-fixtures.ts";

test("stale analysis can be cleared back to idle state", () => {
  const completedState: AiAnalysisState = {
    status: "success",
    error: "",
    analysis: validAnalysis,
    validation: {
      schemaValidation: "Passed",
      businessGuardrails: "Passed"
    }
  };

  const clearedState = completedState.analysis
    ? invalidateAiAnalysis()
    : completedState;

  assert.deepEqual(clearedState, idleAiAnalysisState);
});
