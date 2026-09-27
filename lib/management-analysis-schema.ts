import { z } from "zod";

export const managementAnalysisSchema = z
  .object({
    executiveCommentary: z.string(),
    knownFacts: z.array(z.string()),
    rootCauseKnown: z
      .boolean()
      .describe(
        "Whether supplied evidence establishes the underlying operational or causal root cause, not merely the financial variance contributors."
      ),
    evidenceBasedDrivers: z.array(
      z
        .object({
          name: z.string(),
          varianceDollars: z.number(),
          contributionPercent: z.number().nullable(),
          contributionSummary: z.string()
        })
        .strict()
    ),
    unknownDrivers: z.array(z.string()),
    recommendedFollowUp: z.array(z.string()),
    verifiedFinancials: z
      .object({
        forecastVarianceDollars: z.number(),
        forecastVariancePercent: z.number().nullable(),
        material: z.boolean(),
        contributorEvidenceSufficient: z.boolean(),
        actualReconciles: z.boolean(),
        forecastReconciles: z.boolean(),
        varianceReconciles: z.boolean()
      })
      .strict()
  })
  .strict();

export type ManagementAnalysis = z.infer<typeof managementAnalysisSchema>;

export function validateManagementAnalysisStructure(
  value: unknown
): ManagementAnalysis {
  return managementAnalysisSchema.parse(value);
}
