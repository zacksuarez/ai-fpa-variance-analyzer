# AI FP&A Variance Analyzer

AI FP&A Variance Analyzer is a professional portfolio project for learning how AI-assisted finance applications should be built in phases.

V1 is intentionally not an AI application yet. It demonstrates that deterministic financial calculations should be handled by ordinary application code before an LLM is introduced.

## Architectural Principle

**Use deterministic code for deterministic tasks. Use AI for interpretation, reasoning, language, and ambiguity.**

## V1 Scope

V1 provides a small FP&A variance analysis interface for one expense account/category. Users can enter:

- Account / Category
- Period
- Actual
- Forecast
- Prior Year
- Materiality %
- Materiality $

The app calculates forecast variance, prior year variance, expense variance direction, and materiality using deterministic TypeScript logic.

V1 does not include OpenAI APIs, AI SDKs, databases, authentication, RAG, agents, external APIs, or LLM-based business rules.

## Architecture

- `app/page.tsx` contains the interactive React UI and input validation.
- `lib/variance.ts` contains reusable deterministic financial calculation logic and TypeScript types.
- `app/globals.css` contains the responsive FP&A-style interface styling.

The calculation module is separated from the UI so it can be unit tested in a later version.

## Deterministic vs AI Responsibilities

Deterministic application code is responsible for:

- Numeric calculations
- Materiality rules
- Variance direction rules
- Safe handling of zero denominators
- Formatting and validation support

Future AI functionality should be responsible for:

- Explaining variance drivers in plain language
- Interpreting ambiguous business context
- Drafting narrative commentary
- Reasoning from supporting evidence

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

## Current Limitations

- Supports one manually entered variance scenario at a time.
- Direction logic assumes an expense account.
- No saved scenarios or database persistence.
- No AI analysis or narrative generation.
- No file upload or spreadsheet ingestion.
- No automated tests yet.

## Roadmap

- V1 — Deterministic variance engine
- V2 — AI API integration
- V3 — Structured JSON output
- V4 — Supporting evidence and driver analysis
- V5 — Validation and guardrails
- V6 — Production-quality UI
- V7 — Public deployment
