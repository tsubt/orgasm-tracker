import {
  LocktoberCadence,
  LocktoberCumDayStatus,
  LocktoberTaskKind,
  LocktoberTaskMode,
  OrgasmType,
} from "@prisma/client";
import dayjs, { Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const ORGASM_TYPES = new Set<string>(Object.values(OrgasmType));

export type TierSnapshot = {
  label: string;
  points: number;
  orgasmType: OrgasmType | null;
  expectsLocked: boolean;
  sortOrder: number;
};

export type CompletionSnapshot = {
  title: string;
  kind: LocktoberTaskKind;
  points: number | null;
  mode: LocktoberTaskMode;
  cadence: LocktoberCadence;
  maxCompletions: number | null;
  maxPoints: number | null;
  noteRequired: boolean;
  deadlineMinute?: number | null;
  missPenalty?: number;
  deadlineMiss?: boolean;
};

export type CumDayInput = {
  id: string;
  date: string;
  status: LocktoberCumDayStatus;
  pointsAtLock: number | null;
  tierSnapshot: TierSnapshot[] | null;
  claimedTierLabel: string | null;
  claimedAt: Date | string | null;
};

export type BarView = {
  /** Points since the latest cum-day midnight. This is the live bar. */
  points: number;
  /** A cum day has started and its reward is still unclaimed. */
  locked: boolean;
  /** Tiers drawn on the live bar. */
  tiers: TierSnapshot[];
  /** Highest tier of the waiting reward. Null when that reward is Denial, or when none is waiting. */
  reached: TierSnapshot | null;
  /** Points that decide the waiting reward. Null when none is waiting. */
  rewardPoints: number | null;
  /** Tier list frozen for the waiting reward. */
  rewardTiers: TierSnapshot[] | null;
  cumDayId: string | null;
  cumDayDate: string | null;
  cumDayStatus: LocktoberCumDayStatus | null;
  /** Days until the next cum day that has not started yet. */
  daysLeft: number | null;
};

export function dateOnlyString(date: Date | string): string {
  return dayjs.utc(date).format("YYYY-MM-DD");
}

export function dateOnlyToDb(yyyyMmDd: string): Date {
  return new Date(`${yyyyMmDd}T00:00:00.000Z`);
}

export function isValidDateOnly(value: string): boolean {
  return dayjs(value, "YYYY-MM-DD", true).isValid();
}

export function isOctoberDate(value: string, year: number): boolean {
  return isValidDateOnly(value) && value.startsWith(`${year}-10-`);
}

export function octoberStart(year: number, tz: string): Dayjs {
  return dayjs.tz(`${year}-10-01 00:00`, tz);
}

/** Whole hours since 1 October in the challenge timezone. Used to version share links. */
export function hoursSinceChallengeStart(year: number, tz: string, now: Dayjs = dayjs()): number {
  return Math.max(0, now.diff(octoberStart(year, tz), "hour"));
}

export function octoberEnd(year: number, tz: string): Dayjs {
  return dayjs.tz(`${year}-11-01 00:00`, tz);
}

export function septemberStart(year: number, tz: string): Dayjs {
  return dayjs.tz(`${year}-09-01 00:00`, tz);
}

export function cumDayInstant(yyyyMmDd: string, tz: string): Dayjs {
  return dayjs.tz(`${yyyyMmDd} 00:00`, tz);
}

export function octoberDates(year: number): string[] {
  return Array.from({ length: 31 }, (_, index) => {
    const day = String(index + 1).padStart(2, "0");
    return `${year}-10-${day}`;
  });
}

/** A cum day is fixed once it has started, or once it is locked, claimed, or skipped. */
export function cumDayIsFixed(
  day: { date: string; status: LocktoberCumDayStatus },
  tz: string,
  now: Dayjs = dayjs().tz(tz),
): boolean {
  if (day.status !== "SCHEDULED") return true;
  return !cumDayInstant(day.date, tz).isAfter(now);
}

/** October days whose local midnight has not passed yet. */
export function eligibleCumDates(year: number, tz: string, now: Dayjs): string[] {
  return octoberDates(year).filter((date) =>
    cumDayInstant(date, tz).isAfter(now),
  );
}

/**
 * Place `count` days by stepping back from 31 October.
 * The gap is 31 / count, so two orgasms land on the 16th and the 31st.
 */
export function evenlySpacedDates(dates: string[], count: number): string[] {
  if (count < 1 || count > dates.length) return [];

  const byDay = new Map<number, string>();
  for (const date of dates) {
    const day = Number(date.slice(-2));
    if (day >= 1 && day <= 31) byDay.set(day, date);
  }
  const available = [...byDay.keys()].sort((a, b) => a - b);
  if (available.length < count) return [];

  const step = 31 / count;
  const used = new Set<number>();
  const picked: number[] = [];
  for (let i = 0; i < count; i++) {
    const ideal = Math.round(31 - i * step);
    let day = nearestFreeDay(ideal, available, used);
    if (day == null) return [];
    used.add(day);
    picked.push(day);
  }

  return picked.sort((a, b) => a - b).map((day) => byDay.get(day)!);
}

function nearestFreeDay(
  ideal: number,
  available: number[],
  used: Set<number>,
): number | null {
  const free = available.filter((day) => !used.has(day));
  if (free.length === 0) return null;
  return free.reduce((best, day) => {
    return Math.abs(day - ideal) < Math.abs(best - ideal) ? day : best;
  });
}

/** Draw `count` dates once. Caller stores the result; nothing here is stable across calls. */
export function randomCumDates(
  dates: string[],
  count: number,
  random: () => number = Math.random,
): string[] {
  if (count < 1 || count > dates.length) return [];
  const pool = [...dates];
  for (let i = pool.length - 1; i > 0; i--) {
    const swap = Math.floor(random() * (i + 1));
    const current = pool[i];
    pool[i] = pool[swap];
    pool[swap] = current;
  }
  return pool.slice(0, count).sort();
}

export function isKnownTimezone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function focusYear(now: Dayjs): number {
  return now.month() >= 8 ? now.year() : now.year() - 1;
}

export function publicLocktoberShareKey(input: {
  visibility: "PRIVATE" | "LINK" | "PUBLIC";
  shareSlug: string;
  username: string | null | undefined;
}): string {
  if (input.visibility === "PUBLIC" && input.username) return input.username;
  return input.shareSlug;
}

export function setupYear(now: Dayjs): number | null {
  return now.month() === 8 || now.month() === 9 ? now.year() : null;
}

export function inDashboardWindow(now: Dayjs): boolean {
  const month = now.month();
  const date = now.date();
  if (month === 8 && date >= 15) return true;
  if (month === 9) return true;
  if (month === 10 && date <= 7) return true;
  return false;
}

export function inDashboardWindowUtc(now = new Date()): boolean {
  const month = now.getUTCMonth();
  const date = now.getUTCDate();
  if (month === 8 && date >= 14) return true;
  if (month === 9) return true;
  if (month === 10 && date <= 8) return true;
  return false;
}

export function parseTierSnapshot(value: unknown): TierSnapshot[] | null {
  if (!Array.isArray(value)) return null;
  const tiers: TierSnapshot[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    if (typeof row.label !== "string" || typeof row.points !== "number") {
      return null;
    }
    const orgasmType =
      typeof row.orgasmType === "string" && ORGASM_TYPES.has(row.orgasmType)
        ? (row.orgasmType as OrgasmType)
        : null;
    tiers.push({
      label: row.label,
      points: row.points,
      orgasmType,
      expectsLocked: Boolean(row.expectsLocked),
      sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : tiers.length,
    });
  }
  return tiers;
}

export function tiersToSnapshot(
  tiers: {
    label: string;
    points: number;
    orgasmType: OrgasmType | null;
    expectsLocked: boolean;
    sortOrder: number;
  }[],
): TierSnapshot[] {
  return [...tiers]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.points - b.points)
    .map((tier, index) => ({
      label: tier.label,
      points: tier.points,
      orgasmType: tier.orgasmType,
      expectsLocked: tier.expectsLocked,
      sortOrder: index,
    }));
}

