"use server";

import { auth } from "@/auth";
import { prisma } from "@/prisma";
import { DEFAULT_TASKS, DEFAULT_TIERS } from "@/lib/locktober/defaults";
import { deadlinePassed, manualQuantityLimit, manualRateUnit } from "@/lib/locktober/taskLabel";
import { refreshLocktoberCard } from "@/lib/locktober/cardSnapshot";
import { applyMissedDeadlines, clearSatisfiedDeadlineMisses, ensureCumDayLocks } from "@/lib/locktober/locks";
import {
  cumDayInstant,
  cumDayIsFixed,
  dateOnlyString,
  dateOnlyToDb,
  eligibleCumDates,
  evenlySpacedDates,
  focusYear,
  randomCumDates,
  highestTier,
  isKnownTimezone,
  isOctoberDate,
  octoberEnd,
  octoberStart,
  parseTierSnapshot,
  isDeadlineMiss,
  setupYear,
  taskCapState,
  tiersToSnapshot,
  windowIsFrozen,
  CompletionSnapshot,
  CumDayInput,
} from "@/lib/locktober/scoring";
import {
  LocktoberCadence,
  LocktoberRateUnit,
  LocktoberTaskKind,
  LocktoberTaskMode,
  LocktoberVisibility,
  OrgasmType,
  Prisma,
  SexType,
} from "@prisma/client";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { revalidatePath } from "next/cache";

dayjs.extend(utc);
dayjs.extend(timezone);

type ActionResult = { ok: true } | { ok: false; error: string; refresh?: boolean };

function fail(error: string, refresh = false): { ok: false; error: string; refresh: boolean } {
  return { ok: false, error, refresh };
}

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user.id;
}

async function revalidateChallenge(slug: string, challengeId?: string) {
  revalidatePath("/locktober");
  revalidatePath("/");
  revalidatePath(`/locktober/s/${slug}`);
  revalidatePath("/locktober/s/[slug]", "page");
  if (!challengeId) return;
  try {
    await refreshLocktoberCard(challengeId);
  } catch (error) {
    console.error("Locktober card refresh failed", error);
  }
}

function assertOpenForEdits(
  year: number,
  tz: string,
): ActionResult | null {
  const now = dayjs().tz(tz);
  if (!now.isBefore(octoberEnd(year, tz))) {
    return fail("October is over. This challenge is a recap now.");
  }
  if (now.isBefore(dayjs.tz(`${year}-09-01 00:00`, tz))) {
    return fail("Locktober editing opens in September.");
  }
  return null;
}

export async function createChallenge(input: {
  timezone: string;
  allowedOrgasms: number;
  placement: "even" | "random" | "choose";
  dates?: string[];
}): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("You need to be signed in.");
  if (!isKnownTimezone(input.timezone)) return fail("Unknown timezone.");

  const now = dayjs().tz(input.timezone);
  const year = setupYear(now);
  if (year == null) {
    return fail("Locktober setup is open in September and October.");
  }

  const placed = placeCumDays(year, input.timezone, now, input);
  if (!placed.ok) return placed;
  const schedule = normalizeSchedule(
    year,
    input.timezone,
    input.allowedOrgasms,
    placed.dates,
  );
  if (!schedule.ok) return schedule;
  if (schedule.dates.length !== schedule.allowedOrgasms) {
    return fail(`Choose exactly ${schedule.allowedOrgasms} cum days.`);
  }

  const existing = await prisma.locktoberChallenge.findUnique({
    where: { userId_year: { userId, year } },
    select: { id: true },
  });
  if (existing) return fail("You already have a Locktober challenge for this year.");

  await prisma.user.update({
    where: { id: userId },
    data: { timezone: input.timezone },
  });

  const challenge = await prisma.locktoberChallenge.create({
    data: {
      userId,
      year,
      timezone: input.timezone,
      allowedOrgasms: schedule.allowedOrgasms,
      tiers: { create: DEFAULT_TIERS },
      tasks: { create: DEFAULT_TASKS },
      cumDays: {
        create: schedule.dates.map((date) => ({ date: dateOnlyToDb(date) })),
      },
    },
    select: { id: true, shareSlug: true },
  });

  await revalidateChallenge(challenge.shareSlug, challenge.id);
  return { ok: true };
}

