import type { TierSnapshot } from "./scoring";

export type TierToneName = "tap" | "ruined" | "fullLocked" | "fullOpen" | "other";

const TONE_CLASS: Record<TierToneName, { text: string; mark: string; cell: string }> = {
  tap: {
    text: "text-cyan-700 dark:text-cyan-400",
    mark: "bg-cyan-600 dark:bg-cyan-400",
    cell: "border-cyan-600 bg-cyan-600 text-white",
  },
  ruined: {
    text: "text-rose-600 dark:text-rose-400",
    mark: "bg-rose-500 dark:bg-rose-400",
    cell: "border-rose-500 bg-rose-500 text-white",
  },
  fullLocked: {
    text: "text-rose-600 dark:text-rose-500",
    mark: "bg-rose-600 dark:bg-rose-500",
    cell: "border-rose-600 bg-rose-600 text-white",
  },
  fullOpen: {
    text: "text-teal-700 dark:text-teal-400",
    mark: "bg-teal-600 dark:bg-teal-400",
    cell: "border-teal-600 bg-teal-600 text-white",
  },
  other: {
    text: "text-amber-700 dark:text-amber-400",
    mark: "bg-amber-500 dark:bg-amber-400",
    cell: "border-amber-400 bg-amber-400 text-gray-900",
  },
};

export function tierToneName(tier: TierSnapshot, tiers: TierSnapshot[]): TierToneName {
  const ruined = tiers
    .filter((item) => item.orgasmType === "RUINED")
    .sort((a, b) => a.points - b.points);
  const firstRuined = ruined[0];
  if (
    tier.orgasmType === "RUINED" &&
    firstRuined &&
    firstRuined.points === tier.points &&
    firstRuined.label === tier.label
  ) {
    return "tap";
  }
  if (tier.orgasmType === "RUINED") return "ruined";
  if (tier.orgasmType === "FULL" && !tier.expectsLocked) return "fullOpen";
  if (tier.orgasmType === "FULL") return "fullLocked";
  return "other";
}

export function tierTone(tier: TierSnapshot, tiers: TierSnapshot[]) {
  const tone = TONE_CLASS[tierToneName(tier, tiers)];
  return { text: tone.text, mark: tone.mark };
}

export function tierCellClass(tone: TierToneName): string {
  return TONE_CLASS[tone].cell;
}

export function tierMarkClass(tone: TierToneName): string {
  return TONE_CLASS[tone].mark;
}