export function highestTier(
  points: number,
  tiers: TierSnapshot[],
): TierSnapshot | null {
  const sorted = [...tiers].sort(
    (a, b) => a.points - b.points || a.sortOrder - b.sortOrder,
  );
  let reached: TierSnapshot | null = null;
  for (const tier of sorted) {
    if (points >= tier.points) reached = tier;
  }
  return reached;
}

function pointsInWindow(
  completions: { completedAt: Date | string; pointsAwarded: number }[],
  start: Dayjs,
  end: Dayjs | null,
): number {
  return completions.reduce((sum, completion) => {
    const at = dayjs(completion.completedAt);
    if (at.isBefore(start)) return sum;
    if (end && !at.isBefore(end)) return sum;
    return sum + completion.pointsAwarded;
  }, 0);
}

export function sumPoints(
  completions: { completedAt: Date | string; pointsAwarded: number }[],
  start: Dayjs,
  end: Dayjs | null,
): number {
  return Math.max(0, pointsInWindow(completions, start, end));
}

export function cyclePoints(
  completions: { completedAt: Date | string; pointsAwarded: number }[],
  start: Dayjs,
  end: Dayjs | null,
  autoPoints = 0,
): number {
  return Math.max(0, pointsInWindow(completions, start, end) + autoPoints);
}

