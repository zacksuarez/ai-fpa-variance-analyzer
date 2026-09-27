import type { ManagementAnalysis } from "@/lib/management-analysis-schema";

export type AiRequestStatus = "idle" | "loading" | "success" | "error";

export type AnalysisValidationStatus = {
  schemaValidation: "Passed";
  businessGuardrails: "Passed";
};

export type AiAnalysisState = {
  status: AiRequestStatus;
  analysis: ManagementAnalysis | null;
  validation: AnalysisValidationStatus | null;
  error: string;
};

export const idleAiAnalysisState: AiAnalysisState = {
  status: "idle",
  analysis: null,
  validation: null,
  error: ""
};

export function invalidateAiAnalysis(): AiAnalysisState {
  return idleAiAnalysisState;
}
