import { z } from "zod";

export const managementAnalysisSchema = z
  .object({
    executiveCommentary: z.string(),
    knownFacts: z.array(z.string()),
    rootCauseKnown: z.boolean(),
    evidenceBasedDrivers: z.array(
      z
        .object({
          name: z.string(),
          contributionSummary: z.string()
        })
        .strict()
    ),
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
  analysis: ManagementAnalysis,
  options: { evidenceSufficient: boolean } = { evidenceSufficient: false }
): ManagementAnalysis {
  if (!options.evidenceSufficient && analysis.rootCauseKnown) {
    throw new ManagementAnalysisValidationError(
      "Root cause cannot be marked known without sufficient supporting evidence."
    );
  }

  return analysis;
}

export function validateManagementAnalysis(
  value: unknown,
  options: { evidenceSufficient: boolean } = { evidenceSufficient: false }
): ManagementAnalysis {
  return validateManagementAnalysisBusinessRules(
    validateManagementAnalysisStructure(value),
    options
  );
}
