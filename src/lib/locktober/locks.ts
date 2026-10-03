import { prisma } from "@/prisma";
import { Prisma } from "@prisma/client";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { missedDeadlinePenalties, satisfiedDeadlineMissIds } from "./deadline";
import {
  CumDayInput,
  cumDayInstant,
  cyclePoints,
  dateOnlyString,
  isDeadlineMiss,
  parseTierSnapshot,
  rewardWindowFor,
  tiersToSnapshot,
  timeLockedInWindow,
  type LockedSpan,
  type TimeLockedTaskInput,
} from "./scoring";

dayjs.extend(utc);
dayjs.extend(timezone);

function toCumDays(
  days: {
    id: string;
    date: Date;
    status: CumDayInput["status"];
    pointsAtLock: number | null;
    tierSnapshot: Prisma.JsonValue;
    claimedTierLabel: string | null;
    claimedAt: Date | null;
  }[],
): CumDayInput[] {
  return days.map((day) => ({
    id: day.id,
    date: dateOnlyString(day.date),
    status: day.status,
    pointsAtLock: day.pointsAtLock,
    tierSnapshot: parseTierSnapshot(day.tierSnapshot),
    claimedTierLabel: day.claimedTierLabel,
    claimedAt: day.claimedAt,
  }));
}

/** Write one penalty per missed deadline period. Returns how many were created. */
export async function applyMissedDeadlines(challengeId: string): Promise<number> {
  const challenge = await prisma.locktoberChallenge.findUnique({
    where: { id: challengeId },
    select: {
      id: true,
      year: true,
      timezone: true,
      user: { select: { firstDayOfWeek: true } },
      tasks: {
        select: {
          id: true,
          title: true,
          kind: true,
          points: true,
          mode: true,
          cadence: true,
          maxCompletions: true,
          maxPoints: true,
          noteRequired: true,
          deadlineMinute: true,
          missPenalty: true,
          deadlineSetAt: true,
        },
      },
    },
  });
  if (!challenge) return 0;
  if (
    !challenge.tasks.some(
      (task) => task.deadlineMinute != null && task.missPenalty > 0 && task.mode !== "TIME_LOCKED",
    )
  ) {
    return 0;
  }

  const now = dayjs().tz(challenge.timezone);
  const completions = await prisma.locktoberCompletion.findMany({
    where: { challengeId },
    select: { taskId: true, completedAt: true, snapshot: true },
  });
  const pending = missedDeadlinePenalties({
    year: challenge.year,
    tz: challenge.timezone,
    now,
    firstDayOfWeek: challenge.user.firstDayOfWeek,
    tasks: challenge.tasks,
    completions: completions.map((completion) => ({
      taskId: completion.taskId,
      completedAt: completion.completedAt,
      deadlineMiss: isDeadlineMiss(completion.snapshot),
    })),
  });
  if (pending.length === 0) return 0;
  await prisma.locktoberCompletion.createMany({
    data: pending.map((item) => ({
      challengeId: challenge.id,
      taskId: item.taskId,
      completedAt: item.completedAt,
      enteredAt: item.completedAt,
      note: item.note,
      pointsAwarded: item.pointsAwarded,
      snapshot: item.snapshot as unknown as Prisma.InputJsonValue,
    })),
  });
  return pending.length;
}

/** Drop a miss penalty once an on-time log exists for that period. */
export async function clearSatisfiedDeadlineMisses(challengeId: string): Promise<number> {
  const challenge = await prisma.locktoberChallenge.findUnique({
    where: { id: challengeId },
    select: {
      timezone: true,
      user: { select: { firstDayOfWeek: true } },
      tasks: {
        select: {
          id: true,
          title: true,
          kind: true,
          points: true,
          mode: true,
          cadence: true,
          maxCompletions: true,
          maxPoints: true,
          noteRequired: true,
          deadlineMinute: true,
          missPenalty: true,
          deadlineSetAt: true,
        },
      },
    },
  });
  if (!challenge) return 0;
  const completions = await prisma.locktoberCompletion.findMany({
    where: { challengeId },
    select: { id: true, taskId: true, completedAt: true, snapshot: true },
  });
  const ids = satisfiedDeadlineMissIds({
    tz: challenge.timezone,
    firstDayOfWeek: challenge.user.firstDayOfWeek,
    tasks: challenge.tasks,
    completions: completions.map((completion) => ({
      id: completion.id,
      taskId: completion.taskId,
      completedAt: completion.completedAt,
      deadlineMiss: isDeadlineMiss(completion.snapshot),
    })),
  });
  if (ids.length === 0) return 0;
  await prisma.locktoberCompletion.deleteMany({ where: { id: { in: ids } } });
  return ids.length;
}

function rewardPoints(
  year: number,
  tz: string,
  cumDays: CumDayInput[],
  day: CumDayInput,
  completions: { completedAt: Date; pointsAwarded: number }[],
  tasks: TimeLockedTaskInput[],
  sessions: LockedSpan[],
) {
  const window = rewardWindowFor(year, tz, cumDays, day);
  const auto = timeLockedInWindow({
    tasks,
    sessions,
    start: window.start,
    end: window.end,
  });
  return cyclePoints(completions, window.start, window.end, auto.total);
}

/** Lock every cum day whose midnight has passed, and refresh an open reward's points. */
export async function ensureCumDayLocks(challengeId: string) {
  await applyMissedDeadlines(challengeId);
  const challenge = await prisma.locktoberChallenge.findUnique({
    where: { id: challengeId },
    include: {
      tiers: { orderBy: { sortOrder: "asc" } },
      cumDays: { orderBy: { date: "asc" } },
      completions: {
        select: { completedAt: true, pointsAwarded: true },
      },
      tasks: {
        select: {
          id: true,
          mode: true,
          points: true,
          rateEvery: true,
          rateUnit: true,
        },
      },
    },
  });
  if (!challenge) return;

  const sessions = await prisma.chastitySession.findMany({
    where: {
      userId: challenge.userId,
      startTime: { lt: new Date(`${challenge.year + 1}-01-01T00:00:00.000Z`) },
      OR: [
        { endTime: null },
        { endTime: { gt: new Date(`${challenge.year}-08-01T00:00:00.000Z`) } },
      ],
    },
    select: { startTime: true, endTime: true },
  });

  const cumDays = toCumDays(challenge.cumDays);
  const liveTiers = tiersToSnapshot(challenge.tiers);
  const now = dayjs().tz(challenge.timezone);

  for (const day of cumDays) {
    if (day.status === "CLAIMED" || day.status === "SKIPPED") continue;
    if (cumDayInstant(day.date, challenge.timezone).isAfter(now)) break;

    const points = rewardPoints(
      challenge.year,
      challenge.timezone,
      cumDays,
      day,
      challenge.completions,
      challenge.tasks,
      sessions,
    );
    if (day.status === "LOCKED") {
      if (day.pointsAtLock !== points) {
        await prisma.locktoberCumDay.update({
          where: { id: day.id },
          data: { pointsAtLock: points },
        });
        day.pointsAtLock = points;
      }
      continue;
    }
    await prisma.locktoberCumDay.update({
      where: { id: day.id },
      data: {
        status: "LOCKED",
        pointsAtLock: points,
        tierSnapshot: liveTiers as unknown as Prisma.InputJsonValue,
      },
    });
    day.status = "LOCKED";
    day.pointsAtLock = points;
    day.tierSnapshot = liveTiers;
  }
}