function sortedCumDays(cumDays: CumDayInput[]): CumDayInput[] {
  return [...cumDays].sort((a, b) => a.date.localeCompare(b.date));
}

/** Reward window for one cum day: [previous cum-day midnight, this midnight). */
export function rewardWindowFor(
  year: number,
  tz: string,
  cumDays: CumDayInput[],
  day: CumDayInput,
): { start: Dayjs; end: Dayjs } {
  const sorted = sortedCumDays(cumDays);
  const index = sorted.findIndex((item) => item.date === day.date);
  const end = cumDayInstant(day.date, tz);
  const start =
    index <= 0 ? octoberStart(year, tz) : cumDayInstant(sorted[index - 1].date, tz);
  return { start, end };
}

/**
 * Live bar. Starts at the latest cum-day midnight that has arrived,
 * and ends at the next cum-day midnight.
 */
export function liveWindow(
  year: number,
  tz: string,
  cumDays: CumDayInput[],
  now: Dayjs = dayjs().tz(tz),
): { start: Dayjs; end: Dayjs | null } {
  const sorted = sortedCumDays(cumDays);
  let start = octoberStart(year, tz);
  let end: Dayjs | null = null;
  for (const day of sorted) {
    const boundary = cumDayInstant(day.date, tz);
    if (boundary.isAfter(now)) {
      end = boundary;
      break;
    }
    start = boundary;
  }
  return { start, end };
}

/** Earliest cum day that has started and is not claimed or skipped. */
export function pendingReward(
  tz: string,
  cumDays: CumDayInput[],
  now: Dayjs = dayjs().tz(tz),
): CumDayInput | null {
  for (const day of sortedCumDays(cumDays)) {
    if (day.status === "CLAIMED" || day.status === "SKIPPED") continue;
    if (cumDayInstant(day.date, tz).isAfter(now)) return null;
    return day;
  }
  return null;
}

/** Claimed and skipped reward windows reject new logs. The open and locked windows do not. */
export function windowIsFrozen(
  year: number,
  tz: string,
  cumDays: CumDayInput[],
  at: Dayjs,
): boolean {
  let start = octoberStart(year, tz);
  for (const day of sortedCumDays(cumDays)) {
    const end = cumDayInstant(day.date, tz);
    if (!at.isBefore(start) && at.isBefore(end)) {
      return day.status === "CLAIMED" || day.status === "SKIPPED";
    }
    start = end;
  }
  return false;
}

export type LockedSpan = {
  startTime: Date | string;
  endTime: Date | string | null;
};

