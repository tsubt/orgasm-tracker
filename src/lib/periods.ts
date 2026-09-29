export const PERIODS = [
  "All",
  "This year",
  "This month",
  "This week",
  "Last 12 months",
  "Last 30 days",
  "Last 7 days",
] as const;

export type Period = (typeof PERIODS)[number];

export function asPeriod(value: string | undefined): Period {
  if (value && (PERIODS as readonly string[]).includes(value)) {
    return value as Period;
  }
  return "All";
}
