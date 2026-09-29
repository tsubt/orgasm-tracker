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
  TierSnapshot,
  TimeLockedTaskInput,
} from "./scoring";
import { tierToneName, type TierToneName } from "./tierTone";

dayjs.extend(utc);
dayjs.extend(timezone);

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type LocktoberCalendarDay = {
  date: string;
  points: number;
  cumStatus: CumDayInput["status"] | null;
  rewardLabel: string | null;
  rewardTone: TierToneName | null;
  /** Minutes caged that local day. Null until the day has started. */
  lockedMinutes: number | null;
};

/** Scoring stretches between claims. A locked or upcoming cum day ends the open stretch. */
export function scoringWindows(
  year: number,
  tz: string,
  cumDays: CumDayInput[],
  now: Dayjs,
): { start: Dayjs; end: Dayjs }[] {
  const finish = octoberEnd(year, tz);
  const sorted = [...cumDays].sort((a, b) => a.date.localeCompare(b.date));
  let start = octoberStart(year, tz);
  const windows: { start: Dayjs; end: Dayjs }[] = [];

  const push = (end: Dayjs) => {
    if (end.isAfter(start)) windows.push({ start, end });
  };

  for (const day of sorted) {
    const boundary = cumDayInstant(day.date, tz);
    if (day.status === "CLAIMED" || day.status === "SKIPPED") {
      push(boundary.isBefore(finish) ? boundary : finish);
      if (day.claimedAt) {
        const closed = dayjs(day.claimedAt).tz(tz);
        if (closed.isAfter(start)) start = closed;
      }
      if (!start.isBefore(finish)) return windows;
      continue;
    }
    const cap = boundary.isAfter(now) ? now : boundary;
    push(cap.isBefore(finish) ? cap : finish);
    return windows;
  }

  push(now.isBefore(finish) ? now : finish);
  return windows;
}

function creditLockedDays(
  intervals: { from: number; to: number }[],
  points: number,
  every: number,
  unit: "HOUR" | "DAY",
  tz: string,
  into: Map<string, number>,
) {
  if (!Number.isInteger(points) || points < 1) return;
  if (!Number.isInteger(every) || every < 1) return;
  const periodMs = (unit === "DAY" ? DAY_MS : HOUR_MS) * every;
  let bank = 0;
  for (const interval of intervals) {
    let cursor = interval.from;
    while (cursor < interval.to) {
      const need = periodMs - bank;
      const room = interval.to - cursor;
      if (room < need) {
        bank += room;
        break;
      }
      cursor += need;
      bank = 0;
      const date = dayjs(cursor).tz(tz).format("YYYY-MM-DD");
      into.set(date, (into.get(date) ?? 0) + points);
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
        task.rateUnit === "DAY" ? "DAY" : "HOUR",
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
