import { prisma } from "@/prisma";
import dayjs from "dayjs";
import {
  LocktoberCadence,
  LocktoberCumDayStatus,
  LocktoberRateUnit,
  LocktoberTaskKind,
  LocktoberTaskMode,
  LocktoberVisibility,
  Prisma,
} from "@prisma/client";
import { applyMissedDeadlines, ensureCumDayLocks } from "./locks";
import { octoberCalendar, type LocktoberCalendarDay } from "./calendar";
import { locktoberTimeline, type LocktoberTimelineDay } from "./timeline";
import {
  BarView,
  CumDayInput,
  TierSnapshot,
  dateOnlyString,
  barAutoPoints,
  describeBar,
  focusYear,
  lockedMinutesInOctober,
  LockedSpan,
  parseTierSnapshot,
  snapshotTitle,
  isDeadlineMiss,
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
  description: string | null;
  kind: LocktoberTaskKind;
  points: number | null;
  mode: LocktoberTaskMode;
  cadence: LocktoberCadence;
  maxCompletions: number | null;
  maxPoints: number | null;
  noteRequired: boolean;
  deadlineMinute: number | null;
  missPenalty: number;
  rateEvery: number | null;
  rateUnit: LocktoberRateUnit | null;
  sortOrder: number;
  useCount: number;
};

export type SerializedCompletion = {
  id: string;
  taskId: string | null;
  completedAt: string;
  enteredAt: string;
  minutes: number | null;
  note: string | null;
  pointsAwarded: number;
  title: string;
  deadlineMiss: boolean;
  mode: LocktoberTaskMode | null;
  kind: LocktoberTaskKind | null;
  /** Point rate stored on the log. Null when the snapshot has no rate. */
  rate: number | null;
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

export type SerializedComment = {
  id: string;
  body: string;
  createdAt: string;
  userId: string;
  username: string | null;
  name: string | null;
};

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
  liked: boolean;
  comments: SerializedComment[];
  eventDays: LocktoberTimelineDay[];
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
  lockedMinutes: number;
  bar: BarView;
  cumDays: { date: string; status: LocktoberCumDayStatus }[];
};

