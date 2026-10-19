import {
  LocktoberCadence,
  LocktoberTaskKind,
  LocktoberTaskMode,
} from "@prisma/client";
import dayjs, { Dayjs } from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { periodStart } from "./scoring";

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

function periodEnd(start: Dayjs, cadence: LocktoberCadence): Dayjs {
  if (cadence === "DAILY") return start.add(1, "day");
  if (cadence === "MONTHLY") return start.add(1, "month");
  return start.add(7, "day");
}

/** Old automatic misses whose period now has a log the user entered. */
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
    const logged = args.completions.filter(
      (completion) => completion.taskId === task.id && !completion.deadlineMiss,
    );
    if (logged.length === 0) continue;

    for (const miss of args.completions) {
      if (miss.taskId !== task.id || !miss.deadlineMiss) continue;
      const period = periodStart(
        dayjs(miss.completedAt).tz(args.tz),
        task.cadence,
        args.firstDayOfWeek,
      );
      const end = periodEnd(period, task.cadence);
      const cleared = logged.some((completion) => {
        const at = dayjs(completion.completedAt);
        return !at.isBefore(period) && at.isBefore(end);
      });
      if (cleared) ids.push(miss.id);
    }
  }
  return ids;
}
