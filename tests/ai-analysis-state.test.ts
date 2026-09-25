import test from "node:test";
import assert from "node:assert/strict";
import { idleAiAnalysisState, type AiAnalysisState } from "../lib/ai-analysis-state.ts";

test("stale analysis can be cleared back to idle state", () => {
  const completedState: AiAnalysisState = {
    status: "success",
    error: "",
    analysis: {
      executiveCommentary: "Prior commentary.",
      knownFacts: ["Prior known fact."],
      rootCauseKnown: false,
      unknownDrivers: ["Prior unknown driver."],
      recommendedFollowUp: ["Prior follow-up."]
    }
  };

  const clearedState = {
    ...completedState,
    ...idleAiAnalysisState
  };

  assert.deepEqual(clearedState, idleAiAnalysisState);
});
