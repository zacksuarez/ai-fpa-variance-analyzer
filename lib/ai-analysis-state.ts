import type { ManagementAnalysis } from "@/lib/management-analysis-schema";

export type AiRequestStatus = "idle" | "loading" | "success" | "error";

export type AiAnalysisState = {
  status: AiRequestStatus;
  analysis: ManagementAnalysis | null;
  error: string;
};

export const idleAiAnalysisState: AiAnalysisState = {
  status: "idle",
  analysis: null,
  error: ""
};