export async function saveSchedule(input: {
  challengeId: string;
  allowedOrgasms: number;
  dates: string[];
}): Promise<ActionResult> {
  const owned = await ownedChallenge(input.challengeId);
  if (!owned.ok) return owned;
  const closed = assertOpenForEdits(owned.challenge.year, owned.challenge.timezone);
  if (closed) return closed;

  const schedule = normalizeSchedule(
    owned.challenge.year,
    owned.challenge.timezone,
    input.allowedOrgasms,
    input.dates,
  );
  if (!schedule.ok) return schedule;

  const existing = await prisma.locktoberCumDay.findMany({
    where: { challengeId: owned.challenge.id },
  });
  const next = new Set(schedule.dates);
  for (const day of existing) {
    const key = dateOnlyString(day.date);
    if (!next.has(key) && day.status !== "SCHEDULED") {
      return fail("A locked or finished cum day can't be moved.");
    }
  }

  const now = dayjs().tz(owned.challenge.timezone);
  const existingDates = new Set(existing.map((day) => dateOnlyString(day.date)));
  const fixed = existing.filter((day) =>
    cumDayIsFixed(
      { date: dateOnlyString(day.date), status: day.status },
      owned.challenge.timezone,
      now,
    ),
  );
  for (const day of fixed) {
    if (!next.has(dateOnlyString(day.date))) {
      return fail("A past cum day can't be changed.");
    }
  }
  for (const date of schedule.dates) {
    if (existingDates.has(date)) continue;
    if (!cumDayInstant(date, owned.challenge.timezone).isAfter(now)) {
      return fail("New cum days have to be in the future.");
    }
  }

  if (schedule.allowedOrgasms < fixed.length) {
    return fail("The allowance can't drop below cum days that have already passed.");
  }

  await prisma.$transaction(async (tx) => {
    const removable = existing.filter((day) => {
      const key = dateOnlyString(day.date);
      return (
        !next.has(key) &&
        !cumDayIsFixed({ date: key, status: day.status }, owned.challenge.timezone, now)
      );
    });
    if (removable.length > 0) {
      await tx.locktoberCumDay.deleteMany({
        where: { id: { in: removable.map((day) => day.id) } },
      });
    }
    for (const date of schedule.dates) {
      if (existingDates.has(date)) continue;
      await tx.locktoberCumDay.create({
        data: { challengeId: owned.challenge.id, date: dateOnlyToDb(date) },
      });
    }
    await tx.locktoberChallenge.update({
      where: { id: owned.challenge.id },
      data: { allowedOrgasms: schedule.allowedOrgasms },
    });
  });

  await revalidateChallenge(owned.challenge.shareSlug, owned.challenge.id);
  return { ok: true };
}

function placeCumDays(
  year: number,
  tz: string,
  now: dayjs.Dayjs,
  input: {
    allowedOrgasms: number;
    placement: "even" | "random" | "choose";
    dates?: string[];
  },
): { ok: true; dates: string[] } | { ok: false; error: string } {
  if (
    !Number.isInteger(input.allowedOrgasms) ||
    input.allowedOrgasms < 1 ||
    input.allowedOrgasms > 31
  ) {
    return fail("Choose between 1 and 31 orgasms.");
  }
  const eligible = eligibleCumDates(year, tz, now);
  if (eligible.length < input.allowedOrgasms) {
    return fail(
      `Only ${eligible.length} days are left in October, which is fewer than ${input.allowedOrgasms}.`,
    );
  }
  if (input.placement === "even") {
    return { ok: true, dates: evenlySpacedDates(eligible, input.allowedOrgasms) };
  }
  if (input.placement === "random") {
    return { ok: true, dates: randomCumDates(eligible, input.allowedOrgasms) };
  }
  if (input.placement === "choose") {
    const chosen = [...new Set((input.dates ?? []).map((date) => date.trim()))];
    if (chosen.length !== input.allowedOrgasms) {
      return fail(`Choose exactly ${input.allowedOrgasms} cum days.`);
    }
    const eligibleSet = new Set(eligible);
    if (chosen.some((date) => !eligibleSet.has(date))) {
      return fail("Cum days have to be upcoming days in October.");
    }
    return { ok: true, dates: chosen };
  }
  return fail("Pick how to place your cum days.");
}

