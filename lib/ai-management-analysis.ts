import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import {
  managementAnalysisSchema,
  validateManagementAnalysis,
  ManagementAnalysisValidationError,
  type ManagementAnalysis
} from "@/lib/management-analysis-schema";
import type { VarianceResult } from "@/lib/variance";

export const AI_COMMENTARY_MODEL = "gpt-5.6-luna";

const MANAGEMENT_ANALYSIS_INSTRUCTIONS = `
ROLE:
You are an FP&A manager preparing monthly management reporting for a CFO.

OBJECTIVE:
Interpret verified deterministic financial results.

EVIDENCE RULES:
- Treat supplied financial calculations as authoritative.
- Do not recalculate or alter supplied calculations.
- Use only supplied evidence.
- Do not invent root causes.
- Do not claim pricing, volume, vendor, license, timing, renewal, customer, or other drivers unless evidence explicitly supports them.
- No supporting root-cause evidence is available in V3.
- rootCauseKnown must therefore be false.
- Unknown drivers should describe what remains unresolved, not present speculation as fact.
- Distinguish known facts from unknown causes.
- Recommend specific next-step analysis where appropriate.

STYLE:
- concise
- professional
- CFO-ready
- no unnecessary AI disclaimers
- no fabricated precision
`.trim();

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

function roundNullablePercentage(value: number | null): number | null {
  if (value === null) {
    return null;
  }

  return Math.round(value * 10) / 10;
}

function buildVerifiedAnalysisContext(result: VarianceResult) {
  return {
    account: result.account,
    period: result.period,
    actual: result.actual,
    forecast: result.forecast,
    priorYear: result.priorYear,
    forecastVarianceDollars: result.forecastVarianceAmount,
    forecastVariancePercent: roundNullablePercentage(
      result.forecastVariancePercent
    ),
    priorYearVarianceDollars: result.priorYearVarianceAmount,
    priorYearVariancePercent: roundNullablePercentage(
      result.priorYearVariancePercent
    ),
    direction: result.forecastDirection,
    material: result.isMaterial,
    supportingDriverEvidence: "None supplied in V3."
  };
}

export async function generateManagementAnalysis(
  result: VarianceResult
): Promise<ManagementAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new MissingOpenAIKeyError();
  }

  const client = new OpenAI({ apiKey });
  const verifiedContext = buildVerifiedAnalysisContext(result);

  const response = await client.responses.parse({
    model: AI_COMMENTARY_MODEL,
    instructions: MANAGEMENT_ANALYSIS_INSTRUCTIONS,
    input: `Verified financial analysis:\n${JSON.stringify(
      verifiedContext,
      null,
      2
    )}`,
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

  try {
    return validateManagementAnalysis(analysis);
  } catch (error) {
    if (error instanceof ManagementAnalysisValidationError) {
      throw new StructuredAnalysisValidationError(error.message);
    }

    throw new StructuredAnalysisValidationError(
      "Structured AI analysis did not match the required V3 contract."
    );
  }
}
