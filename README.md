# AI FP&A Variance Analyzer

AI FP&A Variance Analyzer is a professional portfolio project for learning how AI-assisted finance applications should be built in phases.

V1 established the deterministic variance engine. V2 added server-side AI commentary. V3 replaced free-form commentary with schema-enforced structured AI output. V4 adds supporting-detail evidence, contribution analysis, reconciliation, and evidence-aware AI interpretation.

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

## V3 Structured Output Architecture

V3 moves from free-form model text to enforced structured output:

```text
User Inputs
    ↓
Client UI
    ↓
POST /api/analyze
    ↓
Server Validation
    ↓
Shared Deterministic TypeScript Engine
    ↓
Verified Financial Results
    ↓
OpenAI Responses API
    ↓
Schema-Enforced Structured Output
    ↓
Server Validation / Typed Result
    ↓
Structured UI Components
```

The AI response is constrained to this application contract:

```json
{
  "executiveCommentary": "...",
  "knownFacts": ["..."],
  "rootCauseKnown": false,
  "unknownDrivers": ["..."],
  "recommendedFollowUp": ["..."]
}
```

The app uses the OpenAI Responses API structured-output capability with a Zod schema. This is different from merely asking the model to "return JSON." A prompt-only JSON request may produce JSON-looking text, but it does not provide the same schema-constrained contract or typed parsed result.

## Schema Validation vs Business Validation

Schema validation verifies structure:

- Required fields are present.
- Field names use the expected camelCase contract.
- Strings, booleans, and string arrays have the expected types.
- Unexpected fields are rejected.

Business validation verifies meaning:

- V3 has no supporting root-cause evidence.
- Therefore `rootCauseKnown` must be `false`.
- If a model response marks root cause as known, the server rejects it even if the JSON structure is otherwise valid.

Both checks matter. Schema validation protects the shape of the data, while business validation protects the finance logic and evidence rules.

## V4 Supporting Evidence Architecture

V4 adds editable vendor-style support rows for the Software Expense example. The default support detail is:

| Name | Actual | Forecast | Variance |
| --- | ---: | ---: | ---: |
| Salesforce | $180,000 | $120,000 | $60,000 |
| Snowflake | $140,000 | $100,000 | $40,000 |
| Microsoft | $105,000 | $100,000 | $5,000 |
| Other | $200,000 | $180,000 | $20,000 |

These rows reconcile to the default top-level example:

- Actual: $625,000
- Forecast: $500,000
- Forecast variance: $125,000

```text
User Inputs + Supporting Detail
        ↓
Server Validation
        ↓
Top-Level Deterministic Engine
        +
Supporting Detail Deterministic Engine
        ↓
Reconciliation
        ↓
Evidence Coverage / Sufficiency
        ↓
Verified Evidence Package
        ↓
OpenAI Structured Output
        ↓
Business Validation
        ↓
Structured UI
```

Supporting rows are useful because they move the analysis from "variance exists" toward "where the variance sits." The application still distinguishes a variance contributor from an ultimate operational root cause.

For each support row, deterministic code calculates:

- Row variance dollars: `actual - forecast`
- Row variance percentage: `(actual - forecast) / forecast * 100`
- Contribution percentage: `row variance dollars / top-level forecast variance * 100`

The default contribution analysis is:

- Salesforce: 48%
- Snowflake: 32%
- Microsoft: 4%
- Other: 16%

The app also calculates reconciliation and evidence coverage:

- Support actual total vs top-level actual
- Support forecast total vs top-level forecast
- Support variance total vs top-level forecast variance
- Unexplained variance
- Evidence coverage percentage

Evidence is sufficient only when:

1. Variance reconciliation is true.
2. Support explains at least 90% of the absolute top-level forecast variance.
3. At least one support row has a non-zero variance.

This is deterministic business logic, not an LLM judgment.

## Why Calculations Stay Outside the LLM

Financial calculations are deterministic and auditable. The LLM should not be asked to calculate variance dollars, percentages, materiality, or direction. Those responsibilities belong to application code.

AI is used for the part that benefits from language and judgment: concise CFO-ready interpretation, known facts, evidence-supported variance contributors, explicit unknowns, and recommended follow-up analysis.

Structured outputs make the AI result safer for downstream application use. The UI can render each field intentionally, future versions can store or compare individual fields, and later workflows can consume typed data instead of parsing prose.

## Server-Side Trust Boundary

Client input is untrusted. Server-side deterministic logic is authoritative.

The UI may display deterministic V1 results immediately for responsiveness, but the API route independently derives the authoritative values used in the AI prompt.

## Project Structure

- `app/page.tsx` contains the interactive React UI and input validation.
- `app/api/analyze/route.ts` contains the server-side AI analysis route.
- `lib/variance.ts` contains reusable deterministic financial calculation logic and TypeScript types.
- `lib/supporting-detail.ts` contains deterministic supporting-detail calculations, reconciliation, evidence coverage, and evidence sufficiency.
- `lib/analysis-request.ts` validates API request payloads.
- `lib/ai-management-analysis.ts` contains server-only OpenAI Responses API integration.
- `lib/management-analysis-schema.ts` defines and validates the V3 structured output contract.
- `lib/ai-analysis-state.ts` contains the small client-side AI result state contract.
- `tests/` contains focused tests for schema validation, business validation, deterministic calculations, support-row reconciliation, evidence coverage, invalid support data, zero denominators, and stale analysis reset.
- `app/globals.css` contains the responsive FP&A-style interface styling.

The calculation module is separated from the UI and OpenAI integration so it can be unit tested independently.

## Deterministic vs AI Responsibilities

Deterministic application code is responsible for:

- Numeric calculations
- Materiality rules
- Variance direction rules
- Safe handling of zero denominators
- Formatting and validation support
- Supporting-detail variance and contribution calculations
- Reconciliation and evidence sufficiency

AI is responsible for:

- Explaining verified variance contributors in plain language
- Interpreting ambiguous business context
- Drafting narrative commentary
- Reasoning from supporting evidence

In V4, vendor-level support can identify major financial variance contributors. It does not automatically prove the deeper operational cause. AI output should avoid unsupported claims about pricing, volume, license count, renewal timing, vendor behavior, or other causal mechanisms unless supplied evidence supports them.

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
npm run test
```

## OpenAI API Security

V4 uses the official OpenAI JavaScript/TypeScript SDK with the Responses API from a server-side Next.js route.

- API key variable: `OPENAI_API_KEY`
- Model: `gpt-5.6-luna`
- Route: `POST /api/analyze`
- Output: schema-enforced structured JSON parsed into typed application data
- Browser calls only the local server route, never OpenAI directly.
- No `NEXT_PUBLIC_` API key is used.
- No real secrets are committed.

## Current Limitations

- Supports one manually entered variance scenario at a time.
- Direction logic assumes an expense account.
- No saved scenarios or database persistence.
- No file upload or spreadsheet ingestion.
- Vendor-level support identifies financial contributors, not deeper operational root causes.
- Evidence is manually entered and not persisted.

V5 will expand validation and guardrails. V4 intentionally does not implement V5+ yet.

## Roadmap

- V1 — Deterministic variance engine — COMPLETE
- V2 — AI API integration — COMPLETE
- V3 — Structured JSON output — COMPLETE
- V4 — Supporting evidence and driver analysis — COMPLETE
- V5 — Validation and guardrails
- V6 — Production-quality UI
- V7 — Public deployment
