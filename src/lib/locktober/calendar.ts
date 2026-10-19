import dayjs, { Dayjs } from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import {
  CumDayInput,
  LockedSpan,
  octoberDates,
  octoberEnd,
  octoberStart,
  cumDayInstant,
  lockedIntervals,
  lockedOverlapMs,
  lockedRateUnit,
  ratePeriodMs,
  TierSnapshot,
  TimeLockedTaskInput,
} from "./scoring";
import { tierToneName, type TierToneName } from "./tierTone";

dayjs.extend(utc);
dayjs.extend(timezone);

export type LocktoberCalendarDay = {
  date: string;
  points: number;
  cumStatus: CumDayInput["status"] | null;
  rewardLabel: string | null;
  rewardTone: TierToneName | null;
  /** Minutes caged that local day. Null until the day has started. */
  lockedMinutes: number | null;
};

/** Each cum-day boundary splits locked time. The open stretch runs up to now. */
export function scoringWindows(
  year: number,
  tz: string,
  cumDays: CumDayInput[],
  now: Dayjs,
): { start: Dayjs; end: Dayjs }[] {
  const finish = octoberEnd(year, tz);
  const cap = now.isBefore(finish) ? now : finish;
  const sorted = [...cumDays].sort((a, b) => a.date.localeCompare(b.date));
  let start = octoberStart(year, tz);
  const windows: { start: Dayjs; end: Dayjs }[] = [];

  for (const day of sorted) {
    const boundary = cumDayInstant(day.date, tz);
    if (!boundary.isAfter(start)) continue;
    if (boundary.isAfter(cap)) break;
    windows.push({ start, end: boundary });
    start = boundary;
  }

  if (cap.isAfter(start)) windows.push({ start, end: cap });
  return windows;
}

function addPoints(into: Map<string, number>, date: string, amount: number) {
  if (amount === 0) return;
  into.set(date, (into.get(date) ?? 0) + amount);
}

/** Credit each finished period on the local day it completes. Leftover time carries forward. */
function creditLockedDays(
  intervals: { from: number; to: number }[],
  points: number,
  every: number,
  unit: "SECOND" | "MINUTE" | "HOUR" | "DAY",
  tz: string,
  into: Map<string, number>,
) {
  if (!Number.isInteger(points) || points < 1) return;
  if (!Number.isInteger(every) || every < 1) return;
  const periodMs = ratePeriodMs(every, unit);
  if (!(periodMs > 0)) return;
  let bank = 0;
  for (const interval of intervals) {
    let cursor = interval.from;
    while (cursor < interval.to) {
      const dayStart = dayjs(cursor).tz(tz).startOf("day");
      const date = dayStart.format("YYYY-MM-DD");
      // Re-parse the next calendar date. add(1, "day") keeps the old offset and
      // misses the 23-hour and 25-hour days around a daylight-saving change.
      const dayEnd = dayjs.tz(`${dayStart.add(1, "day").format("YYYY-MM-DD")} 00:00`, tz).valueOf();
      const limit = Math.min(interval.to, dayEnd);
      const span = limit - cursor;
      if (!(span > 0)) break;

      const periods = Math.floor((bank + span) / periodMs);
      if (periods === 0) {
        bank += span;
        cursor = limit;
        continue;
      }

      const consumed = periods * periodMs - bank;
      const lastAt = cursor + consumed;
      // A period that lands on the next midnight belongs to that new day.
      if (lastAt === dayEnd) {
        addPoints(into, date, (periods - 1) * points);
        addPoints(into, dayjs(dayEnd).tz(tz).format("YYYY-MM-DD"), points);
      } else {
        addPoints(into, date, periods * points);
      }
      cursor = lastAt;
      bank = 0;
    }
  }
}

function claimedReward(
  day: CumDayInput,
  liveTiers: TierSnapshot[],
): { label: string; tone: TierToneName } | null {
  if (day.status !== "CLAIMED" || !day.claimedTierLabel) return null;
  const pool = day.tierSnapshot?.length ? day.tierSnapshot : liveTiers;
  const tier = pool.find((item) => item.label === day.claimedTierLabel);
  if (!tier) return { label: day.claimedTierLabel, tone: "other" };
  return { label: tier.label, tone: tierToneName(tier, pool) };
}

export function octoberCalendar(args: {
  year: number;
  tz: string;
  cumDays: CumDayInput[];
  tiers: TierSnapshot[];
  tasks: TimeLockedTaskInput[];
  sessions: LockedSpan[];
  completions: { completedAt: Date | string; pointsAwarded: number }[];
  now?: Dayjs;
}): LocktoberCalendarDay[] {
  const now = (args.now ?? dayjs()).tz(args.tz);
  const windows = scoringWindows(args.year, args.tz, args.cumDays, now);
  const points = new Map<string, number>();
  const tasks = args.tasks.filter((task) => task.mode === "TIME_LOCKED");

  for (const window of windows) {
    const intervals = lockedIntervals(args.sessions, window.start, window.end);
    for (const task of tasks) {
      creditLockedDays(
        intervals,
        task.points ?? 0,
        task.rateEvery ?? 1,
        lockedRateUnit(task.rateUnit),
        args.tz,
        points,
      );
    }
  }

  for (const completion of args.completions) {
    const at = dayjs(completion.completedAt);
    const counted = windows.some(
      (window) => !at.isBefore(window.start) && at.isBefore(window.end),
    );
    if (!counted) continue;
    const date = at.tz(args.tz).format("YYYY-MM-DD");
    if (!date.startsWith(`${args.year}-10-`)) continue;
    points.set(date, (points.get(date) ?? 0) + completion.pointsAwarded);
  }

  const cumByDate = new Map(args.cumDays.map((day) => [day.date, day]));
  return octoberDates(args.year).map((date) => {
    const cum = cumByDate.get(date) ?? null;
    const reward = cum ? claimedReward(cum, args.tiers) : null;
    const start = dayjs.tz(`${date} 00:00`, args.tz);
    const next = start.add(1, "day");
    const started = start.isBefore(now);
    const lockedMinutes = started
      ? Math.floor(lockedOverlapMs(args.sessions, start, next.isAfter(now) ? now : next) / 60000)
      : null;
    return {
      date,
      points: points.get(date) ?? 0,
      cumStatus: cum?.status ?? null,
      rewardLabel: reward?.label ?? null,
      rewardTone: reward?.tone ?? null,
      lockedMinutes,
    };
  });
}