function normalizeSchedule(
  year: number,
  tz: string,
  allowedOrgasms: number,
  dates: string[],
): { ok: true; allowedOrgasms: number; dates: string[] } | { ok: false; error: string } {
  if (!Number.isInteger(allowedOrgasms) || allowedOrgasms < 1 || allowedOrgasms > 31) {
    return fail("Choose between 1 and 31 orgasms.");
  }
  const unique = [...new Set(dates.map((date) => date.trim()))];
  if (unique.length > allowedOrgasms) {
    return fail("That's more cum days than the allowance.");
  }
  for (const date of unique) {
    if (!isOctoberDate(date, year)) {
      return fail("Cum days have to fall in October.");
    }
    if (!cumDayInstant(date, tz).isValid()) {
      return fail("One of those dates is invalid.");
    }
  }
  unique.sort();
  return { ok: true, allowedOrgasms, dates: unique };
}

export async function saveTiers(input: {
  challengeId: string;
  tiers: {
    label: string;
    points: number;
    orgasmType: OrgasmType | null;
    expectsLocked: boolean;
  }[];
}): Promise<ActionResult> {
  const owned = await ownedChallenge(input.challengeId);
  if (!owned.ok) return owned;
  const closed = assertOpenForEdits(owned.challenge.year, owned.challenge.timezone);
  if (closed) return closed;
  if (input.tiers.length > 12) return fail("Keep it to 12 reward tiers.");

  const cleaned: {
    label: string;
    points: number;
    orgasmType: OrgasmType | null;
    expectsLocked: boolean;
    sortOrder: number;
  }[] = [];
  const seen = new Set<number>();
  for (const tier of input.tiers) {
    const label = tier.label.trim();
    if (!label || label.length > 40) return fail("Each reward needs a short label.");
    if (!Number.isInteger(tier.points) || tier.points < 1 || tier.points > 100000) {
      return fail("Reward points have to be a positive whole number.");
    }
    if (seen.has(tier.points)) return fail("Two rewards can't use the same points.");
    seen.add(tier.points);
    if (tier.orgasmType && !Object.values(OrgasmType).includes(tier.orgasmType)) {
      return fail("That orgasm type isn't valid.");
    }
    cleaned.push({
      label,
      points: tier.points,
      orgasmType: tier.orgasmType,
      expectsLocked: Boolean(tier.expectsLocked) && tier.orgasmType != null,
      sortOrder: 0,
    });
  }
  cleaned.sort((a, b) => a.points - b.points);
  cleaned.forEach((tier, index) => {
    tier.sortOrder = index;
  });

  await prisma.$transaction(async (tx) => {
    await tx.locktoberRewardTier.deleteMany({
      where: { challengeId: owned.challenge.id },
    });
    if (cleaned.length > 0) {
      await tx.locktoberRewardTier.createMany({
        data: cleaned.map((tier) => ({ ...tier, challengeId: owned.challenge.id })),
      });
    }
  });

  await revalidateChallenge(owned.challenge.shareSlug, owned.challenge.id);
  return { ok: true };
}

export async function saveTask(input: {
  challengeId: string;
  taskId?: string;
  title: string;
  description?: string | null;
  kind: LocktoberTaskKind;
  mode: LocktoberTaskMode;
  cadence: LocktoberCadence;
  points: number | null;
  maxCompletions: number | null;
  maxPoints: number | null;
  noteRequired: boolean;
  deadlineMinute?: number | null;
  missPenalty?: number | null;
  rateEvery?: number | null;
  rateUnit?: LocktoberRateUnit | null;
}): Promise<ActionResult> {
  const owned = await ownedChallenge(input.challengeId);
  if (!owned.ok) return owned;
  const closed = assertOpenForEdits(owned.challenge.year, owned.challenge.timezone);
  if (closed) return closed;

  const normalized = normalizeTask(input);
  if (!normalized.ok) return normalized;

  if (input.taskId) {
    const task = await prisma.locktoberTask.findFirst({
      where: { id: input.taskId, challengeId: owned.challenge.id },
      select: {
        id: true,
        deadlineMinute: true,
        missPenalty: true,
        deadlineSetAt: true,
        cadence: true,
      },
    });
    if (!task) return fail("Task not found.");
    await prisma.locktoberTask.update({
      where: { id: task.id },
      data: {
        ...normalized.task,
        deadlineSetAt: nextDeadlineSetAt(task, normalized.task),
      },
    });
  } else {
    const count = await prisma.locktoberTask.count({
      where: { challengeId: owned.challenge.id },
    });
    if (count >= 40) return fail("That's enough tasks for one October.");
    await prisma.locktoberTask.create({
      data: {
        ...normalized.task,
        deadlineSetAt: normalized.task.deadlineMinute == null ? null : new Date(),
        challengeId: owned.challenge.id,
        sortOrder: count,
      },
    });
  }

  await revalidateChallenge(owned.challenge.shareSlug, owned.challenge.id);
  return { ok: true };
}

