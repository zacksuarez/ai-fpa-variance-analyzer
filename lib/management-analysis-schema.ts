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
          contributionSummary: z.string()
        })
        .strict()
    ),
    unknownDrivers: z.array(z.string()),
    recommendedFollowUp: z.array(z.string())
  })
  .strict();

export type ManagementAnalysis = z.infer<typeof managementAnalysisSchema>;

type ManagementAnalysisEvidence = {
  contributorEvidenceSufficient: boolean;
  causalEvidenceSufficient: boolean;
};

const defaultEvidence: ManagementAnalysisEvidence = {
  contributorEvidenceSufficient: false,
  causalEvidenceSufficient: false
};

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
  evidence: ManagementAnalysisEvidence = defaultEvidence
): ManagementAnalysis {
  if (analysis.rootCauseKnown && !evidence.causalEvidenceSufficient) {
    throw new ManagementAnalysisValidationError(
      "Operational root cause cannot be marked known from contributor evidence alone."
    );
  }

  if (
    evidence.contributorEvidenceSufficient &&
    analysis.evidenceBasedDrivers.length === 0
  ) {
    throw new ManagementAnalysisValidationError(
      "Sufficient contributor evidence must produce at least one evidence-based driver."
    );
  }

  return analysis;
}

export function validateManagementAnalysis(
  value: unknown,
  evidence: ManagementAnalysisEvidence = defaultEvidence
): ManagementAnalysis {
  return validateManagementAnalysisBusinessRules(
    validateManagementAnalysisStructure(value),
    evidence
  );
}
