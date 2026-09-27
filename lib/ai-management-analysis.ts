import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import {
  evaluateAnalysisGuardrails,
  type GuardrailResult
} from "@/lib/analysis-guardrails";
import {
  managementAnalysisSchema,
  validateManagementAnalysisStructure,
  type ManagementAnalysis
} from "@/lib/management-analysis-schema";
import {
  AI_COMMENTARY_MODEL,
  MANAGEMENT_ANALYSIS_INSTRUCTIONS
} from "@/lib/management-analysis-prompt";
import type { SupportingEvidenceSummary } from "@/lib/supporting-detail";
import type { VarianceResult } from "@/lib/variance";
import {
  buildVerifiedEvidencePackage,
  serializeUntrustedEvidenceData
} from "@/lib/verified-evidence";

export class MissingOpenAIKeyError extends Error {
  constructor() {
    super("OPENAI_API_KEY is not configured.");
    this.name = "MissingOpenAIKeyError";
  }
}

export class EmptyModelResponseError extends Error {
  constructor() {
    super("The model returned an empty response.");
    this.name = "EmptyModelResponseError";
  }
}

export class StructuredAnalysisValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StructuredAnalysisValidationError";
  }
}

export class BusinessGuardrailValidationError extends Error {
  constructor(public readonly result: GuardrailResult) {
    super("Structured AI analysis violated deterministic business guardrails.");
    this.name = "BusinessGuardrailValidationError";
  }
}

export type ValidatedManagementAnalysis = {
  analysis: ManagementAnalysis;
  guardrails: GuardrailResult;
};

export async function generateManagementAnalysis(
  result: VarianceResult,
  supportingEvidence: SupportingEvidenceSummary
): Promise<ValidatedManagementAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new MissingOpenAIKeyError();
  }

  const client = new OpenAI({ apiKey });
  const verifiedEvidence = buildVerifiedEvidencePackage(
    result,
    supportingEvidence
  );

  const response = await client.responses.parse({
    model: AI_COMMENTARY_MODEL,
    instructions: MANAGEMENT_ANALYSIS_INSTRUCTIONS,
    input: serializeUntrustedEvidenceData(verifiedEvidence),
    text: {
      format: zodTextFormat(
        managementAnalysisSchema,
        "management_analysis",
        {
          description:
            "Structured CFO-ready FP&A management interpretation of verified variance results."
        }
      )
    },
    max_output_tokens: 700,
    store: false
  });

  const analysis = response.output_parsed;

  if (!analysis) {
    throw new EmptyModelResponseError();
  }

  let structuredAnalysis: ManagementAnalysis;

  try {
    structuredAnalysis = validateManagementAnalysisStructure(analysis);
  } catch {
    throw new StructuredAnalysisValidationError(
      "Structured AI analysis did not match the required application contract."
    );
  }

  const guardrails = evaluateAnalysisGuardrails(structuredAnalysis, {
    variance: result,
    supportingEvidence,
    causalEvidenceAvailable: false
  });

  if (!guardrails.passed) {
    throw new BusinessGuardrailValidationError(guardrails);
  }

  return {
    analysis: structuredAnalysis,
    guardrails
  };
}
