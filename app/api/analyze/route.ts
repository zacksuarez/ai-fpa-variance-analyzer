import { NextResponse } from "next/server";
import {
  EmptyModelResponseError,
  generateManagementAnalysis,
  MissingOpenAIKeyError,
  StructuredAnalysisValidationError
} from "@/lib/ai-management-analysis";
import { parseVarianceInputPayload } from "@/lib/analysis-request";
import { calculateVariance } from "@/lib/variance";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Malformed JSON request body." },
      { status: 400 }
    );
  }

  const parsed = parseVarianceInputPayload(payload);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const verifiedResult = calculateVariance(parsed.input);

  try {
    const analysis = await generateManagementAnalysis(verifiedResult);

    return NextResponse.json({ analysis });
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
      return NextResponse.json(
        { error: "AI analysis failed validation. Please try again." },
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