function nextDeadlineSetAt(
  existing: {
    deadlineMinute: number | null;
    missPenalty: number;
    deadlineSetAt: Date | null;
    cadence: LocktoberCadence;
  },
  next: { deadlineMinute: number | null; missPenalty: number; cadence: LocktoberCadence },
): Date | null {
  if (next.deadlineMinute == null) return null;
  if (
    existing.deadlineMinute === next.deadlineMinute &&
    existing.missPenalty === next.missPenalty &&
    existing.cadence === next.cadence &&
    existing.deadlineSetAt
  ) {
    return existing.deadlineSetAt;
  }
  return new Date();
}

function normalizeTask(input: {
  title: string;
  description?: string | null;
  kind: LocktoberTaskKind;
  mode: LocktoberTaskMode;
  cadence: LocktoberCadence;
  points: number | null;
  maxCompletions: number | null;
  maxPoints: number | null;
  noteRequired: boolean;
  deadlineMinute?: number | null;
  missPenalty?: number | null;
  rateEvery?: number | null;
  rateUnit?: LocktoberRateUnit | null;
}):
  | {
      ok: true;
      task: {
        title: string;
        description: string | null;
        kind: LocktoberTaskKind;
        mode: LocktoberTaskMode;
        cadence: LocktoberCadence;
        points: number | null;
        maxCompletions: number | null;
        maxPoints: number | null;
        noteRequired: boolean;
        deadlineMinute: number | null;
        missPenalty: number;
        rateEvery: number | null;
        rateUnit: LocktoberRateUnit | null;
      };
    }
  | { ok: false; error: string } {
  const title = input.title.trim();
  if (!title || title.length > 80) return fail("Give the task a short title.");
  const description = (input.description ?? "").trim();
  if (description.length > 2000) return fail("Keep the description under 2000 characters.");
  if (!Object.values(LocktoberTaskKind).includes(input.kind)) return fail("Invalid task kind.");
  if (!Object.values(LocktoberTaskMode).includes(input.mode)) return fail("Invalid task mode.");
  if (!Object.values(LocktoberCadence).includes(input.cadence)) return fail("Invalid cadence.");

  const deadline = readDeadline(
    input.deadlineMinute,
    input.missPenalty,
    input.mode !== "TIME_LOCKED",
  );
  if (!deadline.ok) return deadline;

  const blank = {
    description: description || null,
    maxCompletions: null as number | null,
    maxPoints: null as number | null,
    noteRequired: false,
    deadlineMinute: deadline.deadlineMinute,
    missPenalty: deadline.missPenalty,
    rateEvery: null as number | null,
    rateUnit: null as LocktoberRateUnit | null,
  };

  if (input.mode === "TIME_LOCKED") {
    if (input.kind !== "REWARD") return fail("Time locked is a reward.");
    if (!wholePoints(input.points)) {
      return fail("Points have to be a whole number from 1 to 500.");
    }
    if (
      !Number.isInteger(input.rateEvery) ||
      input.rateEvery == null ||
      input.rateEvery < 1 ||
      input.rateEvery > 744
    ) {
      return fail("The time period has to be a whole number from 1 to 744.");
    }
    if (
      input.rateUnit !== "SECOND" &&
      input.rateUnit !== "MINUTE" &&
      input.rateUnit !== "HOUR" &&
      input.rateUnit !== "DAY"
    ) {
      return fail("Pick seconds, minutes, hours, or days.");
    }
    return {
      ok: true,
      task: {
        ...blank,
        title,
        kind: "REWARD",
        mode: "TIME_LOCKED",
        cadence: "DAILY",
        points: input.points,
        rateEvery: input.rateEvery,
        rateUnit: input.rateUnit,
      },
    };
  }

  const attempts = optionalCount(input.maxCompletions, "Attempts", 20);
  if (!attempts.ok) return attempts;
  const pointCap = optionalCount(input.maxPoints, "The points cap", 500);
  if (!pointCap.ok) return pointCap;

  if (input.mode === "ENTER_AMOUNT") {
    return {
      ok: true,
      task: {
        ...blank,
        title,
        kind: input.kind,
        mode: input.mode,
        cadence: input.cadence,
        points: null,
        maxCompletions: attempts.value,
        maxPoints: pointCap.value,
        noteRequired: input.kind === "PENALTY" ? true : Boolean(input.noteRequired),
      },
    };
  }

  if (!wholePoints(input.points)) {
    return fail("Points have to be a whole number from 1 to 500.");
  }
  const signed = input.kind === "PENALTY" ? -input.points! : input.points!;
  if (input.mode === "PER_MINUTE") {
    if (
      input.rateUnit !== "SECOND" &&
      input.rateUnit !== "MINUTE" &&
      input.rateUnit !== "HOUR"
    ) {
      return fail("Pick seconds, minutes, or hours.");
    }
    return {
      ok: true,
      task: {
        ...blank,
        title,
        kind: input.kind,
        mode: input.mode,
        cadence: input.cadence,
        points: signed,
        maxCompletions: attempts.value,
        maxPoints: pointCap.value,
        noteRequired: Boolean(input.noteRequired),
        rateUnit: input.rateUnit,
      },
    };
  }

  return {
    ok: true,
    task: {
      ...blank,
      title,
      kind: input.kind,
      mode: "FIXED",
      cadence: input.cadence,
      points: signed,
      maxCompletions: clampCount(input.maxCompletions),
      noteRequired: Boolean(input.noteRequired),
    },
  };
}

