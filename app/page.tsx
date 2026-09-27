"use client";

import { ChangeEvent, useMemo, useState } from "react";
import {
  calculateVariance,
  type NullablePercentage,
  type VarianceDirection,
  type VarianceInput
} from "@/lib/variance";
import {
  idleAiAnalysisState,
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
  return reconciles ? "Reconciled" : "Needs review";
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
    setAiState(idleAiAnalysisState);
  }

  function resetDefaults() {
    setFormState(defaultFormState);
    setSupportRows(defaultSupportRows);
    setAiState(idleAiAnalysisState);
  }

  function updateSupportRow(
    id: string,
    field: "name" | "actual" | "forecast",
    value: string
  ) {
    setSupportRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
    setAiState(idleAiAnalysisState);
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
    setAiState(idleAiAnalysisState);
  }

  function removeSupportRow(id: string) {
    setSupportRows((current) => current.filter((row) => row.id !== id));
    setAiState(idleAiAnalysisState);
  }

  function isManagementAnalysis(value: unknown): value is ManagementAnalysis {
    if (typeof value !== "object" || value === null) {
      return false;
    }

    const analysis = value as Partial<Record<keyof ManagementAnalysis, unknown>>;

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
          "contributionSummary" in driver &&
          typeof driver.contributionSummary === "string"
      ) &&
      Array.isArray(analysis.unknownDrivers) &&
      analysis.unknownDrivers.every((item) => typeof item === "string") &&
      Array.isArray(analysis.recommendedFollowUp) &&
      analysis.recommendedFollowUp.every((item) => typeof item === "string")
    );
  }

  async function generateAiCommentary() {
    if (varianceInput === null || supportingDetailInputs === null) {
      setAiState({
        status: "error",
        analysis: null,
        error: "Enter valid top-level and supporting-detail inputs before requesting AI commentary."
      });
      return;
    }

    setAiState({
      status: "loading",
      analysis: null,
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
        !isManagementAnalysis(data.analysis)
      ) {
        throw new Error(
          "AI analysis returned an invalid structured result. Please try again."
        );
      }

      setAiState({
        status: "success",
        analysis: data.analysis,
        error: ""
      });
    } catch (error) {
      setAiState({
        status: "error",
        analysis: null,
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
        <section className="hero" aria-labelledby="page-title">
          <p className="eyebrow">FP&amp;A Portfolio Project</p>
          <h1 id="page-title">AI FP&amp;A Variance Analyzer</h1>
          <p className="subtitle">Deterministic Evidence + Structured AI Analysis — V4</p>
          <p className="intro">
            Financial calculations are verified by deterministic TypeScript. AI
            is used only for management interpretation.
          </p>
        </section>

        <div className="workspace">
          <section className="panel" aria-labelledby="input-heading">
            <div className="panel-header">
              <h2 id="input-heading">Variance Inputs</h2>
              <p>Enter one expense category and materiality threshold.</p>
            </div>

            <form className="form-grid">
              <div className="field">
                <label htmlFor="account">Account / Category</label>
                <input
                  id="account"
                  name="account"
                  type="text"
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
                  value={formState.period}
                  onChange={updateField}
                />
              </div>

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

              <div className="settings-grid">
                <div className="field">
                  <label htmlFor="materialityPercent">Materiality %</label>
                  <input
                    id="materialityPercent"
                    name="materialityPercent"
                    type="number"
                    inputMode="decimal"
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
              <h2 id="results-heading">Variance Results</h2>
              <p>All calculations are generated by deterministic TypeScript.</p>
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
                    <div className="variance-block">
                      <p className="variance-label">Actual vs Forecast</p>
                      <h3>Forecast variance</h3>
                      <div className="rows">
                        <div className="result-row">
                          <span>Variance $</span>
                          <span>
                            {formatCurrency(varianceResult.forecastVarianceAmount)}
                          </span>
                        </div>
                        <div className="result-row">
                          <span>Variance %</span>
                          <span>
                            {formatPercentage(
                              varianceResult.forecastVariancePercent
                            )}
                          </span>
                        </div>
                        <div className="result-row">
                          <span>Direction</span>
                          <span
                            className={directionClassName(
                              varianceResult.forecastDirection
                            )}
                          >
                            {varianceResult.forecastDirection}
                          </span>
                        </div>
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
            <h2 id="support-heading">Supporting Detail</h2>
            <p>
              Vendor-level support is editable, but all row variance and
              contribution calculations are deterministic.
            </p>
          </div>

          <div className="support-content">
            <div className="support-table-wrap">
              <table className="support-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Actual</th>
                    <th>Forecast</th>
                    <th>Variance $</th>
                    <th>Variance %</th>
                    <th>Contribution %</th>
                    <th>Action</th>
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
                            value={row.name}
                            onChange={(event) =>
                              updateSupportRow(row.id, "name", event.target.value)
                            }
                          />
                          {rowErrors.name ? (
                            <span className="field-error">{rowErrors.name}</span>
                          ) : null}
                        </td>
                        <td>
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
                        <td>
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
                        <td>
                          {calculatedRow
                            ? formatCurrency(calculatedRow.varianceDollars)
                            : "—"}
                        </td>
                        <td>
                          {calculatedRow
                            ? formatPercentage(calculatedRow.variancePercent)
                            : "—"}
                        </td>
                        <td>
                          {calculatedRow
                            ? formatPercentage(calculatedRow.contributionPercent)
                            : "—"}
                        </td>
                        <td>
                          <button
                            className="table-button"
                            type="button"
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

            <button className="secondary-button" type="button" onClick={addSupportRow}>
              Add row
            </button>
          </div>
        </section>

        <section className="panel support-panel" aria-labelledby="reconciliation-heading">
          <div className="panel-header">
            <h2 id="reconciliation-heading">Reconciliation / Evidence Coverage</h2>
            <p>
              Support rows must reconcile before AI can treat the contributors as
              sufficient evidence.
            </p>
          </div>

          <div className="results">
            {supportingEvidence === null ? (
              <div className="calculation-note" role="alert">
                <p>Enter valid top-level and supporting-detail values to reconcile.</p>
              </div>
            ) : (
              <>
                <div className="variance-grid">
                  <div className="variance-block">
                    <p className="variance-label">Actual Support Total</p>
                    <h3>
                      {formatCurrency(supportingEvidence.supportActualTotal)} /{" "}
                      {formatCurrency(supportingEvidence.topLevelActual)}
                    </h3>
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

                  <div className="variance-block">
                    <p className="variance-label">Forecast Support Total</p>
                    <h3>
                      {formatCurrency(supportingEvidence.supportForecastTotal)} /{" "}
                      {formatCurrency(supportingEvidence.topLevelForecast)}
                    </h3>
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
                </div>

                <div className="variance-grid">
                  <div className="variance-block">
                    <p className="variance-label">Variance Explained</p>
                    <h3>
                      {formatCurrency(supportingEvidence.supportingVarianceTotal)} /{" "}
                      {formatCurrency(supportingEvidence.topLevelForecastVariance)}
                    </h3>
                    <div className="rows">
                      <div className="result-row">
                        <span>Coverage</span>
                        <span>
                          {formatPercentage(
                            supportingEvidence.evidenceCoveragePercent
                          )}
                        </span>
                      </div>
                      <div className="result-row">
                        <span>Unexplained Variance</span>
                        <span>
                          {formatCurrency(supportingEvidence.unexplainedVariance)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="variance-block">
                    <p className="variance-label">Contributor Evidence Sufficient</p>
                    <h3>{supportingEvidence.evidenceSufficient ? "YES" : "NO"}</h3>
                    <span
                      className={
                        supportingEvidence.evidenceSufficient
                          ? "status-pill status-favorable"
                          : "status-pill status-unfavorable"
                      }
                    >
                      {supportingEvidence.varianceReconciles
                        ? "Variance reconciled"
                        : "Variance needs review"}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="panel ai-panel" aria-labelledby="ai-heading">
          <div className="panel-header">
            <h2 id="ai-heading">AI Management Analysis</h2>
            <p>
              Financial calculations are verified by deterministic TypeScript.
              AI is used only for management interpretation.
            </p>
          </div>

          <div className="ai-content">
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
                <p>
                  AI commentary is generated only when requested, then returned
                  as typed structured data for this interface.
                </p>
              </div>
            ) : null}

            {aiState.status === "loading" ? (
              <div className="ai-placeholder" role="status">
                <p>Preparing schema-validated CFO-ready analysis...</p>
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
                <div className="ai-section">
                  <h3>Executive Commentary</h3>
                  <p>{aiState.analysis.executiveCommentary}</p>
                </div>

                <div className="ai-section">
                  <h3>Known Facts</h3>
                  <ul>
                    {aiState.analysis.knownFacts.map((fact) => (
                      <li key={fact}>{fact}</li>
                    ))}
                  </ul>
                </div>

                <div className="ai-section">
                  <h3>Variance Contributor Status</h3>
                  <div className="root-cause-status">
                    {getVarianceDriverStatus(
                      supportingEvidence?.evidenceSufficient ?? false
                    )}
                  </div>
                </div>

                <div className="ai-section">
                  <h3>Evidence-Based Drivers</h3>
                  {aiState.analysis.evidenceBasedDrivers.length > 0 ? (
                    <div className="driver-list">
                      {aiState.analysis.evidenceBasedDrivers.map((driver) => (
                        <div className="driver-card" key={driver.name}>
                          <strong>{driver.name}</strong>
                          <p>{driver.contributionSummary}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No evidence-supported drivers were identified.</p>
                  )}
                </div>

                <div className="ai-section">
                  <h3>Unresolved Causal Drivers</h3>
                  <ul>
                    {aiState.analysis.unknownDrivers.map((driver) => (
                      <li key={driver}>{driver}</li>
                    ))}
                  </ul>
                </div>

                <div className="ai-section">
                  <h3>Recommended Follow-Up</h3>
                  <ul>
                    {aiState.analysis.recommendedFollowUp.map((followUp) => (
                      <li key={followUp}>{followUp}</li>
                    ))}
                  </ul>
                </div>

                <details className="developer-view">
                  <summary>Developer View</summary>
                  <pre>{JSON.stringify(aiState.analysis, null, 2)}</pre>
                </details>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
