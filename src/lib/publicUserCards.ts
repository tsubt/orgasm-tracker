import { prisma } from "@/prisma";
import type { PublicUserCard } from "@/lib/publicUserCard";

export type PublicUserCardWithActivity = PublicUserCard & {
  lastActivityAt: Date;
};

export async function loadPublicUserCards(
  userIds?: string[],
): Promise<PublicUserCardWithActivity[]> {
  if (userIds && userIds.length === 0) return [];

  const users = await prisma.user.findMany({
    where: userIds
      ? { id: { in: userIds }, publicProfile: true }
      : { publicProfile: true },
    select: {
      id: true,
      username: true,
      joinedAt: true,
      lastSeen: true,
      trackChastityStatus: true,
      publicOrgasms: true,
    },
  });

  if (users.length === 0) return [];

  const publicOrgasmIds = users.filter((user) => user.publicOrgasms).map((user) => user.id);
  const trackingIds = users
    .filter((user) => user.trackChastityStatus)
    .map((user) => user.id);

  const [orgasmStats, activeSessions, chastityActivity] = await Promise.all([
    publicOrgasmIds.length > 0
      ? prisma.orgasm.groupBy({
          by: ["userId"],
          where: { userId: { in: publicOrgasmIds }, timestamp: { not: null } },
          _count: { _all: true },
          _max: { timestamp: true },
        })
      : [],
    trackingIds.length > 0
      ? prisma.chastitySession.findMany({
          where: { userId: { in: trackingIds }, endTime: null },
          select: { userId: true, startTime: true },
          orderBy: { startTime: "desc" },
        })
      : [],
    trackingIds.length > 0
      ? prisma.chastitySession.groupBy({
          by: ["userId"],
          where: { userId: { in: trackingIds } },
          _max: { startTime: true, endTime: true },
        })
      : [],
  ]);

  const orgasmByUser = new Map(orgasmStats.map((stat) => [stat.userId, stat]));
  const activeByUser = new Map<string, Date>();
  for (const session of activeSessions) {
    if (!activeByUser.has(session.userId)) {
      activeByUser.set(session.userId, session.startTime);
    }
  }
  const chastityByUser = new Map(
    chastityActivity.map((stat) => [stat.userId, stat]),
  );

  return users.map((user) => {
    const orgasm = orgasmByUser.get(user.id);
    const chastity = chastityByUser.get(user.id);
    const lastOrgasmAt = user.publicOrgasms ? (orgasm?._max.timestamp ?? null) : null;
    const times = [user.lastSeen.getTime()];
    if (lastOrgasmAt) times.push(lastOrgasmAt.getTime());
    if (user.trackChastityStatus && chastity) {
      if (chastity._max.startTime) times.push(chastity._max.startTime.getTime());
      if (chastity._max.endTime) times.push(chastity._max.endTime.getTime());
    }

    return {
      id: user.id,
      username: user.username,
      joinedAt: user.joinedAt,
      lastSeen: user.lastSeen,
      trackChastityStatus: user.trackChastityStatus,
      publicOrgasms: user.publicOrgasms,
      orgasmCount: user.publicOrgasms ? (orgasm?._count._all ?? 0) : 0,
      lastOrgasmAt,
      activeChastityStart: user.trackChastityStatus
        ? (activeByUser.get(user.id) ?? null)
        : null,
      lastActivityAt: new Date(Math.max(...times)),
    };
  });
}
