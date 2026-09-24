# AI FP&A Variance Analyzer

AI FP&A Variance Analyzer is a professional portfolio project for learning how AI-assisted finance applications should be built in phases.

V1 established the deterministic variance engine. V2 adds server-side AI commentary while keeping the financial calculations outside the LLM.

## Architectural Principle

**Use deterministic code for deterministic tasks. Use AI for interpretation, reasoning, language, and ambiguity.**

## V1 Deterministic Architecture

V1 provides a small FP&A variance analysis interface for one expense account/category. Users enter:

- Account / Category
- Period
- Actual
- Forecast
- Prior Year
- Materiality %
- Materiality $

The app calculates forecast variance, prior year variance, expense variance direction, and materiality using deterministic TypeScript logic.

The deterministic engine remains authoritative for:

- Forecast variance dollars
- Forecast variance percentage
- Prior-year variance dollars
- Prior-year variance percentage
- Materiality
- Variance direction
- Zero-denominator handling
- Numeric input validation

## V2 Hybrid Architecture

V2 introduces AI-generated management commentary using a server-side OpenAI API call.

```text
User Inputs
    ↓
Client UI
    ↓
Server API Route
    ↓
Shared Deterministic TypeScript Engine
    ↓
Verified Financial Results
    ↓
OpenAI Responses API
    ↓
AI Management Commentary
    ↓
User
```

The browser sends original financial inputs and materiality settings to `POST /api/analyze`. The server route does not trust browser-calculated values. It recomputes the variance analysis with the shared deterministic TypeScript engine before constructing the LLM context.

The OpenAI API is used only after verified financial results exist.

## Why Calculations Stay Outside the LLM

Financial calculations are deterministic and auditable. The LLM should not be asked to calculate variance dollars, percentages, materiality, or direction. Those responsibilities belong to application code.

AI is used for the part that benefits from language and judgment: concise CFO-ready interpretation, known facts, explicit unknowns, and recommended follow-up analysis.

## Server-Side Trust Boundary

Client input is untrusted. Server-side deterministic logic is authoritative.

The UI may display deterministic V1 results immediately for responsiveness, but the API route independently derives the authoritative values used in the AI prompt.

## Project Structure

- `app/page.tsx` contains the interactive React UI and input validation.
- `app/api/analyze/route.ts` contains the server-side AI analysis route.
- `lib/variance.ts` contains reusable deterministic financial calculation logic and TypeScript types.
- `lib/analysis-request.ts` validates API request payloads.
- `lib/ai-management-analysis.ts` contains server-only OpenAI Responses API integration.
- `app/globals.css` contains the responsive FP&A-style interface styling.

The calculation module is separated from the UI and OpenAI integration so it can be unit tested independently.

## Deterministic vs AI Responsibilities

Deterministic application code is responsible for:

- Numeric calculations
- Materiality rules
- Variance direction rules
- Safe handling of zero denominators
- Formatting and validation support

AI is responsible for:

- Explaining variance drivers in plain language
- Interpreting ambiguous business context
- Drafting narrative commentary
- Reasoning from supporting evidence

In V2, no supporting driver evidence is available yet, so AI commentary must explicitly state that root cause is unknown.

## Calculation Formulas

Forecast Variance $:

```text
Actual - Forecast
```

Forecast Variance %:

```text
(Actual - Forecast) / Forecast * 100
```

Prior Year Variance $:

```text
Actual - Prior Year
```

Prior Year Variance %:

```text
(Actual - Prior Year) / Prior Year * 100
```

Material:

```text
absolute Forecast Variance % > Materiality %
OR
absolute Forecast Variance $ > Materiality $
```

For the V1 expense use case:

```text
Actual > Forecast = Unfavorable
Actual < Forecast = Favorable
Actual = Forecast = Neutral
```

This direction rule currently assumes an expense account. Revenue accounts require a different direction rule.

When Forecast or Prior Year is zero, the related percentage variance is shown as unavailable instead of producing `NaN` or `Infinity`.

## Run Locally

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Add your real API key to `.env.local`:

```text
OPENAI_API_KEY=<your key>
```

Do not commit `.env.local`. The real API key must remain server-side only.

Start the development server:

```bash
npm run dev
```

Run quality checks:

```bash
npm run lint
npm run typecheck
npm run build
```

## OpenAI API Security

V2 uses the official OpenAI JavaScript/TypeScript SDK with the Responses API from a server-side Next.js route.

- API key variable: `OPENAI_API_KEY`
- Model: `gpt-5.6-luna`
- Route: `POST /api/analyze`
- Browser calls only the local server route, never OpenAI directly.
- No `NEXT_PUBLIC_` API key is used.
- No real secrets are committed.

## Current Limitations

- Supports one manually entered variance scenario at a time.
- Direction logic assumes an expense account.
- No saved scenarios or database persistence.
- AI analysis is plain text in V2.
- No structured JSON/schema output yet.
- No file upload or spreadsheet ingestion.
- No automated tests yet.
- No supporting driver evidence is supplied to the model yet, so root cause remains unknown.

V3 will introduce structured JSON/schema output. V2 intentionally does not implement that yet.

## Roadmap

- V1 — Deterministic variance engine
- V2 — AI API integration
- V3 — Structured JSON output
- V4 — Supporting evidence and driver analysis
- V5 — Validation and guardrails
- V6 — Production-quality UI
- V7 — Public deployment