function readDeadline(
  minute: number | null | undefined,
  penalty: number | null | undefined,
  allow: boolean,
):
  | { ok: true; deadlineMinute: number | null; missPenalty: number }
  | { ok: false; error: string; refresh: boolean } {
  if (!allow || minute == null) return { ok: true, deadlineMinute: null, missPenalty: 0 };
  if (!Number.isInteger(minute) || minute < 0 || minute > 1439) {
    return fail("The deadline has to be a time of day.");
  }
  const miss = penalty ?? 0;
  if (!Number.isInteger(miss) || miss < 0 || miss > 500) {
    return fail("The deadline penalty has to be a whole number from 0 to 500.");
  }
  return { ok: true, deadlineMinute: minute, missPenalty: miss };
}

function wholePoints(value: number | null): value is number {
  return Number.isInteger(value) && value != null && value >= 1 && value <= 500;
}

function optionalCount(
  value: number | null,
  label: string,
  max: number,
): { ok: true; value: number | null } | { ok: false; error: string } {
  if (value == null) return { ok: true, value: null };
  if (!Number.isInteger(value) || value < 1 || value > max) {
    return fail(`${label} has to be a whole number from 1 to ${max}, or blank.`);
  }
  return { ok: true, value };
}

function clampCount(value: number | null): number {
  if (!Number.isInteger(value) || value == null || value < 1) return 1;
  return Math.min(value, 20);
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("You need to be signed in.");
  const task = await prisma.locktoberTask.findUnique({
    where: { id: taskId },
    include: { challenge: true },
  });
  if (!task || task.challenge.userId !== userId) return fail("Task not found.");
  const closed = assertOpenForEdits(task.challenge.year, task.challenge.timezone);
  if (closed) return closed;

  await prisma.$transaction([
    prisma.locktoberCompletion.updateMany({
      where: { taskId },
      data: { taskId: null },
    }),
    prisma.locktoberTask.delete({ where: { id: taskId } }),
  ]);
  await revalidateChallenge(task.challenge.shareSlug, task.challenge.id);
  return { ok: true };
}

