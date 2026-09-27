"use client";

import { ChangeEvent, useMemo, useState } from "react";
import {
  calculateVariance,
  type NullablePercentage,
  type VarianceDirection,
  type VarianceInput
} from "@/lib/variance";
import {
  invalidateAiAnalysis,
  idleAiAnalysisState,
  type AnalysisValidationStatus,
  type AiAnalysisState
} from "@/lib/ai-analysis-state";
import {
  type ManagementAnalysis
} from "@/lib/management-analysis-schema";
import {
  calculateSupportingEvidence,
  defaultSupportingDetailRows,
  type SupportingDetailInput
} from "@/lib/supporting-detail";
import { getVarianceDriverStatus } from "@/lib/variance-driver-status";

type FormState = {
  account: string;
  period: string;
  actual: string;
  forecast: string;
  priorYear: string;
  materialityPercent: string;
  materialityAmount: string;
};

type SupportRowState = {
  id: string;
  name: string;
  actual: string;
  forecast: string;
};

type NumericField =
  | "actual"
  | "forecast"
  | "priorYear"
  | "materialityPercent"
  | "materialityAmount";

const defaultFormState: FormState = {
  account: "Software Expense",
  period: "August 2026",
  actual: "625000",
  forecast: "500000",
  priorYear: "450000",
  materialityPercent: "10",
  materialityAmount: "50000"
};

const defaultSupportRows: SupportRowState[] = defaultSupportingDetailRows.map(
  (row) => ({
    id: row.id,
    name: row.name,
    actual: String(row.actual),
    forecast: String(row.forecast)
  })
);

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const percentageFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1
});

