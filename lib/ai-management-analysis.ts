import "server-only";

import OpenAI from "openai";
import type { VarianceResult } from "@/lib/variance";

export const AI_COMMENTARY_MODEL = "gpt-5.6-luna";

const MANAGEMENT_ANALYSIS_INSTRUCTIONS = `
ROLE:
You are an FP&A manager preparing monthly management reporting for a CFO.

OBJECTIVE:
Interpret the verified financial analysis supplied by the application.

EVIDENCE RULES:
- Treat supplied financial calculations as authoritative.
- Do not recalculate or alter supplied calculations.
- Use only supplied evidence.
- Do not invent root causes.
- Do not claim pricing, volume, vendor, license, timing, renewal, customer, or other drivers unless evidence explicitly supports them.
- For V2, no supporting driver evidence is supplied, so state clearly that the root cause is unknown.
- Distinguish known facts from unknown causes.
- Recommend specific next-step analysis where appropriate.

STYLE:
- concise
- professional
- CFO-ready
- no unnecessary AI disclaimers
- no fabricated precision

OUTPUT:
Return plain text organized exactly under these headings:
Executive Commentary
Known Facts
Unknown Drivers
Recommended Follow-Up
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
    supportingDriverEvidence: "None supplied in V2."
  };
}

export async function generateManagementAnalysis(
  result: VarianceResult
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new MissingOpenAIKeyError();
  }

  const client = new OpenAI({ apiKey });
  const verifiedContext = buildVerifiedAnalysisContext(result);

  const response = await client.responses.create({
    model: AI_COMMENTARY_MODEL,
    instructions: MANAGEMENT_ANALYSIS_INSTRUCTIONS,
    input: `Verified financial analysis:\n${JSON.stringify(
      verifiedContext,
      null,
      2
    )}`,
    max_output_tokens: 700,
    store: false
  });

  const analysis = response.output_text.trim();

  if (!analysis) {
    throw new EmptyModelResponseError();
  }

  return analysis;
}