export async function completeTask(input: {
  taskId: string;
  minutes?: number;
  quantity?: number;
  amount?: number;
  note?: string;
  /** Scoring time, set only when the logger overrides the clock. */
  completedAt?: string;
}): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("You need to be signed in.");
  const task = await prisma.locktoberTask.findUnique({
    where: { id: input.taskId },
    include: { challenge: true },
  });
  if (!task || task.challenge.userId !== userId) return fail("Task not found.");
  if (task.mode === "TIME_LOCKED") return fail("Time locked is added automatically.");

  const applied = await applyMissedDeadlines(task.challengeId);
  await ensureCumDayLocks(task.challengeId);
  const challenge = await prisma.locktoberChallenge.findUnique({
    where: { id: task.challengeId },
    include: {
      tiers: { orderBy: { sortOrder: "asc" } },
      cumDays: { orderBy: { date: "asc" } },
      completions: {
        select: { taskId: true, completedAt: true, pointsAwarded: true, snapshot: true },
      },
    },
  });
  if (!challenge) return fail("Challenge not found.");

  const now = dayjs().tz(challenge.timezone);
  if (now.isBefore(octoberStart(challenge.year, challenge.timezone))) {
    return fail("Tasks open on October 1.", applied > 0);
  }
  if (!now.isBefore(octoberEnd(challenge.year, challenge.timezone))) {
    return fail("October is over.", applied > 0);
  }

  const enteredAt = new Date();
  let completedAt = enteredAt;
  const overriding = Boolean(input.completedAt);
  if (input.completedAt) {
    const parsed = dayjs(input.completedAt);
    if (!parsed.isValid() || parsed.isAfter(dayjs())) {
      return fail("The completed time has to be in the past.");
    }
    const zoned = parsed.tz(challenge.timezone);
    const date = zoned.format("YYYY-MM-DD");
    if (!isOctoberDate(date, challenge.year)) {
      return fail("That time is outside October.");
    }
    completedAt = parsed.toDate();
  }

  const cumDays: CumDayInput[] = challenge.cumDays.map((day) => ({
    id: day.id,
    date: dateOnlyString(day.date),
    status: day.status,
    pointsAtLock: day.pointsAtLock,
    tierSnapshot: parseTierSnapshot(day.tierSnapshot),
    claimedTierLabel: day.claimedTierLabel,
    claimedAt: day.claimedAt,
  }));
  const effective = dayjs(completedAt).tz(challenge.timezone);
  if (
    windowIsFrozen(challenge.year, challenge.timezone, cumDays, effective)
  ) {
    return fail("That time is already claimed or skipped.");
  }
  if (deadlinePassed(task.deadlineMinute, effective.hour(), effective.minute())) {
    await revalidateChallenge(challenge.shareSlug, challenge.id);
    return fail("That deadline has passed, so this one is closed for that time.", true);
  }

  const logged = challenge.completions.map((completion) => ({
    taskId: completion.taskId,
    completedAt: completion.completedAt,
    pointsAwarded: completion.pointsAwarded,
    deadlineMiss: isDeadlineMiss(completion.snapshot),
  }));

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstDayOfWeek: true },
  });
  const cap = taskCapState({
    taskId: task.id,
    mode: task.mode,
    cadence: task.cadence,
    maxCompletions: task.maxCompletions,
    maxPoints: task.maxPoints,
    completions: logged,
    now: effective,
    firstDayOfWeek: user?.firstDayOfWeek ?? 1,
  });
  if (cap.maxed) return fail("That task is already maxed out for this period.");

  const note = (input.note ?? "").trim();
  if (note.length > 500) return fail("Keep the note under 500 characters.");
  if ((task.noteRequired || overriding) && !note) return fail("This one needs a note.");

  let pointsAwarded = 0;
  let minutes: number | null = null;
  if (task.mode === "PER_MINUTE") {
    const rate = task.points ?? 0;
    if (rate === 0) return fail("This task has no point value.");
    const unit = manualRateUnit(task.rateUnit);
    const quantity = input.quantity ?? (unit === "MINUTE" ? input.minutes : undefined);
    const limit = manualQuantityLimit(unit);
    const unitName = unit === "SECOND" ? "seconds" : unit === "HOUR" ? "hours" : "minutes";
    if (!Number.isInteger(quantity) || !quantity || quantity < 1 || quantity > limit) {
      return fail(`Enter the ${unitName} as a whole number from 1 to ${limit}.`);
    }
    const awarded = rate * quantity;
    if (cap.remainingPoints != null && Math.abs(awarded) > cap.remainingPoints) {
      return fail(`Only ${cap.remainingPoints} points are left for this period.`);
    }
    pointsAwarded = awarded;
    minutes =
      unit === "HOUR" ? quantity * 60 : unit === "MINUTE" ? quantity : Math.max(1, Math.round(quantity / 60));
  } else if (task.mode === "ENTER_AMOUNT") {
    if (!Number.isInteger(input.amount) || !input.amount || input.amount < 1 || input.amount > 500) {
      return fail("Enter a whole number of points from 1 to 500.");
    }
    if (cap.remainingPoints != null && input.amount > cap.remainingPoints) {
      return fail(`Only ${cap.remainingPoints} points are left for this period.`);
    }
    pointsAwarded = task.kind === "PENALTY" ? -input.amount : input.amount;
  } else {
    pointsAwarded = task.points ?? 0;
    if (pointsAwarded === 0) return fail("This task has no point value.");
  }

  const snapshot: CompletionSnapshot = {
    title: task.title,
    kind: task.kind,
    points: task.points,
    mode: task.mode,
    cadence: task.cadence,
    maxCompletions: task.maxCompletions,
    maxPoints: task.maxPoints,
    noteRequired: task.noteRequired,
    deadlineMinute: task.deadlineMinute,
    missPenalty: task.missPenalty,
  };

  await prisma.locktoberCompletion.create({
    data: {
      challengeId: challenge.id,
      taskId: task.id,
      completedAt,
      enteredAt,
      minutes,
      note: note || null,
      pointsAwarded,
      snapshot: snapshot as unknown as Prisma.InputJsonValue,
    },
  });
  await clearSatisfiedDeadlineMisses(challenge.id);
  await ensureCumDayLocks(challenge.id);

  await revalidateChallenge(challenge.shareSlug, challenge.id);
  return { ok: true };
}

