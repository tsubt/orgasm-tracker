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

/** Short rule line for a task card, e.g. "1x day" or "per min · max 15pt/day". */
export function taskCardDetail(task: SerializedTask): string {
  const period = task.cadence === "WEEKLY" ? "week" : "day";
  const times = task.maxCompletions ?? 1;
  const cadence = `${times}x ${period}`;
  const note = task.noteRequired ? " · note" : "";

  if (task.mode === "TIME_LOCKED") {
    const every = task.rateEvery ?? 1;
    const unit = task.rateUnit === "DAY" ? "day" : "hour";
    const span = every === 1 ? unit : `${every} ${unit}s`;
    return `per ${span}`;
  }
  if (task.mode === "PER_MINUTE") {
    const cap = task.maxPoints != null ? `max ${task.maxPoints}pt/${period}` : null;
    const limit = task.maxCompletions != null ? cadence : null;
    return [limit, "per min", cap].filter(Boolean).join(" · ") + note;
  }
  if (task.mode === "ENTER_AMOUNT") {
    return `${cadence} · choose${note}`;
  }
  return `${cadence}${note}`;
}

export function taskSummary(task: SerializedTask): string {
  const period = task.cadence === "WEEKLY" ? "week" : "day";
  const times = task.maxCompletions ?? 1;
  const allowance = times === 1 ? `once a ${period}` : `${times} times a ${period}`;
  const note = task.noteRequired ? ", note required" : "";

  if (task.mode === "TIME_LOCKED") {
    const every = task.rateEvery ?? 1;
    const unit = task.rateUnit === "DAY" ? "day" : "hour";
    const span = every === 1 ? unit : `${every} ${unit}s`;
    const amount = Math.abs(task.points ?? 0);
    return `${amount} ${amount === 1 ? "point" : "points"} per ${span}, automatic`;
  }
  if (task.mode === "ENTER_AMOUNT") {
    return `Amount chosen when logged, ${allowance}${note}`;
  }
  if (task.mode === "PER_MINUTE") {
    const amount = Math.abs(task.points ?? 0);
    const cap =
      task.maxPoints != null ? `, up to ${task.maxPoints} points a ${period}` : "";
    return `${amount} ${amount === 1 ? "point" : "points"} per minute${cap}${note}`;
  }
  const amount = Math.abs(task.points ?? 0);
  return `${amount} ${amount === 1 ? "point" : "points"}, ${allowance}${note}`;
}