function parseNumericField(value: string): number | null {
  const trimmed = value.trim();

  if (trimmed === "") {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildVarianceInput(formState: FormState): VarianceInput | null {
  const actual = parseNumericField(formState.actual);
  const forecast = parseNumericField(formState.forecast);
  const priorYear = parseNumericField(formState.priorYear);
  const materialityPercent = parseNumericField(formState.materialityPercent);
  const materialityAmount = parseNumericField(formState.materialityAmount);

  if (
    actual === null ||
    forecast === null ||
    priorYear === null ||
    materialityPercent === null ||
    materialityAmount === null
  ) {
    return null;
  }

  return {
    account: formState.account,
    period: formState.period,
    actual,
    forecast,
    priorYear,
    materialityPercent,
    materialityAmount
  };
}

function getNumericErrors(formState: FormState): Partial<Record<NumericField, string>> {
  const numericFields: NumericField[] = [
    "actual",
    "forecast",
    "priorYear",
    "materialityPercent",
    "materialityAmount"
  ];

  return numericFields.reduce<Partial<Record<NumericField, string>>>(
    (errors, field) => {
      if (parseNumericField(formState[field]) === null) {
        errors[field] = "Enter a valid number.";
      }

      return errors;
    },
    {}
  );
}

function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

function formatPercentage(value: NullablePercentage): string {
  if (value === null) {
    return "N/A - denominator is zero";
  }

  return `${percentageFormatter.format(value)}%`;
}

function directionClassName(direction: VarianceDirection): string {
  return `status-pill status-${direction.toLowerCase()}`;
}

function formatReconciliationStatus(reconciles: boolean): string {
  return reconciles ? "Reconciled" : "Not reconciled";
}

function formatDriverVariance(value: number): string {
  const direction = value > 0 ? "unfavorable" : value < 0 ? "favorable" : "neutral";
  return `${formatCurrency(Math.abs(value))} ${direction}`;
}

function buildSupportingDetailInputs(
  rows: SupportRowState[]
): SupportingDetailInput[] | null {
  const parsedRows: SupportingDetailInput[] = [];

  for (const row of rows) {
    const actual = parseNumericField(row.actual);
    const forecast = parseNumericField(row.forecast);

    if (row.name.trim() === "" || actual === null || forecast === null) {
      return null;
    }

    parsedRows.push({
      id: row.id,
      name: row.name.trim(),
      actual,
      forecast
    });
  }

  return parsedRows;
}

function getSupportRowErrors(
  rows: SupportRowState[]
): Record<string, Partial<Record<"name" | "actual" | "forecast", string>>> {
  return rows.reduce<Record<string, Partial<Record<"name" | "actual" | "forecast", string>>>>(
    (errors, row) => {
      const rowErrors: Partial<Record<"name" | "actual" | "forecast", string>> = {};

      if (row.name.trim() === "") {
        rowErrors.name = "Required.";
      }

      if (parseNumericField(row.actual) === null) {
        rowErrors.actual = "Enter a valid number.";
      }

      if (parseNumericField(row.forecast) === null) {
        rowErrors.forecast = "Enter a valid number.";
      }

      if (Object.keys(rowErrors).length > 0) {
        errors[row.id] = rowErrors;
      }

      return errors;
    },
    {}
  );
}

export default function Home() {
  const [formState, setFormState] = useState<FormState>(defaultFormState);
  const [supportRows, setSupportRows] = useState<SupportRowState[]>(defaultSupportRows);
  const [aiState, setAiState] = useState<AiAnalysisState>(idleAiAnalysisState);

  const numericErrors = useMemo(() => getNumericErrors(formState), [formState]);
  const varianceInput = useMemo(() => buildVarianceInput(formState), [formState]);
  const supportRowErrors = useMemo(
    () => getSupportRowErrors(supportRows),
    [supportRows]
  );
  const supportingDetailInputs = useMemo(
    () => buildSupportingDetailInputs(supportRows),
    [supportRows]
  );
  const varianceResult = useMemo(
    () => (varianceInput === null ? null : calculateVariance(varianceInput)),
    [varianceInput]
  );
  const supportingEvidence = useMemo(
    () =>
      varianceResult === null || supportingDetailInputs === null
        ? null
        : calculateSupportingEvidence(supportingDetailInputs, varianceResult),
    [supportingDetailInputs, varianceResult]
  );

  function updateField(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setFormState((current) => ({
      ...current,
      [name]: value
    }));
    setAiState(invalidateAiAnalysis());
  }

  function resetDefaults() {
    setFormState(defaultFormState);
    setSupportRows(defaultSupportRows);
    setAiState(invalidateAiAnalysis());
  }

  function updateSupportRow(
    id: string,
    field: "name" | "actual" | "forecast",
    value: string
  ) {
    setSupportRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
    setAiState(invalidateAiAnalysis());
  }

  function addSupportRow() {
    setSupportRows((current) => [
      ...current,
      {
        id: `support-${Date.now()}`,
        name: "",
        actual: "0",
        forecast: "0"
      }
    ]);
    setAiState(invalidateAiAnalysis());
  }

  function removeSupportRow(id: string) {
    setSupportRows((current) => current.filter((row) => row.id !== id));
    setAiState(invalidateAiAnalysis());
  }

  function isManagementAnalysis(value: unknown): value is ManagementAnalysis {
    if (typeof value !== "object" || value === null) {
      return false;
    }

    const analysis = value as Partial<Record<keyof ManagementAnalysis, unknown>>;
    const financials = analysis.verifiedFinancials;

    if (typeof financials !== "object" || financials === null) {
      return false;
    }

    const verifiedFinancials = financials as Partial<
      ManagementAnalysis["verifiedFinancials"]
    >;

    return (
      typeof analysis.executiveCommentary === "string" &&
      Array.isArray(analysis.knownFacts) &&
      analysis.knownFacts.every((item) => typeof item === "string") &&
      typeof analysis.rootCauseKnown === "boolean" &&
      Array.isArray(analysis.evidenceBasedDrivers) &&
      analysis.evidenceBasedDrivers.every(
        (driver) =>
          typeof driver === "object" &&
          driver !== null &&
          "name" in driver &&
          typeof driver.name === "string" &&
          "varianceDollars" in driver &&
          typeof driver.varianceDollars === "number" &&
          Number.isFinite(driver.varianceDollars) &&
          "contributionPercent" in driver &&
          (driver.contributionPercent === null ||
            (typeof driver.contributionPercent === "number" &&
              Number.isFinite(driver.contributionPercent))) &&
          "contributionSummary" in driver &&
          typeof driver.contributionSummary === "string"
      ) &&
      Array.isArray(analysis.unknownDrivers) &&
      analysis.unknownDrivers.every((item) => typeof item === "string") &&
      Array.isArray(analysis.recommendedFollowUp) &&
      analysis.recommendedFollowUp.every((item) => typeof item === "string") &&
      typeof verifiedFinancials.forecastVarianceDollars === "number" &&
      (verifiedFinancials.forecastVariancePercent === null ||
        typeof verifiedFinancials.forecastVariancePercent === "number") &&
      typeof verifiedFinancials.material === "boolean" &&
      typeof verifiedFinancials.contributorEvidenceSufficient ===
        "boolean" &&
      typeof verifiedFinancials.actualReconciles === "boolean" &&
      typeof verifiedFinancials.forecastReconciles === "boolean" &&
      typeof verifiedFinancials.varianceReconciles === "boolean"
    );
  }

  function isValidationStatus(
    value: unknown
  ): value is AnalysisValidationStatus {
    return (
      typeof value === "object" &&
      value !== null &&
      "schemaValidation" in value &&
      value.schemaValidation === "Passed" &&
      "businessGuardrails" in value &&
      value.businessGuardrails === "Passed"
    );
  }

  async function generateAiCommentary() {
    if (varianceInput === null || supportingDetailInputs === null) {
      setAiState({
        status: "error",
        analysis: null,
        validation: null,
        error: "Enter valid top-level and supporting-detail inputs before requesting AI commentary."
      });
      return;
    }

    setAiState({
      status: "loading",
      analysis: null,
      validation: null,
      error: ""
    });

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...varianceInput,
          supportingDetails: supportingDetailInputs
        })
      });

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "AI analysis failed. Please try again.";

        throw new Error(message);
      }

      if (
        typeof data !== "object" ||
        data === null ||
        !("analysis" in data) ||
        !isManagementAnalysis(data.analysis) ||
        !("validation" in data) ||
        !isValidationStatus(data.validation)
      ) {
        throw new Error(
          "AI analysis returned an invalid structured result. Please try again."
        );
      }

      setAiState({
        status: "success",
        analysis: data.analysis,
        validation: data.validation,
        error: ""
      });
    } catch (error) {
      setAiState({
        status: "error",
        analysis: null,
        validation: null,
        error:
          error instanceof Error
            ? error.message
            : "Network failure while requesting AI commentary."
      });
    }
  }

  return (
    <main className="page-shell">
      <div className="app-frame">
        <header className="hero" aria-labelledby="page-title">
          <div className="hero-copy">
            <p className="eyebrow">FP&amp;A Engineering Portfolio</p>
            <h1 id="page-title">AI FP&amp;A Variance Analyzer</h1>
            <p className="subtitle">Deterministic Finance + Grounded AI Analysis</p>
            <p className="intro">
              A portfolio application demonstrating how deterministic financial
              logic, verified supporting evidence, structured AI outputs, and
              business guardrails work together in an FP&amp;A workflow.
            </p>
          </div>
          <div className="hero-chips" aria-label="Application capabilities">
            <span>V6</span>
            <span>Structured outputs</span>
            <span>Guardrail validated</span>
            <span>Evaluated</span>
          </div>
        </header>

        <section className="workflow-band" aria-labelledby="workflow-heading">
          <div className="workflow-heading">
            <p className="section-kicker">How this works</p>
            <h2 id="workflow-heading">Trusted facts first. AI interpretation second.</h2>
          </div>
          <ol className="workflow-list">
            <li>
              <span className="workflow-number">01</span>
              <div>
                <strong>Calculate</strong>
                <p>TypeScript calculates variance, direction, and materiality.</p>
              </div>
            </li>
            <li>
              <span className="workflow-number">02</span>
              <div>
                <strong>Reconcile</strong>
                <p>Supporting detail is reconciled to trusted totals.</p>
              </div>
            </li>
            <li>
              <span className="workflow-number">03</span>
              <div>
                <strong>Interpret</strong>
                <p>AI interprets only the server-verified evidence package.</p>
              </div>
            </li>
            <li>
              <span className="workflow-number">04</span>
              <div>
                <strong>Validate</strong>
                <p>Schema and business guardrails check every structured claim.</p>
              </div>
            </li>
          </ol>
        </section>

        <div className="workspace">
          <section className="panel" aria-labelledby="input-heading">
            <div className="panel-header">
              <p className="section-kicker">01 · Financial inputs</p>
              <h2 id="input-heading">Variance Inputs</h2>
              <p>Define one expense scenario and the thresholds used to assess it.</p>
            </div>

            <form className="form-grid">
              <p className="form-section-label">Scenario</p>
              <div className="field">
                <label htmlFor="account">Account / Category</label>
                <input
                  id="account"
                  name="account"
                  type="text"
                  maxLength={120}
                  value={formState.account}
                  onChange={updateField}
                />
              </div>

              <div className="field">
                <label htmlFor="period">Period</label>
                <input
                  id="period"
                  name="period"
                  type="text"
                  maxLength={80}
                  value={formState.period}
                  onChange={updateField}
                />
              </div>

              <p className="form-section-label">Financial values</p>
              <div className="field">
                <label htmlFor="actual">Actual</label>
                <input
                  id="actual"
                  name="actual"
                  type="number"
                  inputMode="decimal"
                  value={formState.actual}
                  onChange={updateField}
                  aria-describedby={numericErrors.actual ? "actual-error" : undefined}
                />
                {numericErrors.actual ? (
                  <span className="field-error" id="actual-error">
                    {numericErrors.actual}
                  </span>
                ) : null}
              </div>

              <div className="field">
                <label htmlFor="forecast">Forecast</label>
                <input
                  id="forecast"
                  name="forecast"
                  type="number"
                  inputMode="decimal"
                  value={formState.forecast}
                  onChange={updateField}
                  aria-describedby={
                    numericErrors.forecast ? "forecast-error" : undefined
                  }
                />
                {numericErrors.forecast ? (
                  <span className="field-error" id="forecast-error">
                    {numericErrors.forecast}
                  </span>
                ) : null}
              </div>

              <div className="field">
                <label htmlFor="priorYear">Prior Year</label>
                <input
                  id="priorYear"
                  name="priorYear"
                  type="number"
                  inputMode="decimal"
                  value={formState.priorYear}
                  onChange={updateField}
                  aria-describedby={
                    numericErrors.priorYear ? "prior-year-error" : undefined
                  }
                />
                {numericErrors.priorYear ? (
                  <span className="field-error" id="prior-year-error">
                    {numericErrors.priorYear}
                  </span>
                ) : null}
              </div>

              <p className="form-section-label">Materiality settings</p>
              <div className="settings-grid">
                <div className="field">
                  <label htmlFor="materialityPercent">Materiality %</label>
                  <input
                    id="materialityPercent"
                    name="materialityPercent"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={formState.materialityPercent}
                    onChange={updateField}
                    aria-describedby={
                      numericErrors.materialityPercent
                        ? "materiality-percent-error"
                        : undefined
                    }
                  />
                  {numericErrors.materialityPercent ? (
                    <span className="field-error" id="materiality-percent-error">
                      {numericErrors.materialityPercent}
                    </span>
                  ) : null}
                </div>

                <div className="field">
                  <label htmlFor="materialityAmount">Materiality $</label>
                  <input
                    id="materialityAmount"
                    name="materialityAmount"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={formState.materialityAmount}
                    onChange={updateField}
                    aria-describedby={
                      numericErrors.materialityAmount
                        ? "materiality-amount-error"
                        : undefined
                    }
                  />
                  {numericErrors.materialityAmount ? (
                    <span className="field-error" id="materiality-amount-error">
                      {numericErrors.materialityAmount}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={resetDefaults}
                >
                  Reset defaults
                </button>
              </div>
            </form>
          </section>

          <section className="panel" aria-labelledby="results-heading">
            <div className="panel-header">
              <div className="panel-heading-row">
                <div>
                  <p className="section-kicker">02 · Deterministic engine</p>
                  <h2 id="results-heading">Variance Results</h2>
                </div>
                <span className="trust-badge">Calculated by TypeScript</span>
              </div>
              <p>These values are calculated locally from the financial inputs.</p>
            </div>

            <div className="results">
              {varianceResult === null ? (
                <div className="calculation-note" role="alert">
                  <p>Enter valid numeric values to calculate variance results.</p>
                </div>
              ) : (
                <>
                  <div className="summary-strip" aria-label="Scenario summary">
                    <div className="metric">
                      <div className="metric-label">Account</div>
                      <div className="metric-value">{varianceResult.account}</div>
                    </div>
                    <div className="metric">
                      <div className="metric-label">Period</div>
                      <div className="metric-value">{varianceResult.period}</div>
                    </div>
                    <div className="metric">
                      <div className="metric-label">Material</div>
                      <div className="metric-value">
                        {varianceResult.isMaterial ? "YES" : "NO"}
                      </div>
                    </div>
                  </div>

                  <div className="summary-strip" aria-label="Financial inputs">
                    <div className="metric">
                      <div className="metric-label">Actual</div>
                      <div className="metric-value">
                        {formatCurrency(varianceResult.actual)}
                      </div>
                    </div>
                    <div className="metric">
                      <div className="metric-label">Forecast</div>
                      <div className="metric-value">
                        {formatCurrency(varianceResult.forecast)}
                      </div>
                    </div>
                    <div className="metric">
                      <div className="metric-label">Prior Year</div>
                      <div className="metric-value">
                        {formatCurrency(varianceResult.priorYear)}
                      </div>
                    </div>
                  </div>

                  <div className="variance-grid">
                    <div className="variance-block variance-block-primary">
                      <p className="variance-label">Actual vs Forecast</p>
                      <h3>Forecast variance</h3>
                      <div className="primary-variance-value">
                        {formatCurrency(varianceResult.forecastVarianceAmount)}
                      </div>
                      <div className="primary-variance-meta">
                        <span>{formatPercentage(varianceResult.forecastVariancePercent)}</span>
                        <span className={directionClassName(varianceResult.forecastDirection)}>
                          {varianceResult.forecastDirection}
                        </span>
                      </div>
                      <div className="rows">
                        <div className="result-row"><span>Compared with</span><span>{formatCurrency(varianceResult.forecast)}</span></div>
                      </div>
                    </div>

                    <div className="variance-block">
                      <p className="variance-label">Actual vs Prior Year</p>
                      <h3>Prior year variance</h3>
                      <div className="rows">
                        <div className="result-row">
                          <span>Variance $</span>
                          <span>
                            {formatCurrency(
                              varianceResult.priorYearVarianceAmount
                            )}
                          </span>
                        </div>
                        <div className="result-row">
                          <span>Variance %</span>
                          <span>
                            {formatPercentage(
                              varianceResult.priorYearVariancePercent
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="material-band">
                    <div>
                      <strong>Material</strong>
                      <p>
                        YES when forecast variance exceeds either the percentage
                        or dollar materiality threshold.
                      </p>
                    </div>
                    <div className="material-answer">
                      {varianceResult.isMaterial ? "YES" : "NO"}
                    </div>
                  </div>

                  <div className="calculation-note">
                    <p>
                      Direction is evaluated for the V1 expense use case only:
                      Actual above Forecast is unfavorable; Actual below Forecast
                      is favorable.
                    </p>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>

        <section className="panel support-panel" aria-labelledby="support-heading">
          <div className="panel-header">
            <div className="panel-heading-row">
              <div>
                <p className="section-kicker">03 · Supporting evidence</p>
                <h2 id="support-heading">Supporting Detail</h2>
              </div>
              <span className="calculated-key">Calculated fields are read-only</span>
            </div>
            <p>
              Enter the detail behind the variance. Row variance and contribution
              fields are calculated automatically.
            </p>
          </div>

          <div className="support-content">
            <div className="support-table-wrap">
              <table className="support-table">
                <thead>
                  <tr className="column-group-row">
                    <th colSpan={3} scope="colgroup">Entered evidence</th>
                    <th colSpan={3} scope="colgroup">Calculated</th>
                    <th scope="colgroup">Row</th>
                  </tr>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col" className="numeric-cell">Actual</th>
                    <th scope="col" className="numeric-cell">Forecast</th>
                    <th scope="col" className="numeric-cell">Variance $</th>
                    <th scope="col" className="numeric-cell">Variance %</th>
                    <th scope="col" className="numeric-cell">Contribution %</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {supportRows.map((row) => {
                    const calculatedRow = supportingEvidence?.rows.find(
                      (result) => result.id === row.id
                    );
                    const rowErrors = supportRowErrors[row.id] ?? {};

                    return (
                      <tr key={row.id}>
                        <td>
                          <input
                            aria-label="Support row name"
                            maxLength={200}
                            value={row.name}
                            onChange={(event) =>
                              updateSupportRow(row.id, "name", event.target.value)
                            }
                          />
                          {rowErrors.name ? (
                            <span className="field-error">{rowErrors.name}</span>
                          ) : null}
                        </td>
                        <td className="numeric-cell">
                          <input
                            aria-label={`${row.name || "Support row"} actual`}
                            type="number"
                            inputMode="decimal"
                            value={row.actual}
                            onChange={(event) =>
                              updateSupportRow(row.id, "actual", event.target.value)
                            }
                          />
                          {rowErrors.actual ? (
                            <span className="field-error">{rowErrors.actual}</span>
                          ) : null}
                        </td>
                        <td className="numeric-cell">
                          <input
                            aria-label={`${row.name || "Support row"} forecast`}
                            type="number"
                            inputMode="decimal"
                            value={row.forecast}
                            onChange={(event) =>
                              updateSupportRow(
                                row.id,
                                "forecast",
                                event.target.value
                              )
                            }
                          />
                          {rowErrors.forecast ? (
                            <span className="field-error">
                              {rowErrors.forecast}
                            </span>
                          ) : null}
                        </td>
                        <td className="numeric-cell calculated-cell">
                          {calculatedRow
                            ? formatCurrency(calculatedRow.varianceDollars)
                            : "—"}
                        </td>
                        <td className="numeric-cell calculated-cell">
                          {calculatedRow
                            ? formatPercentage(calculatedRow.variancePercent)
                            : "—"}
                        </td>
                        <td className="numeric-cell calculated-cell">
                          {calculatedRow
                            ? formatPercentage(calculatedRow.contributionPercent)
                            : "—"}
                        </td>
                        <td>
                          <button
                            className="table-button"
                            type="button"
                            aria-label={`Remove ${row.name || "support row"}`}
                            onClick={() => removeSupportRow(row.id)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="support-actions">
              <button className="secondary-button" type="button" onClick={addSupportRow}>
                Add supporting row
              </button>
              <span>{supportRows.length} supporting rows</span>
            </div>
          </div>
        </section>

        <section className="panel support-panel" aria-labelledby="reconciliation-heading">
          <div className="panel-header">
            <p className="section-kicker">04 · Reconciliation</p>
            <h2 id="reconciliation-heading">Evidence Coverage</h2>
            <p>
              Confirm how completely supporting detail represents the trusted
              financial totals before AI interpretation.
            </p>
          </div>

          <div className="results">
            {supportingEvidence === null ? (
              <div className="calculation-note" role="alert">
                <p>Enter valid top-level and supporting-detail values to reconcile.</p>
              </div>
            ) : (
              <>
                <div className="coverage-summary">
                  <div>
                    <p className="variance-label">Forecast variance represented</p>
                    <strong>{formatPercentage(supportingEvidence.evidenceCoveragePercent)}</strong>
                  </div>
                  <p>
                    {formatCurrency(supportingEvidence.supportingVarianceTotal)} of{" "}
                    {formatCurrency(supportingEvidence.topLevelForecastVariance)} is
                    represented by supporting detail.
                  </p>
                </div>

                <div className="reconciliation-grid">
                  <div className="reconciliation-item">
                    <p>Actual reconciliation</p>
                    <strong>{formatCurrency(supportingEvidence.supportActualTotal)}</strong>
                    <span className="comparison-value">
                      Trusted total {formatCurrency(supportingEvidence.topLevelActual)}
                    </span>
                    <span
                      className={
                        supportingEvidence.actualReconciles
                          ? "status-pill status-favorable"
                          : "status-pill status-unfavorable"
                      }
                    >
                      {formatReconciliationStatus(
                        supportingEvidence.actualReconciles
                      )}
                    </span>
                  </div>

                  <div className="reconciliation-item">
                    <p>Forecast reconciliation</p>
                    <strong>{formatCurrency(supportingEvidence.supportForecastTotal)}</strong>
                    <span className="comparison-value">
                      Trusted total {formatCurrency(supportingEvidence.topLevelForecast)}
                    </span>
                    <span
                      className={
                        supportingEvidence.forecastReconciles
                          ? "status-pill status-favorable"
                          : "status-pill status-unfavorable"
                      }
                    >
                      {formatReconciliationStatus(
                        supportingEvidence.forecastReconciles
                      )}
                    </span>
                  </div>

                  <div className="reconciliation-item">
                    <p>Variance reconciliation</p>
                    <strong>{formatCurrency(supportingEvidence.supportingVarianceTotal)}</strong>
                    <span className="comparison-value">
                      Unexplained {formatCurrency(supportingEvidence.unexplainedVariance)}
                    </span>
                    <span
                      className={
                        supportingEvidence.varianceReconciles
                          ? "status-pill status-favorable"
                          : "status-pill status-unfavorable"
                      }
                    >
                      {formatReconciliationStatus(supportingEvidence.varianceReconciles)}
                    </span>
                  </div>

                  <div className="reconciliation-item reconciliation-item-emphasis">
                    <p>Contributor evidence</p>
                    <strong>
                      {supportingEvidence.evidenceSufficient
                        ? "Sufficient"
                        : "Insufficient"}
                    </strong>
                    <span className="comparison-value">
                      Financial contributor support
                    </span>
                    <span
                      className={
                        supportingEvidence.evidenceSufficient
                          ? "status-pill status-favorable"
                          : "status-pill status-unfavorable"
                      }
                    >
                      {supportingEvidence.evidenceSufficient
                        ? "Sufficient"
                        : "Insufficient"}
                    </span>
                  </div>
                </div>

                <div className="causal-boundary-note">
                  <strong>Evidence boundary</strong>
                  <p>
                    Reconciled financial detail identifies where the variance sits.
                    It does not prove the underlying operational cause.
                  </p>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="panel ai-panel" aria-labelledby="ai-heading">
          <div className="panel-header">
            <div className="panel-heading-row">
              <div>
                <p className="section-kicker">05 · Bounded interpretation</p>
                <h2 id="ai-heading">AI Management Analysis</h2>
              </div>
              <span className="trust-badge">Guardrail checked</span>
            </div>
            <p>
              AI receives server-verified financial results and supporting
              evidence. It does not own the underlying calculations.
            </p>
          </div>

          <div className="ai-content">
            <div className="ai-trust-line">
              <span aria-hidden="true">01</span>
              <p>
                Responses must match the enforced schema and pass deterministic
                business guardrails before they appear here.
              </p>
            </div>
            <div className="ai-actions">
              <button
                className="primary-button"
                type="button"
                disabled={
                  varianceInput === null ||
                  supportingDetailInputs === null ||
                  aiState.status === "loading"
                }
                onClick={generateAiCommentary}
              >
                {aiState.status === "loading"
                  ? "Generating structured analysis..."
                  : "Generate AI Commentary"}
              </button>
              {varianceInput === null || supportingDetailInputs === null ? (
                <span className="ai-inline-note">
                  Enter valid financial and supporting-detail inputs first.
                </span>
              ) : null}
            </div>

            {aiState.status === "idle" ? (
              <div className="ai-placeholder">
                <strong>Ready for grounded analysis</strong>
                <p>Generate commentary when the evidence is ready. Any input change clears prior analysis so stale commentary is never retained.</p>
              </div>
            ) : null}

            {aiState.status === "loading" ? (
              <div className="ai-placeholder ai-loading" role="status">
                <span className="loading-indicator" aria-hidden="true" />
                <div>
                  <strong>Preparing management analysis</strong>
                  <p>Interpreting verified evidence and validating structured claims...</p>
                </div>
              </div>
            ) : null}

            {aiState.status === "error" ? (
              <div className="ai-error" role="alert">
                <strong>Unable to generate commentary</strong>
                <p>{aiState.error}</p>
              </div>
            ) : null}

            {aiState.status === "success" && aiState.analysis ? (
              <div className="ai-response" aria-live="polite">
                <div className="analysis-status-bar">
                  <strong>Validated management output</strong>
                  <span>Schema passed · Business guardrails passed</span>
                </div>

                <div className="ai-section ai-section-featured">
                  <h3>Executive Commentary</h3>
                  <p>{aiState.analysis.executiveCommentary}</p>
                </div>

                <div className="ai-section ai-section-compact">
                  <h3>Known Facts</h3>
                  <ul>
                    {aiState.analysis.knownFacts.map((fact) => (
                      <li key={fact}>{fact}</li>
                    ))}
                  </ul>
                </div>

                <div className="ai-section ai-section-compact">
                  <h3>Variance Contributor Status</h3>
                  <div className="root-cause-status">
                    {getVarianceDriverStatus(
                      supportingEvidence?.evidenceSufficient ?? false
                    )}
                  </div>
                </div>

                <div className="ai-section ai-section-wide">
                  <h3>Evidence-Based Drivers</h3>
                  {aiState.analysis.evidenceBasedDrivers.length > 0 ? (
                    <div className="driver-list">
                      {aiState.analysis.evidenceBasedDrivers.map((driver) => (
                        <div className="driver-card" key={driver.name}>
                          <div className="driver-card-header">
                            <strong>{driver.name}</strong>
                            <span>Verified contribution</span>
                          </div>
                          <div className="driver-metrics">
                            <span>{formatDriverVariance(driver.varianceDollars)}</span>
                            <span>
                              {formatPercentage(driver.contributionPercent)} of total variance
                            </span>
                          </div>
                          <p>{driver.contributionSummary}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No evidence-supported drivers were identified.</p>
                  )}
                </div>

                <div className="ai-section ai-section-compact">
                  <h3>Unresolved Causal Drivers</h3>
                  <ul>
                    {aiState.analysis.unknownDrivers.map((driver) => (
                      <li key={driver}>{driver}</li>
                    ))}
                  </ul>
                </div>

                <div className="ai-section ai-section-compact">
                  <h3>Recommended Follow-Up</h3>
                  <ul>
                    {aiState.analysis.recommendedFollowUp.map((followUp) => (
                      <li key={followUp}>{followUp}</li>
                    ))}
                  </ul>
                </div>

                <details className="developer-view">
                  <summary>Developer View</summary>
                  <div className="developer-status-grid">
                    <span><strong>Schema validation</strong>{aiState.validation?.schemaValidation}</span>
                    <span><strong>Business guardrails</strong>{aiState.validation?.businessGuardrails}</span>
                    <span><strong>Evidence coverage</strong>{supportingEvidence ? formatPercentage(supportingEvidence.evidenceCoveragePercent) : "Unavailable"}</span>
                  </div>
                  <pre>
                    {JSON.stringify(
                      {
                        analysis: aiState.analysis,
                        validation: aiState.validation
                      },
                      null,
                      2
                    )}
                  </pre>
                </details>
              </div>
            ) : null}
          </div>
        </section>

        <section className="trust-section" aria-labelledby="trust-heading">
          <div className="trust-section-heading">
            <p className="section-kicker">Trust &amp; validation</p>
            <h2 id="trust-heading">Controls around the model</h2>
            <p>AI language remains bounded by higher-trust application logic.</p>
          </div>
          <ul className="trust-list">
            <li><span>PASS</span>Financial calculations are deterministic</li>
            <li><span>PASS</span>Supporting evidence is reconciled</li>
            <li><span>PASS</span>AI output follows an enforced schema</li>
            <li><span>PASS</span>Business guardrails validate model claims</li>
            <li><span>PASS</span>Adversarial and regression scenarios are evaluated</li>
          </ul>
        </section>

        <section className="portfolio-note" aria-labelledby="portfolio-heading">
          <div>
            <p className="section-kicker">Engineering portfolio</p>
            <h2 id="portfolio-heading">Why This Project Matters</h2>
          </div>
          <p>
            This project demonstrates deterministic and probabilistic system
            design, OpenAI API integration, structured outputs, evidence
            grounding, business guardrails, evaluation, and prompt-injection-aware
            data handling in a focused finance workflow.
          </p>
        </section>
      </div>
    </main>
  );
}
