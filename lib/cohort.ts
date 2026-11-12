/** Training-institute cohort tags for verified workers (pilot). */

export const COHORT_OPTIONS = [
  { value: "gtmi", label: "GTMI" },
  { value: "uset", label: "USET" },
  { value: "gthi", label: "GTHI" },
] as const;

export type CohortSource = (typeof COHORT_OPTIONS)[number]["value"];

const LABEL: Record<string, string> = {
  gtmi: "GTMI",
  uset: "USET",
  gthi: "GTHI",
};

export function cohortLabel(source: string | null | undefined): string | null {
  if (!source) return null;
  const key = String(source).toLowerCase().trim();
  return LABEL[key] || null;
}

export function isCohortSource(v: string): v is CohortSource {
  return COHORT_OPTIONS.some((o) => o.value === v);
}
