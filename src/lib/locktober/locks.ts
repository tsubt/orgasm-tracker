import { prisma } from "@/prisma";
import { Prisma } from "@prisma/client";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import {
  CumDayInput,
  cumDayInstant,
  dateOnlyString,
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

/** Freeze the earliest unresolved cum day once its local midnight has passed. */
export async function ensureCumDayLocks(challengeId: string) {
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
