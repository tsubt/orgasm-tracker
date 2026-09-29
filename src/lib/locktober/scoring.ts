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
  points: number;
  locked: boolean;
  tiers: TierSnapshot[];
  reached: TierSnapshot | null;
  cumDayId: string | null;
  cumDayDate: string | null;
  cumDayStatus: LocktoberCumDayStatus | null;
  /** Days until the next cum day. Zero while that day is waiting to be claimed. */
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

export type LockedSpan = {
  startTime: Date | string;
  endTime: Date | string | null;
};

export type TimeLockedTaskInput = {
  id: string;
  mode: LocktoberTaskMode;
  points: number | null;
  rateEvery: number | null;
  rateUnit: "HOUR" | "DAY" | null;
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

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

/** Whole periods only. 59 minutes at 1 per hour is 0. */
export function timeLockedAward(
  lockedMs: number,
  points: number,
  every: number,
  unit: "HOUR" | "DAY",
): number {
  if (!Number.isInteger(points) || points < 1) return 0;
  if (!Number.isInteger(every) || every < 1) return 0;
  if (!(lockedMs > 0)) return 0;
  const periodMs = (unit === "DAY" ? DAY_MS : HOUR_MS) * every;
  return Math.floor(lockedMs / periodMs) * points;
}

export function timeLockedProgress(args: {
  year: number;
  tz: string;
  cumDays: CumDayInput[];
  tasks: TimeLockedTaskInput[];
  sessions: LockedSpan[];
  now?: Dayjs;
}): { total: number; byTask: { taskId: string; lockedMs: number; points: number }[] } {
  const tasks = args.tasks.filter((task) => task.mode === "TIME_LOCKED");
  if (tasks.length === 0) return { total: 0, byTask: [] };

  const now = (args.now ?? dayjs()).tz(args.tz);
  const cycle = currentCycle(args.year, args.tz, args.cumDays);
  const windowEnd = cycle.end ?? octoberEnd(args.year, args.tz);
  const end = now.isBefore(windowEnd) ? now : windowEnd;
  const lockedMs = end.isAfter(cycle.start)
    ? lockedOverlapMs(args.sessions, cycle.start, end)
    : 0;

  const byTask = tasks.map((task) => ({
    taskId: task.id,
    lockedMs,
    points: timeLockedAward(
      lockedMs,
      task.points ?? 0,
      task.rateEvery ?? 1,
      task.rateUnit === "DAY" ? "DAY" : "HOUR",
    ),
  }));
  return {
    total: byTask.reduce((sum, task) => sum + task.points, 0),
    byTask,
  };
}

export function currentCycle(
  year: number,
  tz: string,
  cumDays: CumDayInput[],
): { start: Dayjs; end: Dayjs | null; cumDay: CumDayInput | null } {
  const sorted = [...cumDays].sort((a, b) => a.date.localeCompare(b.date));
  let start = octoberStart(year, tz);
  for (const day of sorted) {
    if (day.status === "CLAIMED" || day.status === "SKIPPED") {
      if (day.claimedAt) {
        const closed = dayjs(day.claimedAt);
        if (closed.isAfter(start)) start = closed;
      }
      continue;
    }
    return { start, end: cumDayInstant(day.date, tz), cumDay: day };
  }
  return { start, end: null, cumDay: null };
}

/** Zero on a cum day until it is claimed or skipped, then the gap until the next one. */
export function daysLeftUntilCum(
  tz: string,
  cumDays: { date: string; status: LocktoberCumDayStatus }[],
  now: Dayjs = dayjs().tz(tz),
): number | null {
  const next = [...cumDays]
    .sort((a, b) => a.date.localeCompare(b.date))
    .find((day) => day.status === "LOCKED" || day.status === "SCHEDULED");
  if (!next) return null;
  if (next.status === "LOCKED") return 0;
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
): BarView {
  const cycle = currentCycle(year, tz, cumDays);
  if (cycle.cumDay?.status === "LOCKED") {
    const tiers = cycle.cumDay.tierSnapshot ?? liveTiers;
    const points = cycle.cumDay.pointsAtLock ?? 0;
    return {
      points,
      locked: true,
      tiers,
      reached: highestTier(points, tiers),
      cumDayId: cycle.cumDay.id,
      cumDayDate: cycle.cumDay.date,
      cumDayStatus: cycle.cumDay.status,
      daysLeft: daysLeftUntilCum(tz, cumDays),
    };
  }
  const points = cyclePoints(completions, cycle.start, cycle.end, autoPoints);
  return {
    points,
    locked: false,
    tiers: liveTiers,
    reached: highestTier(points, liveTiers),
    cumDayId: cycle.cumDay?.id ?? null,
    cumDayDate: cycle.cumDay?.date ?? null,
    cumDayStatus: cycle.cumDay?.status ?? null,
    daysLeft: daysLeftUntilCum(tz, cumDays),
  };
}

export function periodStart(
  now: Dayjs,
  cadence: LocktoberCadence,
  firstDayOfWeek: number,
): Dayjs {
  const dayStart = now.startOf("day");
  if (cadence === "DAILY") return dayStart;
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
  }[];
  now: Dayjs;
  firstDayOfWeek: number;
}): { maxed: boolean; remainingPoints: number | null } {
  const start = periodStart(args.now, args.cadence, args.firstDayOfWeek);
  const mine = args.completions.filter(
    (completion) =>
      completion.taskId === args.taskId &&
      !dayjs(completion.completedAt).isBefore(start),
  );
  if (args.mode === "TIME_LOCKED") {
    return { maxed: false, remainingPoints: null };
  }
  if (args.mode === "PER_MINUTE") {
    const used = mine.reduce(
      (sum, completion) => sum + Math.abs(completion.pointsAwarded),
      0,
    );
    const cap = args.maxPoints ?? Number.POSITIVE_INFINITY;
    const remaining = Number.isFinite(cap) ? Math.max(0, cap - used) : null;
    return { maxed: remaining === 0, remainingPoints: remaining };
  }
  const cap = args.maxCompletions ?? 1;
  return {
    maxed: mine.length >= cap,
    remainingPoints: null,
  };
}

export function barFillPercent(points: number, tiers: TierSnapshot[]): number {
  const max = tiers.reduce((highest, tier) => Math.max(highest, tier.points), 0);
  if (max <= 0) return 0;
  const scale = max * 1.2;
  return Math.max(0, Math.min(100, (points / scale) * 100));
}

export function tierMarkerPercent(points: number, tiers: TierSnapshot[]): number {
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