export async function claimReward(input: {
  cumDayId: string;
  orgasm: {
    timestamp: string;
    type: OrgasmType;
    sex: SexType;
    note: string;
    endChastity: boolean;
  } | null;
}): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("You need to be signed in.");

  const cumDay = await prisma.locktoberCumDay.findUnique({
    where: { id: input.cumDayId },
    include: { challenge: true },
  });
  if (!cumDay || cumDay.challenge.userId !== userId) return fail("Cum day not found.");
  await ensureCumDayLocks(cumDay.challengeId);

  const fresh = await prisma.locktoberCumDay.findUnique({
    where: { id: input.cumDayId },
    include: { challenge: { include: { tiers: true } } },
  });
  if (!fresh || fresh.status !== "LOCKED") {
    return fail("This cum day isn't ready to claim yet.");
  }

  const tiers = parseTierSnapshot(fresh.tierSnapshot) ?? tiersToSnapshot(fresh.challenge.tiers);
  const reached = highestTier(fresh.pointsAtLock ?? 0, tiers);
  if (!reached) return fail("No reward tier was reached. You can skip this day.");

  const timestamp = input.orgasm ? new Date(input.orgasm.timestamp) : null;

  if (reached.orgasmType) {
    if (!input.orgasm || !timestamp || Number.isNaN(timestamp.getTime())) {
      return fail("Confirm the orgasm details before claiming.");
    }
    if (!Object.values(OrgasmType).includes(input.orgasm.type)) {
      return fail("That orgasm type isn't valid.");
    }
    if (!Object.values(SexType).includes(input.orgasm.sex)) {
      return fail("That sex type isn't valid.");
    }
    if (timestamp.getTime() > Date.now()) {
      return fail("The time has to be in the past.");
    }
    const note = input.orgasm.note.trim();
    if (note.length > 2000) return fail("That note is too long.");

    try {
    await prisma.$transaction(async (tx) => {
      const orgasm = await tx.orgasm.create({
        data: {
          userId,
          timestamp,
          type: input.orgasm!.type,
          sex: input.orgasm!.sex,
          note: note || null,
        },
      });
      if (input.orgasm!.endChastity) {
        const active = await tx.chastitySession.findFirst({
          where: { userId, endTime: null },
        });
        if (active && timestamp > active.startTime) {
          await tx.chastitySession.update({
            where: { id: active.id },
            data: { endTime: timestamp },
          });
        }
      }
      const claimed = await tx.locktoberCumDay.updateMany({
        where: { id: fresh.id, status: "LOCKED" },
        data: {
          status: "CLAIMED",
          claimedAt: new Date(),
          claimedTierLabel: reached.label,
          orgasmId: orgasm.id,
        },
      });
      if (claimed.count !== 1) {
        throw new Error("This cum day was already claimed.");
      }
    });
    } catch (error) {
      const message =
        error instanceof Error && error.message === "This cum day was already claimed."
          ? error.message
          : "Couldn't log that reward.";
      return fail(message);
    }
  } else {
    const claimed = await prisma.locktoberCumDay.updateMany({
      where: { id: fresh.id, status: "LOCKED" },
      data: {
        status: "CLAIMED",
        claimedAt: new Date(),
        claimedTierLabel: reached.label,
      },
    });
    if (claimed.count !== 1) return fail("This cum day was already claimed.");
  }

  await ensureCumDayLocks(fresh.challengeId);
  await revalidateChallenge(fresh.challenge.shareSlug, fresh.challenge.id);
  revalidatePath("/orgasms");
  revalidatePath("/chastity");
  return { ok: true };
}

