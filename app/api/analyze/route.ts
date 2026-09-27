import { NextResponse } from "next/server";
import {
  BusinessGuardrailValidationError,
  EmptyModelResponseError,
  generateManagementAnalysis,
  MissingOpenAIKeyError,
  StructuredAnalysisValidationError
} from "@/lib/ai-management-analysis";
import {
  MAX_REQUEST_BODY_BYTES,
  parseVarianceInputPayload
} from "@/lib/analysis-request";
import { calculateSupportingEvidence } from "@/lib/supporting-detail";
import { calculateVariance } from "@/lib/variance";

export async function POST(request: Request) {
  let payload: unknown;
  const declaredLength = Number(request.headers.get("content-length"));

  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_REQUEST_BODY_BYTES
  ) {
    console.warn("Analyze request rejected", { category: "request_size" });
    return NextResponse.json(
      { error: "Request body exceeds the allowed size." },
      { status: 413 }
    );
  }

  try {
    const body = await request.text();

    if (new TextEncoder().encode(body).byteLength > MAX_REQUEST_BODY_BYTES) {
      console.warn("Analyze request rejected", { category: "request_size" });
      return NextResponse.json(
        { error: "Request body exceeds the allowed size." },
        { status: 413 }
      );
    }

    payload = JSON.parse(body);
  } catch {
    console.warn("Analyze request rejected", { category: "malformed_json" });
    return NextResponse.json(
      { error: "Malformed JSON request body." },
      { status: 400 }
    );
  }

  const parsed = parseVarianceInputPayload(payload);

  if (!parsed.ok) {
    console.warn("Analyze request rejected", { category: parsed.category });
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const verifiedResult = calculateVariance(parsed.input);
  const supportingEvidence = calculateSupportingEvidence(
    parsed.supportingDetails,
    verifiedResult
  );

  try {
    const validated = await generateManagementAnalysis(
      verifiedResult,
      supportingEvidence
    );

    return NextResponse.json({
      analysis: validated.analysis,
      validation: {
        schemaValidation: "Passed",
        businessGuardrails: "Passed"
      }
    });
  } catch (error) {
    if (error instanceof MissingOpenAIKeyError) {
      return NextResponse.json(
        { error: "AI analysis is not configured on the server." },
        { status: 503 }
      );
    }

    if (error instanceof EmptyModelResponseError) {
      return NextResponse.json(
        { error: "AI analysis returned no structured result. Please try again." },
        { status: 502 }
      );
    }

    if (error instanceof StructuredAnalysisValidationError) {
      console.warn("AI schema validation failed");
      return NextResponse.json(
        { error: "AI analysis failed validation and was not displayed." },
        { status: 502 }
      );
    }

    if (error instanceof BusinessGuardrailValidationError) {
      console.warn("AI business guardrail failed", {
        failures: error.result.failures
      });
      return NextResponse.json(
        { error: "AI analysis failed validation and was not displayed." },
        { status: 502 }
      );
    }

    console.error("AI analysis request failed", {
      message: error instanceof Error ? error.message : "Unknown error"
    });

    return NextResponse.json(
      { error: "AI analysis failed. Please try again." },
      { status: 502 }
    );
  }
}
