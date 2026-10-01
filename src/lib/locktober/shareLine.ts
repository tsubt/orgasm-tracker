import type { LocktoberCalendarDay } from "./calendar";

export function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${Math.abs(count) === 1 ? singular : plural}`;
}

export function lockedHoursLabel(calendar: LocktoberCalendarDay[]) {
  const minutes = calendar.reduce((sum, day) => sum + (day.lockedMinutes ?? 0), 0);
  if (minutes > 0 && minutes < 60) return "<1 hour";
  return countLabel(Math.floor(minutes / 60), "hour", "hours");
}

/** Plain-text line for the public page subtitle and the social card. */
export function locktoberShareDescription(
  calendar: LocktoberCalendarDay[],
  stats: { points: number; daysLeft: number | null },
) {
  const parts = [
    `🔒 ${lockedHoursLabel(calendar)}`,
    `◆ ${countLabel(stats.points, "point", "points")}`,
  ];
  if (stats.daysLeft != null) {
    parts.push(`💦 ${countLabel(stats.daysLeft, "day", "days")} left`);
  }
  return parts.join(" · ");
}
