import { prisma } from "@/prisma";
import dayjs from "dayjs";
import {
  LocktoberCadence,
  LocktoberCumDayStatus,
  LocktoberTaskKind,
  LocktoberTaskMode,
  LocktoberVisibility,
  Prisma,
} from "@prisma/client";
import { ensureCumDayLocks } from "./locks";
import { octoberCalendar, type LocktoberCalendarDay } from "./calendar";
import {
  BarView,
  CumDayInput,
  TierSnapshot,
  dateOnlyString,
  describeBar,
  focusYear,
  LockedSpan,
  parseTierSnapshot,
  snapshotTitle,
  timeLockedProgress,
  tiersToSnapshot,
} from "./scoring";

const challengeInclude = {
  tiers: { orderBy: { sortOrder: "asc" as const } },
  cumDays: { orderBy: { date: "asc" as const } },
  tasks: { orderBy: { sortOrder: "asc" as const } },
  completions: { orderBy: { completedAt: "desc" as const } },
  _count: { select: { likes: true, comments: true } },
} satisfies Prisma.LocktoberChallengeInclude;

type ChallengeRecord = Prisma.LocktoberChallengeGetPayload<{
  include: typeof challengeInclude;
}>;

export type SerializedTask = {
  id: string;
  title: string;
  kind: LocktoberTaskKind;
  points: number | null;
  mode: LocktoberTaskMode;
  cadence: LocktoberCadence;
  maxCompletions: number | null;
  maxPoints: number | null;
  noteRequired: boolean;
  rateEvery: number | null;
  rateUnit: "HOUR" | "DAY" | null;
  sortOrder: number;
  useCount: number;
};

export type SerializedCompletion = {
  id: string;
  taskId: string | null;
  completedAt: string;
  minutes: number | null;
  note: string | null;
  pointsAwarded: number;
  title: string;
};

export type SerializedCumDay = {
  id: string;
  date: string;
  status: LocktoberCumDayStatus;
  pointsAtLock: number | null;
  tierSnapshot: TierSnapshot[] | null;
  claimedTierLabel: string | null;
  claimedAt: string | null;
};

export type SerializedTier = TierSnapshot & { id: string };

export type SerializedChallenge = {
  id: string;
  year: number;
  timezone: string;
  allowedOrgasms: number;
  visibility: LocktoberVisibility;
  shareSlug: string;
  updatedAt: string;
  likeCount: number;
  commentCount: number;
  tiers: SerializedTier[];
  tasks: SerializedTask[];
  cumDays: SerializedCumDay[];
  completions: SerializedCompletion[];
  timeLocked: { taskId: string; lockedMs: number; points: number }[];
  calendar: LocktoberCalendarDay[];
  bar: BarView;
};

export type PublicChallengeCard = {
  id: string;
  year: number;
  shareSlug: string;
  username: string | null;
  name: string | null;
  likeCount: number;
  bar: BarView;
  cumDays: { date: string; status: LocktoberCumDayStatus }[];
};

function cumDayInputs(challenge: ChallengeRecord): CumDayInput[] {
  return challenge.cumDays.map((day) => ({
    id: day.id,
    date: dateOnlyString(day.date),
    status: day.status,
    pointsAtLock: day.pointsAtLock,
    tierSnapshot: parseTierSnapshot(day.tierSnapshot),
    claimedTierLabel: day.claimedTierLabel,
    claimedAt: day.claimedAt,
  }));
}

export async function loadChastitySpans(userId: string, year: number): Promise<LockedSpan[]> {
  return prisma.chastitySession.findMany({
    where: chastityWhere(userId, year),
    select: { startTime: true, endTime: true },
  });
}

function chastityWhere(userId: string, year: number) {
  return {
    userId,
    startTime: { lt: new Date(`${year + 1}-01-01T00:00:00.000Z`) },
    OR: [
      { endTime: null },
      { endTime: { gt: new Date(`${year}-08-01T00:00:00.000Z`) } },
    ],
  };
}

export function serializeChallenge(
  challenge: ChallengeRecord,
  sessions: LockedSpan[] = [],
): SerializedChallenge {
  const cumDays = cumDayInputs(challenge);
  const tiers = tiersToSnapshot(challenge.tiers);
  const timeLocked = timeLockedProgress({
    year: challenge.year,
    tz: challenge.timezone,
    cumDays,
    tasks: challenge.tasks,
    sessions,
  });
  const useCountByTask = new Map<string, number>();
  for (const completion of challenge.completions) {
    if (!completion.taskId) continue;
    useCountByTask.set(
      completion.taskId,
      (useCountByTask.get(completion.taskId) ?? 0) + 1,
    );
  }
  return {
    id: challenge.id,
    year: challenge.year,
    timezone: challenge.timezone,
    allowedOrgasms: challenge.allowedOrgasms,
    visibility: challenge.visibility,
    shareSlug: challenge.shareSlug,
    updatedAt: challenge.updatedAt.toISOString(),
    likeCount: challenge._count.likes,
    commentCount: challenge._count.comments,
    tiers: challenge.tiers.map((tier, index) => ({
      id: tier.id,
      label: tier.label,
      points: tier.points,
      orgasmType: tier.orgasmType,
      expectsLocked: tier.expectsLocked,
      sortOrder: tier.sortOrder ?? index,
    })),
    tasks: challenge.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      kind: task.kind,
      points: task.points,
      mode: task.mode,
      cadence: task.cadence,
      maxCompletions: task.maxCompletions,
      maxPoints: task.maxPoints,
      noteRequired: task.noteRequired,
      rateEvery: task.rateEvery,
      rateUnit: task.rateUnit,
      sortOrder: task.sortOrder,
      useCount: useCountByTask.get(task.id) ?? 0,
    })),
    cumDays: cumDays.map((day) => ({
      ...day,
      claimedAt: day.claimedAt ? new Date(day.claimedAt).toISOString() : null,
    })),
    completions: challenge.completions.map((completion) => ({
      id: completion.id,
      taskId: completion.taskId,
      completedAt: completion.completedAt.toISOString(),
      minutes: completion.minutes,
      note: completion.note,
      pointsAwarded: completion.pointsAwarded,
      title: snapshotTitle(completion.snapshot),
    })),
    timeLocked: timeLocked.byTask,
    calendar: octoberCalendar({
      year: challenge.year,
      tz: challenge.timezone,
      cumDays,
      tiers,
      tasks: challenge.tasks,
      sessions,
      completions: challenge.completions,
    }),
    bar: describeBar(
      challenge.year,
      challenge.timezone,
      cumDays,
      tiers,
      challenge.completions,
      timeLocked.total,
    ),
  };
}

