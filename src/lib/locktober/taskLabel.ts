import type { LocktoberCadence } from "@prisma/client";
import type { SerializedTask } from "./load";

/** Highest reward first, then down through the smallest penalty. */
export function taskSignedPoints(task: Pick<SerializedTask, "kind" | "points" | "mode">): number {
  if (task.mode === "ENTER_AMOUNT" || task.points == null) {
    return task.kind === "PENALTY" ? -0.5 : 0;
  }
  const amount = Math.abs(task.points);
  return task.kind === "PENALTY" ? -amount : amount;
}

export function compareTasksByValue<
  T extends Pick<SerializedTask, "kind" | "points" | "mode" | "sortOrder">,
>(a: T, b: T): number {
  const delta = taskSignedPoints(b) - taskSignedPoints(a);
  if (delta !== 0) return delta;
  return a.sortOrder - b.sortOrder;
}

export function taskPointsText(task: Pick<SerializedTask, "kind" | "points" | "mode">): string {
  const penalty = task.kind === "PENALTY";
  if (task.mode === "ENTER_AMOUNT" || task.points == null) {
    return penalty ? "-?" : "+?";
  }
  const amount = Math.abs(task.points);
  return penalty ? `-${amount}` : `+${amount}`;
}

export function cadencePeriod(cadence: LocktoberCadence): "day" | "week" | "month" {
  if (cadence === "WEEKLY") return "week";
  if (cadence === "MONTHLY") return "month";
  return "day";
}

export type ManualRateUnit = "SECOND" | "MINUTE" | "HOUR";

/** Logged rate tasks with no unit stored were points per minute. */
export function manualRateUnit(unit: string | null | undefined): ManualRateUnit {
  if (unit === "SECOND" || unit === "MINUTE" || unit === "HOUR") return unit;
  return "MINUTE";
}

export function rateUnitWord(unit: string, count = 1): string {
  const words: Record<string, [string, string]> = {
    SECOND: ["second", "seconds"],
    MINUTE: ["minute", "minutes"],
    HOUR: ["hour", "hours"],
    DAY: ["day", "days"],
  };
  const pair = words[unit] ?? ["hour", "hours"];
  return Math.abs(count) === 1 ? pair[0] : pair[1];
}

export function shortRateUnit(unit: ManualRateUnit): string {
  if (unit === "SECOND") return "sec";
  if (unit === "HOUR") return "hr";
  return "min";
}

export function manualQuantityLimit(unit: ManualRateUnit): number {
  if (unit === "SECOND") return 86_400;
  if (unit === "HOUR") return 744;
  return 1_440;
}

function cadenceText(times: number | null, period: string): string | null {
  if (times == null) return null;
  return `${times}x ${period}`;
}

/** Short rule line for a task card, e.g. "1x day" or "per hr · max 15pt/day". */
export function taskCardDetail(task: SerializedTask): string {
  const period = cadencePeriod(task.cadence);
  const note = task.noteRequired ? " · note" : "";

  if (task.mode === "TIME_LOCKED") {
    const every = task.rateEvery ?? 1;
    const unit = rateUnitWord(
      task.rateUnit === "SECOND" || task.rateUnit === "MINUTE" || task.rateUnit === "DAY"
        ? task.rateUnit
        : "HOUR",
      every,
    );
    const span = every === 1 ? unit : `${every} ${unit}`;
    return `per ${span}`;
  }
  if (task.mode === "PER_MINUTE") {
    const cap = task.maxPoints != null ? `max ${task.maxPoints}pt/${period}` : null;
    const limit = cadenceText(task.maxCompletions, period);
    const unit = shortRateUnit(manualRateUnit(task.rateUnit));
    return [limit, `per ${unit}`, cap].filter(Boolean).join(" · ") + note;
  }
  if (task.mode === "ENTER_AMOUNT") {
    const cap = task.maxPoints != null ? `max ${task.maxPoints}pt/${period}` : null;
    const limit = cadenceText(task.maxCompletions, period);
    return [limit, "choose", cap].filter(Boolean).join(" · ") + note;
  }
  const times = task.maxCompletions ?? 1;
  return `${cadenceText(times, period)}${note}`;
}

export function taskSummary(task: SerializedTask): string {
  const period = cadencePeriod(task.cadence);
  const times = task.maxCompletions;
  const allowance =
    times == null
      ? `any number of times a ${period}`
      : times === 1
        ? `once a ${period}`
        : `${times} times a ${period}`;
  const note = task.noteRequired ? ", note required" : "";
  const pointCap =
    task.maxPoints != null ? `, up to ${task.maxPoints} points a ${period}` : "";

  if (task.mode === "TIME_LOCKED") {
    const every = task.rateEvery ?? 1;
    const unit = rateUnitWord(
      task.rateUnit === "SECOND" || task.rateUnit === "MINUTE" || task.rateUnit === "DAY"
        ? task.rateUnit
        : "HOUR",
      every,
    );
    const span = every === 1 ? unit : `${every} ${unit}`;
    const amount = Math.abs(task.points ?? 0);
    return `${amount} ${amount === 1 ? "point" : "points"} per ${span}, automatic`;
  }
  if (task.mode === "ENTER_AMOUNT") {
    return `Amount chosen when logged, ${allowance}${pointCap}${note}`;
  }
  if (task.mode === "PER_MINUTE") {
    const amount = Math.abs(task.points ?? 0);
    const unit = rateUnitWord(manualRateUnit(task.rateUnit));
    return `${amount} ${amount === 1 ? "point" : "points"} per ${unit}${pointCap}, ${allowance}${note}`;
  }
  const amount = Math.abs(task.points ?? 0);
  const fixedAllowance =
    (times ?? 1) === 1 ? `once a ${period}` : `${times ?? 1} times a ${period}`;
  return `${amount} ${amount === 1 ? "point" : "points"}, ${fixedAllowance}${note}`;
}