export async function skipCumDay(cumDayId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("You need to be signed in.");
  const cumDay = await prisma.locktoberCumDay.findUnique({
    where: { id: cumDayId },
    include: { challenge: true },
  });
  if (!cumDay || cumDay.challenge.userId !== userId) return fail("Cum day not found.");
  await ensureCumDayLocks(cumDay.challengeId);
  const fresh = await prisma.locktoberCumDay.findUnique({ where: { id: cumDayId } });
  if (!fresh || fresh.status !== "LOCKED") {
    return fail("This cum day isn't locked yet.");
  }
  const skipped = await prisma.locktoberCumDay.updateMany({
    where: { id: fresh.id, status: "LOCKED" },
    data: { status: "SKIPPED", claimedAt: new Date(), claimedTierLabel: null },
  });
  if (skipped.count !== 1) return fail("This cum day was already resolved.");
  await ensureCumDayLocks(fresh.challengeId);
  await revalidateChallenge(cumDay.challenge.shareSlug, cumDay.challenge.id);
  return { ok: true };
}

export async function setVisibility(input: {
  challengeId: string;
  visibility: LocktoberVisibility;
}): Promise<ActionResult> {
  const owned = await ownedChallenge(input.challengeId);
  if (!owned.ok) return owned;
  if (!Object.values(LocktoberVisibility).includes(input.visibility)) {
    return fail("Invalid visibility.");
  }
  await prisma.locktoberChallenge.update({
    where: { id: owned.challenge.id },
    data: { visibility: input.visibility },
  });
  await revalidateChallenge(owned.challenge.shareSlug, owned.challenge.id);
  return { ok: true };
}

export async function toggleLike(slug: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Sign in to like a challenge.");
  const challenge = await visibleChallenge(slug, userId);
  if (!challenge) return fail("Challenge not found.");
  const existing = await prisma.locktoberLike.findUnique({
    where: { challengeId_userId: { challengeId: challenge.id, userId } },
  });
  if (existing) {
    await prisma.locktoberLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.locktoberLike.create({
      data: { challengeId: challenge.id, userId },
    });
  }
  await revalidateChallenge(challenge.shareSlug);
  return { ok: true };
}

export async function addComment(slug: string, body: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Sign in to comment.");
  const challenge = await visibleChallenge(slug, userId);
  if (!challenge) return fail("Challenge not found.");
  const text = body.trim();
  if (!text) return fail("Write a comment first.");
  if (text.length > 500) return fail("Keep comments under 500 characters.");
  await prisma.locktoberComment.create({
    data: { challengeId: challenge.id, userId, body: text },
  });
  await revalidateChallenge(challenge.shareSlug);
  return { ok: true };
}

export async function deleteComment(commentId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("You need to be signed in.");
  const comment = await prisma.locktoberComment.findUnique({
    where: { id: commentId },
    include: { challenge: { select: { userId: true, shareSlug: true, visibility: true } } },
  });
  if (!comment) return fail("Comment not found.");
  const isOwner = comment.challenge.userId === userId;
  if (comment.userId !== userId && !isOwner) return fail("You can't delete that comment.");
  await prisma.locktoberComment.delete({ where: { id: commentId } });
  await revalidateChallenge(comment.challenge.shareSlug);
  return { ok: true };
}

async function visibleChallenge(slug: string, userId: string) {
  const bySlug = await prisma.locktoberChallenge.findUnique({
    where: { shareSlug: slug },
    select: { id: true, userId: true, shareSlug: true, visibility: true },
  });
  const challenge =
    bySlug ??
    (await prisma.locktoberChallenge.findFirst({
      where: {
        user: { username: slug },
        visibility: "PUBLIC",
        year: focusYear(dayjs()),
      },
      select: { id: true, userId: true, shareSlug: true, visibility: true },
    }));
  if (!challenge) return null;
  if (challenge.userId === userId) return challenge;
  if (challenge.visibility === "PRIVATE") return null;
  return challenge;
}

async function ownedChallenge(
  challengeId: string,
): Promise<
  | { ok: true; challenge: { id: string; year: number; timezone: string; shareSlug: string } }
  | { ok: false; error: string }
> {
  const userId = await requireUserId();
  if (!userId) return fail("You need to be signed in.");
  const challenge = await prisma.locktoberChallenge.findFirst({
    where: { id: challengeId, userId },
    select: { id: true, year: true, timezone: true, shareSlug: true },
  });
  if (!challenge) return fail("Challenge not found.");
  return { ok: true, challenge };
}