export type TimeLockedTaskInput = {
  id: string;
  mode: LocktoberTaskMode;
  points: number | null;
  rateEvery: number | null;
  rateUnit: "SECOND" | "MINUTE" | "HOUR" | "DAY" | null;
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type LockedRateUnit = "SECOND" | "MINUTE" | "HOUR" | "DAY";

/** Missing units stay on hours so existing time-locked tasks keep their rate. */
export function lockedRateUnit(unit: string | null | undefined): LockedRateUnit {
  if (unit === "SECOND" || unit === "MINUTE" || unit === "HOUR" || unit === "DAY") return unit;
  return "HOUR";
}

export function ratePeriodMs(every: number, unit: LockedRateUnit): number {
  const base =
    unit === "SECOND" ? 1_000 : unit === "MINUTE" ? 60_000 : unit === "DAY" ? DAY_MS : HOUR_MS;
  return base * every;
}

/** Merged chastity intervals inside [start, end). */
export function lockedIntervals(
  spans: LockedSpan[],
  start: Dayjs,
  end: Dayjs,
): { from: number; to: number }[] {
  const startMs = start.valueOf();
  const endMs = end.valueOf();
  if (!(endMs > startMs)) return [];

  const merged: { from: number; to: number }[] = [];
  const intervals = spans
    .map((span) => {
      const from = Math.max(new Date(span.startTime).getTime(), startMs);
      const rawEnd = span.endTime ? new Date(span.endTime).getTime() : endMs;
      const to = Math.min(rawEnd, endMs);
      return { from, to };
    })
    .filter((interval) => interval.to > interval.from)
    .sort((a, b) => a.from - b.from || a.to - b.to);

  for (const interval of intervals) {
    const last = merged.at(-1);
    if (!last || interval.from > last.to) merged.push({ ...interval });
    else last.to = Math.max(last.to, interval.to);
  }
  return merged;
}

/** Merged chastity time that falls inside [start, end). */
export function lockedOverlapMs(spans: LockedSpan[], start: Dayjs, end: Dayjs): number {
  return lockedIntervals(spans, start, end).reduce(
    (sum, interval) => sum + (interval.to - interval.from),
    0,
  );
}

/** Minutes locked from 1 October through now, capped at the end of the month. */
export function lockedMinutesInOctober(
  year: number,
  tz: string,
  sessions: LockedSpan[],
  now: Dayjs = dayjs(),
): number {
  const start = dayjs.tz(`${year}-10-01 00:00`, tz);
  const monthEnd = start.add(1, "month");
  const end = now.isBefore(monthEnd) ? now : monthEnd;
  if (!end.isAfter(start)) return 0;
  return Math.floor(lockedOverlapMs(sessions, start, end) / 60000);
}

/** Whole periods only. 59 minutes at 1 per hour is 0. */
export function timeLockedAward(
  lockedMs: number,
  points: number,
  every: number,
  unit: LockedRateUnit,
): number {
  if (!Number.isInteger(points) || points < 1) return 0;
  if (!Number.isInteger(every) || every < 1) return 0;
  if (!(lockedMs > 0)) return 0;
  return Math.floor(lockedMs / ratePeriodMs(every, unit)) * points;
}

export function timeLockedInWindow(args: {
  tasks: TimeLockedTaskInput[];
  sessions: LockedSpan[];
  start: Dayjs;
  end: Dayjs;
}): { total: number; byTask: { taskId: string; lockedMs: number; points: number }[] } {
  const tasks = args.tasks.filter((task) => task.mode === "TIME_LOCKED");
  if (tasks.length === 0 || !args.end.isAfter(args.start)) return { total: 0, byTask: [] };
  const lockedMs = lockedOverlapMs(args.sessions, args.start, args.end);
  const byTask = tasks.map((task) => ({
    taskId: task.id,
    lockedMs,
    points: timeLockedAward(
      lockedMs,
      task.points ?? 0,
      task.rateEvery ?? 1,
      lockedRateUnit(task.rateUnit),
    ),
  }));
  return {
    total: byTask.reduce((sum, task) => sum + task.points, 0),
    byTask,
  };
}

export function timeLockedProgress(args: {
  year: number;
  tz: string;
  cumDays: CumDayInput[];
  tasks: TimeLockedTaskInput[];
  sessions: LockedSpan[];
  now?: Dayjs;
}): { total: number; byTask: { taskId: string; lockedMs: number; points: number }[] } {
  const now = (args.now ?? dayjs()).tz(args.tz);
  const live = liveWindow(args.year, args.tz, args.cumDays, now);
  const windowEnd = live.end ?? octoberEnd(args.year, args.tz);
  const end = now.isBefore(windowEnd) ? now : windowEnd;
  return timeLockedInWindow({
    tasks: args.tasks,
    sessions: args.sessions,
    start: live.start,
    end,
  });
}

/** Live points, plus the waiting reward when a cum day has started. */
export function barAutoPoints(args: {
  year: number;
  tz: string;
  cumDays: CumDayInput[];
  tasks: TimeLockedTaskInput[];
  sessions: LockedSpan[];
  now?: Dayjs;
}): { live: number; reward: number } {
  const now = (args.now ?? dayjs()).tz(args.tz);
  const live = timeLockedProgress({ ...args, now });
  const pending = pendingReward(args.tz, args.cumDays, now);
  if (!pending) return { live: live.total, reward: 0 };
  const window = rewardWindowFor(args.year, args.tz, args.cumDays, pending);
  const reward = timeLockedInWindow({
    tasks: args.tasks,
    sessions: args.sessions,
    start: window.start,
    end: window.end,
  });
  return { live: live.total, reward: reward.total };
}

/** Days until the next cum day that has not started. A started day does not count as zero. */
export function daysLeftUntilCum(
  tz: string,
  cumDays: { date: string; status: LocktoberCumDayStatus }[],
  now: Dayjs = dayjs().tz(tz),
): number | null {
  const next = [...cumDays]
    .sort((a, b) => a.date.localeCompare(b.date))
    .find((day) => cumDayInstant(day.date, tz).isAfter(now));
  if (!next) return null;
  const today = now.tz(tz).startOf("day");
  const target = cumDayInstant(next.date, tz).startOf("day");
  return Math.max(0, target.diff(today, "day"));
}

export function describeBar(
  year: number,
  tz: string,
  cumDays: CumDayInput[],
  liveTiers: TierSnapshot[],
  completions: { completedAt: Date | string; pointsAwarded: number }[],
  autoPoints = 0,
  rewardAutoPoints = 0,
  now: Dayjs = dayjs().tz(tz),
): BarView {
  const live = liveWindow(year, tz, cumDays, now);
  const points = cyclePoints(completions, live.start, live.end, autoPoints);
  const daysLeft = daysLeftUntilCum(tz, cumDays, now);
  const pending = pendingReward(tz, cumDays, now);
  if (!pending) {
    return {
      points,
      locked: false,
      tiers: liveTiers,
      reached: null,
      rewardPoints: null,
      rewardTiers: null,
      cumDayId: null,
      cumDayDate: null,
      cumDayStatus: null,
      daysLeft,
    };
  }
  const window = rewardWindowFor(year, tz, cumDays, pending);
  const rewardTiers = pending.tierSnapshot ?? liveTiers;
  const rewardPoints = cyclePoints(completions, window.start, window.end, rewardAutoPoints);
  return {
    points,
    locked: true,
    tiers: liveTiers,
    reached: highestTier(rewardPoints, rewardTiers),
    rewardPoints,
    rewardTiers,
    cumDayId: pending.id,
    cumDayDate: pending.date,
    cumDayStatus: pending.status === "LOCKED" ? "LOCKED" : pending.status,
    daysLeft,
  };
}

export function periodStart(
  now: Dayjs,
  cadence: LocktoberCadence,
  firstDayOfWeek: number,
): Dayjs {
  const dayStart = now.startOf("day");
  if (cadence === "DAILY") return dayStart;
  if (cadence === "MONTHLY") return dayStart.startOf("month");
  const diff = (now.day() - firstDayOfWeek + 7) % 7;
  return dayStart.subtract(diff, "day");
}

export function taskCapState(args: {
  taskId: string;
  mode: LocktoberTaskMode;
  cadence: LocktoberCadence;
  maxCompletions: number | null;
  maxPoints: number | null;
  completions: {
    taskId: string | null;
    completedAt: Date | string;
    pointsAwarded: number;
    deadlineMiss?: boolean;
  }[];
  now: Dayjs;
  firstDayOfWeek: number;
}): { maxed: boolean; remainingPoints: number | null } {
  const start = periodStart(args.now, args.cadence, args.firstDayOfWeek);
  const end =
    args.cadence === "DAILY"
      ? start.add(1, "day")
      : args.cadence === "MONTHLY"
        ? start.add(1, "month")
        : start.add(7, "day");
  const mine = args.completions.filter((completion) => {
    if (completion.taskId !== args.taskId || completion.deadlineMiss) return false;
    const at = dayjs(completion.completedAt);
    return !at.isBefore(start) && at.isBefore(end);
  });
  if (args.mode === "TIME_LOCKED") {
    return { maxed: false, remainingPoints: null };
  }

  const countCap = args.mode === "FIXED" ? (args.maxCompletions ?? 1) : args.maxCompletions;
  const pointsCap =
    args.mode === "PER_MINUTE" || args.mode === "ENTER_AMOUNT" ? args.maxPoints : null;
  const countMaxed = countCap != null && mine.length >= countCap;
  if (pointsCap == null) {
    return { maxed: countMaxed, remainingPoints: null };
  }
  const used = mine.reduce((sum, completion) => sum + Math.abs(completion.pointsAwarded), 0);
  const remaining = Math.max(0, pointsCap - used);
  return { maxed: countMaxed || remaining === 0, remainingPoints: remaining };
}

export function barFillPercent(points: number, tiers: { points: number }[]): number {
  const max = tiers.reduce((highest, tier) => Math.max(highest, tier.points), 0);
  if (max <= 0) return 0;
  const scale = max * 1.2;
  return Math.max(0, Math.min(100, (points / scale) * 100));
}

export function tierMarkerPercent(points: number, tiers: { points: number }[]): number {
  return barFillPercent(points, tiers);
}

export function snapshotTitle(snapshot: unknown): string {
  if (
    snapshot &&
    typeof snapshot === "object" &&
    "title" in snapshot &&
    typeof (snapshot as { title: unknown }).title === "string"
  ) {
    return (snapshot as { title: string }).title;
  }
  return "Task";
}

export function isDeadlineMiss(snapshot: unknown): boolean {
  return (
    snapshot != null &&
    typeof snapshot === "object" &&
    "deadlineMiss" in snapshot &&
    (snapshot as { deadlineMiss?: unknown }).deadlineMiss === true
  );
}
