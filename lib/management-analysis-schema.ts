import { z } from "zod";

export const managementAnalysisSchema = z
  .object({
    executiveCommentary: z.string(),
    knownFacts: z.array(z.string()),
    rootCauseKnown: z.boolean(),
    unknownDrivers: z.array(z.string()),
    recommendedFollowUp: z.array(z.string())
  })
  .strict();

export type ManagementAnalysis = z.infer<typeof managementAnalysisSchema>;

export class ManagementAnalysisValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ManagementAnalysisValidationError";
  }
}

export function validateManagementAnalysisStructure(
  value: unknown
): ManagementAnalysis {
  return managementAnalysisSchema.parse(value);
}

export function validateManagementAnalysisBusinessRules(
  analysis: ManagementAnalysis
): ManagementAnalysis {
  if (analysis.rootCauseKnown) {
    throw new ManagementAnalysisValidationError(
      "V3 cannot mark root cause as known because no supporting driver evidence is supplied."
    );
  }

  return analysis;
}

export function validateManagementAnalysis(value: unknown): ManagementAnalysis {
  return validateManagementAnalysisBusinessRules(
    validateManagementAnalysisStructure(value)
  );
}