export async function loadOwnerLocktober(
  userId: string,
  options?: { lockDays?: boolean },
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      name: true,
      firstDayOfWeek: true,
      hideLocktoberBoard: true,
      trackChastityStatus: true,
    },
  });
  if (!user) return null;

  const year = new Date().getUTCFullYear();
  if (options?.lockDays) {
    const found = await prisma.locktoberChallenge.findMany({
      where: { userId, year: { in: [year - 1, year, year + 1] } },
      select: { id: true },
    });
    for (const challenge of found) {
      await ensureCumDayLocks(challenge.id);
    }
  }
  const challenges = await prisma.locktoberChallenge.findMany({
    where: { userId, year: { in: [year - 1, year, year + 1] } },
    include: challengeInclude,
    orderBy: { year: "desc" },
  });
  const [sessions, active] = await Promise.all([
    prisma.chastitySession.findMany({
      where: {
        userId,
        startTime: { lt: new Date(`${year + 2}-01-01T00:00:00.000Z`) },
        OR: [
          { endTime: null },
          { endTime: { gt: new Date(`${year - 1}-08-01T00:00:00.000Z`) } },
        ],
      },
      select: { startTime: true, endTime: true },
    }),
    prisma.chastitySession.findFirst({
      where: { userId, endTime: null },
      select: { id: true, startTime: true },
    }),
  ]);

  return {
    user,
    challenges: challenges.map((challenge) => serializeChallenge(challenge, sessions)),
    activeChastity: active
      ? { id: active.id, startTime: active.startTime.toISOString() }
      : null,
  };
}

export async function loadChallengeBySlug(slug: string) {
  const bySlug = await prisma.locktoberChallenge.findUnique({
    where: { shareSlug: slug },
    include: challengeInclude,
  });
  if (bySlug) return bySlug;

  const user = await prisma.user.findUnique({
    where: { username: slug },
    select: { id: true },
  });
  if (!user) return null;

  return prisma.locktoberChallenge.findFirst({
    where: {
      userId: user.id,
      visibility: "PUBLIC",
      year: focusYear(dayjs()),
    },
    include: challengeInclude,
  });
}

export async function loadPublicBoard(year: number): Promise<PublicChallengeCard[]> {
  const challenges = await prisma.locktoberChallenge.findMany({
    where: { visibility: "PUBLIC", year },
    include: {
      user: { select: { username: true, name: true } },
      tiers: { orderBy: { sortOrder: "asc" } },
      cumDays: { orderBy: { date: "asc" } },
      completions: { select: { completedAt: true, pointsAwarded: true } },
      tasks: {
        where: { mode: "TIME_LOCKED" },
        select: { id: true, mode: true, points: true, rateEvery: true, rateUnit: true },
      },
      _count: { select: { likes: true } },
    },
    take: 100,
  });
  const userIds = [...new Set(challenges.map((challenge) => challenge.userId))];
  const sessions = userIds.length
    ? await prisma.chastitySession.findMany({
        where: {
          userId: { in: userIds },
          startTime: { lt: new Date(`${year + 1}-01-01T00:00:00.000Z`) },
          OR: [
            { endTime: null },
            { endTime: { gt: new Date(`${year}-08-01T00:00:00.000Z`) } },
          ],
        },
        select: { userId: true, startTime: true, endTime: true },
      })
    : [];

  return challenges
    .map((challenge) => {
      const mine = sessions.filter((session) => session.userId === challenge.userId);
      const cumDays: CumDayInput[] = challenge.cumDays.map((day) => ({
        id: day.id,
        date: dateOnlyString(day.date),
        status: day.status,
        pointsAtLock: day.pointsAtLock,
        tierSnapshot: parseTierSnapshot(day.tierSnapshot),
        claimedTierLabel: day.claimedTierLabel,
        claimedAt: day.claimedAt,
      }));
      const tiers = tiersToSnapshot(challenge.tiers);
      const auto = timeLockedProgress({
        year: challenge.year,
        tz: challenge.timezone,
        cumDays,
        tasks: challenge.tasks,
        sessions: mine,
      });
      return {
        id: challenge.id,
        year: challenge.year,
        shareSlug: challenge.shareSlug,
        username: challenge.user.username,
        name: challenge.user.name,
        likeCount: challenge._count.likes,
        bar: describeBar(
          challenge.year,
          challenge.timezone,
          cumDays,
          tiers,
          challenge.completions,
          auto.total,
        ),
        cumDays: cumDays.map((day) => ({ date: day.date, status: day.status })),
      };
    })
    .sort((a, b) => b.bar.points - a.bar.points);
}
