import type { LocktoberCalendarDay } from "./calendar";

export function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${Math.abs(count) === 1 ? singular : plural}`;
}

export function lockedHoursFromMinutes(minutes: number) {
  if (minutes > 0 && minutes < 60) return "<1 hour";
  return countLabel(Math.floor(minutes / 60), "hour", "hours");
}

export function lockedHoursLabel(calendar: LocktoberCalendarDay[]) {
  const minutes = calendar.reduce((sum, day) => sum + (day.lockedMinutes ?? 0), 0);
  return lockedHoursFromMinutes(minutes);
}

export type RewardTarget = { label: string; points: number };

/** Outcome when the bar has not reached any reward. */
export const DENIAL_LABEL = "Denial";

/** Highest reward already earned. Denial when none of the targets are reached. */
export function countdownReward(points: number, targets: RewardTarget[]): string {
  const sorted = [...targets].sort((a, b) => a.points - b.points);
  let earned: RewardTarget | null = null;
  for (const target of sorted) {
    if (points >= target.points) earned = target;
  }
  return earned?.label ?? DENIAL_LABEL;
}

export function daysLeftPhrase(daysLeft: number | null, reward: string | null) {
  if (daysLeft == null) return null;
  const days = `${countLabel(daysLeft, "day", "days")} left`;
  return reward ? `${days} until ${reward}` : days;
}

/** Points still needed for the next reward. Null once every reward is reached. */
export function nextUnlockPhrase(points: number, targets: RewardTarget[]): string | null {
  const next = [...targets]
    .sort((a, b) => a.points - b.points)
    .find((target) => target.points > points);
  if (!next) return null;
  const remaining = Math.max(0, next.points - points);
  return `Next unlock: ${next.label} (${countLabel(remaining, "point", "points")})`;
}

/** Plain-text line for the public page subtitle and the social card. */
export function locktoberShareDescription(
  calendar: LocktoberCalendarDay[],
  stats: { points: number; daysLeft: number | null; tiers?: RewardTarget[] },
) {
  const parts = [
    `🔒 ${lockedHoursLabel(calendar)}`,
    `◆ ${countLabel(stats.points, "point", "points")}`,
  ];
  const days = daysLeftPhrase(
    stats.daysLeft,
    countdownReward(stats.points, stats.tiers ?? []),
  );
  if (days) parts.push(`💦 ${days}`);
  return parts.join(" · ");
}
