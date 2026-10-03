import {
  LocktoberCadence,
  LocktoberTaskKind,
  LocktoberTaskMode,
} from "@prisma/client";
import dayjs, { Dayjs } from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { formatDeadline } from "./taskLabel";
import {
  CompletionSnapshot,
  octoberEnd,
  octoberStart,
  periodStart,
} from "./scoring";

dayjs.extend(utc);
dayjs.extend(timezone);

export type DeadlineTaskInput = {
  id: string;
  title: string;
  kind: LocktoberTaskKind;
  points: number | null;
  mode: LocktoberTaskMode;
  cadence: LocktoberCadence;
  maxCompletions: number | null;
  maxPoints: number | null;
  noteRequired: boolean;
  deadlineMinute: number | null;
  missPenalty: number;
  /** When the current cutoff was saved. Earlier days are not penalized. */
  deadlineSetAt: Date | string | null;
};

export type MissedDeadline = {
  taskId: string;
  completedAt: Date;
  pointsAwarded: number;
  note: string;
  snapshot: CompletionSnapshot;
};

function periodEnd(start: Dayjs, cadence: LocktoberCadence): Dayjs {
  if (cadence === "DAILY") return start.add(1, "day");
  if (cadence === "MONTHLY") return start.add(1, "month");
  return start.add(7, "day");
}

/** 8:00 on that local calendar day, using the offset in force at that hour. */
function wallDeadline(day: Dayjs, minute: number, tz: string): Dayjs {
  const hour = String(Math.floor(minute / 60)).padStart(2, "0");
  const mins = String(minute % 60).padStart(2, "0");
  return dayjs.tz(`${day.format("YYYY-MM-DD")} ${hour}:${mins}`, tz);
}

/**
 * One penalty per cadence period, written once the period's last cutoff has
 * passed with no on-time log. A penalty of zero is only a lockout, so it
 * writes nothing.
 */
export function missedDeadlinePenalties(args: {
  year: number;
  tz: string;
  now: Dayjs;
  firstDayOfWeek: number;
  tasks: DeadlineTaskInput[];
  completions: {
    taskId: string | null;
    completedAt: Date | string;
    deadlineMiss: boolean;
  }[];
}): MissedDeadline[] {
  const today = args.now.startOf("day");
  const first = octoberStart(args.year, args.tz).startOf("day");
  const lastOctober = octoberEnd(args.year, args.tz).subtract(1, "day").startOf("day");
  const last = today.isBefore(lastOctober) ? today : lastOctober;
  if (last.isBefore(first)) return [];

  const results: MissedDeadline[] = [];
  for (const task of args.tasks) {
    if (task.mode === "TIME_LOCKED") continue;
    if (task.deadlineMinute == null || task.missPenalty < 1 || task.deadlineSetAt == null) {
      continue;
    }
    const deadlineMinute = task.deadlineMinute;
    const setAt = dayjs(task.deadlineSetAt);
    const seen = new Set<number>();

    for (let day = first; !day.isAfter(last); day = day.add(1, "day")) {
      const deadlineAt = wallDeadline(day, deadlineMinute, args.tz);
      if (!deadlineAt.isAfter(setAt)) continue;
      const graceEnd = deadlineAt.add(1, "minute");
      if (day.isAfter(today, "day")) break;
      if (day.isSame(today, "day") && graceEnd.isAfter(args.now)) break;

      const period = periodStart(deadlineAt, task.cadence, args.firstDayOfWeek);
      const key = period.valueOf();
      if (seen.has(key)) continue;

      const end = periodEnd(period, task.cadence);
      const lastCutoff = wallDeadline(end.subtract(1, "day"), deadlineMinute, args.tz);
      if (!lastCutoff.isAfter(setAt)) {
        seen.add(key);
        continue;
      }
      if (lastCutoff.add(1, "minute").isAfter(args.now)) continue;
      seen.add(key);

      const inPeriod = args.completions.filter((completion) => {
        if (completion.taskId !== task.id) return false;
        const at = dayjs(completion.completedAt);
        return !at.isBefore(period) && at.isBefore(end);
      });
      const onTime = inPeriod.some((completion) => {
        if (completion.deadlineMiss) return false;
        const at = dayjs(completion.completedAt).tz(args.tz);
        return at.hour() * 60 + at.minute() <= deadlineMinute;
      });
      if (onTime || inPeriod.some((completion) => completion.deadlineMiss)) continue;

      const snapshot: CompletionSnapshot = {
        title: task.title,
        kind: task.kind,
        points: task.points,
        mode: task.mode,
        cadence: task.cadence,
        maxCompletions: task.maxCompletions,
        maxPoints: task.maxPoints,
        noteRequired: task.noteRequired,
        deadlineMinute,
        missPenalty: task.missPenalty,
        deadlineMiss: true,
      };
      results.push({
        taskId: task.id,
        completedAt: lastCutoff.toDate(),
        pointsAwarded: -task.missPenalty,
        note: `Missed ${formatDeadline(deadlineMinute)}`,
        snapshot,
      });
    }
  }
  return results;
}

/** Miss penalties whose period now has an on-time log. */
export function satisfiedDeadlineMissIds(args: {
  tz: string;
  firstDayOfWeek: number;
  tasks: DeadlineTaskInput[];
  completions: {
    id: string;
    taskId: string | null;
    completedAt: Date | string;
    deadlineMiss: boolean;
  }[];
}): string[] {
  const ids: string[] = [];
  for (const task of args.tasks) {
    if (task.mode === "TIME_LOCKED" || task.deadlineMinute == null) continue;
    const deadlineMinute = task.deadlineMinute;
    const onTime = args.completions.filter((completion) => {
      if (completion.taskId !== task.id || completion.deadlineMiss) return false;
      const at = dayjs(completion.completedAt).tz(args.tz);
      return at.hour() * 60 + at.minute() <= deadlineMinute;
    });
    if (onTime.length === 0) continue;

    for (const miss of args.completions) {
      if (miss.taskId !== task.id || !miss.deadlineMiss) continue;
      const period = periodStart(
        dayjs(miss.completedAt).tz(args.tz),
        task.cadence,
        args.firstDayOfWeek,
      );
      const end = periodEnd(period, task.cadence);
      const cleared = onTime.some((completion) => {
        const at = dayjs(completion.completedAt);
        return !at.isBefore(period) && at.isBefore(end);
      });
      if (cleared) ids.push(miss.id);
    }
  }
  return ids;
}
