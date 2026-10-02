import { prisma } from "@/prisma";
import { Prisma } from "@prisma/client";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { missedDeadlinePenalties } from "./deadline";
import {
  CumDayInput,
  cumDayInstant,
  dateOnlyString,
  isDeadlineMiss,
  parseTierSnapshot,
  tiersToSnapshot,
  currentCycle,
  cyclePoints,
  timeLockedProgress,
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
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "LocktoberChallenge" WHERE id = ${challengeId} FOR UPDATE`;
    const completions = await tx.locktoberCompletion.findMany({
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
    await tx.locktoberCompletion.createMany({
      data: pending.map((item) => ({
        challengeId: challenge.id,
        taskId: item.taskId,
        completedAt: item.completedAt,
        note: item.note,
        pointsAwarded: item.pointsAwarded,
        snapshot: item.snapshot as unknown as Prisma.InputJsonValue,
      })),
    });
    return pending.length;
  });
}

/** Freeze the earliest unresolved cum day once its local midnight has passed. */
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
    if (day.status === "LOCKED") return;
    if (cumDayInstant(day.date, challenge.timezone).isAfter(now)) return;

    const cycle = currentCycle(challenge.year, challenge.timezone, cumDays);
    const auto = timeLockedProgress({
      year: challenge.year,
      tz: challenge.timezone,
      cumDays,
      tasks: challenge.tasks,
      sessions,
      now,
    });
    const points = cyclePoints(
      challenge.completions,
      cycle.start,
      cycle.end,
      auto.total,
      cycle.gapStart,
    );
    await prisma.locktoberCumDay.update({
      where: { id: day.id },
      data: {
        status: "LOCKED",
        pointsAtLock: points,
        tierSnapshot: liveTiers as unknown as Prisma.InputJsonValue,
      },
    });
    return;
  }
}