function completionShape(snapshot: unknown): {
  mode: LocktoberTaskMode | null;
  kind: LocktoberTaskKind | null;
  rate: number | null;
} {
  if (!snapshot || typeof snapshot !== "object") {
    return { mode: null, kind: null, rate: null };
  }
  const row = snapshot as { mode?: unknown; kind?: unknown; points?: unknown };
  const modes = new Set<string>(Object.values(LocktoberTaskMode));
  const kinds = new Set<string>(Object.values(LocktoberTaskKind));
  return {
    mode:
      typeof row.mode === "string" && modes.has(row.mode)
        ? (row.mode as LocktoberTaskMode)
        : null,
    kind:
      typeof row.kind === "string" && kinds.has(row.kind)
        ? (row.kind as LocktoberTaskKind)
        : null,
    rate: typeof row.points === "number" ? row.points : null,
  };
}

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
  const auto = barAutoPoints({
    year: challenge.year,
    tz: challenge.timezone,
    cumDays,
    tasks: challenge.tasks,
    sessions,
  });
  const useCountByTask = new Map<string, number>();
  for (const completion of challenge.completions) {
    if (!completion.taskId || isDeadlineMiss(completion.snapshot)) continue;
    useCountByTask.set(
      completion.taskId,
      (useCountByTask.get(completion.taskId) ?? 0) + 1,
    );
  }
  const serializedCumDays = cumDays.map((day) => ({
    ...day,
    claimedAt: day.claimedAt ? new Date(day.claimedAt).toISOString() : null,
  }));
  const serializedCompletions = challenge.completions.map((completion) => ({
    id: completion.id,
    taskId: completion.taskId,
    completedAt: completion.completedAt.toISOString(),
    enteredAt: completion.enteredAt.toISOString(),
    minutes: completion.minutes,
    note: completion.note,
    pointsAwarded: completion.pointsAwarded,
    title: snapshotTitle(completion.snapshot),
    deadlineMiss: isDeadlineMiss(completion.snapshot),
    ...completionShape(completion.snapshot),
  }));
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
      description: task.description,
      kind: task.kind,
      points: task.points,
      mode: task.mode,
      cadence: task.cadence,
      maxCompletions: task.maxCompletions,
      maxPoints: task.maxPoints,
      noteRequired: task.noteRequired,
      deadlineMinute: task.deadlineMinute,
      missPenalty: task.missPenalty,
      rateEvery: task.rateEvery,
      rateUnit: task.rateUnit,
      sortOrder: task.sortOrder,
      useCount: useCountByTask.get(task.id) ?? 0,
    })),
    cumDays: serializedCumDays,
    completions: serializedCompletions,
    liked: false,
    comments: [],
    eventDays: locktoberTimeline({
      year: challenge.year,
      timeZone: challenge.timezone,
      now: new Date(),
      completions: serializedCompletions,
      cumDays: serializedCumDays,
      spans: sessions,
    }),
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
      auto.live,
      auto.reward,
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
  const found = await prisma.locktoberChallenge.findMany({
    where: { userId, year: { in: [year - 1, year, year + 1] } },
    select: { id: true },
  });
  for (const challenge of found) {
    await applyMissedDeadlines(challenge.id);
    if (options?.lockDays) await ensureCumDayLocks(challenge.id);
  }
  const challenges = await prisma.locktoberChallenge.findMany({
    where: { userId, year: { in: [year - 1, year, year + 1] } },
    include: challengeInclude,
    orderBy: { year: "desc" },
  });
  const ids = challenges.map((challenge) => challenge.id);
  const [sessions, active, commentRows, likeRows] = await Promise.all([
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
      select: { id: true, startTime: true, endTime: true, note: true },
    }),
    ids.length === 0
      ? Promise.resolve([])
      : prisma.locktoberComment.findMany({
          where: { challengeId: { in: ids } },
          orderBy: { createdAt: "asc" },
          include: { user: { select: { id: true, username: true, name: true } } },
        }),
    ids.length === 0
      ? Promise.resolve([])
      : prisma.locktoberLike.findMany({
          where: { userId, challengeId: { in: ids } },
          select: { challengeId: true },
        }),
  ]);
  const commentsByChallenge = new Map<string, SerializedComment[]>();
  for (const comment of commentRows) {
    const list = commentsByChallenge.get(comment.challengeId) ?? [];
    list.push({
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
      userId: comment.user.id,
      username: comment.user.username,
      name: comment.user.name,
    });
    commentsByChallenge.set(comment.challengeId, list);
  }
  const likedIds = new Set(likeRows.map((like) => like.challengeId));

  return {
    user,
    challenges: challenges.map((challenge) => ({
      ...serializeChallenge(challenge, sessions),
      comments: commentsByChallenge.get(challenge.id) ?? [],
      liked: likedIds.has(challenge.id),
    })),
    activeChastity: active
      ? {
          id: active.id,
          startTime: active.startTime.toISOString(),
          endTime: null,
          note: active.note,
        }
      : null,
  };
}

export async function loadChallengeById(id: string) {
  return prisma.locktoberChallenge.findUnique({
    where: { id },
    include: challengeInclude,
  });
}

export async function loadChallengeBySlug(slug: string) {
  const challenge = await loadChallengeBySlugRecord(slug);
  if (!challenge) return null;
  await applyMissedDeadlines(challenge.id);
  await ensureCumDayLocks(challenge.id);
  return loadChallengeById(challenge.id);
}

async function loadChallengeBySlugRecord(slug: string) {
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
  const due = await prisma.locktoberTask.findMany({
    where: {
      deadlineMinute: { not: null },
      missPenalty: { gt: 0 },
      mode: { not: "TIME_LOCKED" },
      challenge: { visibility: "PUBLIC", year },
    },
    select: { challengeId: true },
    distinct: ["challengeId"],
  });
  for (const task of due) {
    await applyMissedDeadlines(task.challengeId);
  }

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
      const auto = barAutoPoints({
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
        lockedMinutes: lockedMinutesInOctober(challenge.year, challenge.timezone, mine),
        bar: describeBar(
          challenge.year,
          challenge.timezone,
          cumDays,
          tiers,
          challenge.completions,
          auto.live,
          auto.reward,
        ),
        cumDays: cumDays.map((day) => ({ date: day.date, status: day.status })),
      };
    })
    .sort((a, b) => b.bar.points - a.bar.points);
}
