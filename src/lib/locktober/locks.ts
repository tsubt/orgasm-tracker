import { prisma } from "@/prisma";
import { Prisma } from "@prisma/client";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { satisfiedDeadlineMissIds } from "./deadline";
import {
  CumDayInput,
  cumDayInstant,
  cyclePoints,
  dateOnlyString,
  highestTier,
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

/** Drop an old automatic miss once a real log exists for that period. */
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

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Lock every cum day whose midnight has passed, and refresh an open reward's points.
 * A blocking lock holds the connection until the function is killed, so a busy
 * challenge is left for the request that already has it.
 */
export async function ensureCumDayLocks(challengeId: string) {
  for (let attempt = 0; attempt < 4; attempt++) {
    if (await resolveCumDayLocks(challengeId)) return;
    await wait(75);
  }
}

async function resolveCumDayLocks(challengeId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const [slot] = await tx.$queryRaw<Array<{ locked: boolean }>>`
      SELECT pg_try_advisory_xact_lock(
        hashtext('locktober-cumday'),
        hashtext(${challengeId})
      ) AS "locked"
    `;
    if (!slot?.locked) return false;

    const challenge = await tx.locktoberChallenge.findUnique({
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
    if (!challenge) return true;

    const sessions = await tx.chastitySession.findMany({
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
      const tiers = day.tierSnapshot?.length ? day.tierSnapshot : liveTiers;
      if (!highestTier(points, tiers)) {
        const deniedAt = cumDayInstant(day.date, challenge.timezone).toDate();
        await tx.locktoberCumDay.updateMany({
          where: { id: day.id, status: day.status },
          data: {
            status: "SKIPPED",
            pointsAtLock: points,
            tierSnapshot: tiers as unknown as Prisma.InputJsonValue,
            claimedAt: deniedAt,
            claimedTierLabel: null,
          },
        });
        day.status = "SKIPPED";
        continue;
      }
      if (day.status === "LOCKED") {
        if (day.pointsAtLock !== points) {
          await tx.locktoberCumDay.updateMany({
            where: { id: day.id, status: "LOCKED" },
            data: { pointsAtLock: points },
          });
          day.pointsAtLock = points;
        }
        continue;
      }
      await tx.locktoberCumDay.updateMany({
        where: { id: day.id, status: "SCHEDULED" },
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
    return true;
  });
}
