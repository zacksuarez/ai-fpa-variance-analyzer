export function getVarianceDriverStatus(
  contributorEvidenceSufficient: boolean
): string {
  return contributorEvidenceSufficient
    ? "CONTRIBUTORS IDENTIFIED — underlying causal drivers remain unresolved."
    : "CONTRIBUTORS UNRESOLVED — supporting evidence is insufficient, and underlying causal drivers remain unresolved.";
}
