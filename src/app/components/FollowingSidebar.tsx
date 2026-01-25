import { prisma } from "@/prisma";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import relativeTime from "dayjs/plugin/relativeTime";
import duration from "dayjs/plugin/duration";
import Link from "next/link";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.extend(duration);

export default async function FollowingSidebar({
  userId,
}: {
  userId: string;
}) {
  // Get all users the current user is following
  const follows = await prisma.follow.findMany({
    where: {
      followerId: userId,
    },
    select: {
      followingId: true,
    },
  });

  const followingIds = follows.map((f) => f.followingId);

  if (followingIds.length === 0) {
    return null;
  }

  // Get followed users with their public orgasms and chastity status
  const followedUsers = await prisma.user.findMany({
    where: {
      id: { in: followingIds },
      publicProfile: true,
    },
    select: {
      id: true,
      username: true,
      publicOrgasms: true,
      trackChastityStatus: true,
    },
  });

  // Get recent orgasms from followed users (only if publicOrgasms is enabled)
  const usersWithPublicOrgasms = followedUsers.filter(
    (u) => u.publicOrgasms
  );
  const publicOrgasmsUsersIds = usersWithPublicOrgasms.map((u) => u.id);

  const recentOrgasms =
    publicOrgasmsUsersIds.length > 0
      ? await prisma.orgasm.findMany({
          where: {
            userId: { in: publicOrgasmsUsersIds },
            timestamp: { not: null },
          },
          orderBy: { timestamp: "desc" },
          take: 5,
          include: {
            user: {
              select: {
                username: true,
              },
            },
          },
        })
      : [];

  // Get active chastity sessions from followed users
  const usersWithChastityTracking = followedUsers.filter(
    (u) => u.trackChastityStatus
  );
  const chastityUsersIds = usersWithChastityTracking.map((u) => u.id);

  const activeSessions =
    chastityUsersIds.length > 0
      ? await prisma.chastitySession.findMany({
          where: {
            userId: { in: chastityUsersIds },
            endTime: null,
          },
          include: {
            user: {
              select: {
                username: true,
              },
            },
          },
          orderBy: { startTime: "desc" },
        })
      : [];

  return (
    <div className="w-full xl:w-80 space-y-6">
      {/* Recent Orgasms Section */}
      {recentOrgasms.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-3">
            Recent Activity
          </h3>
          <div className="space-y-2">
            {recentOrgasms.map((orgasm) => {
              if (!orgasm.timestamp || !orgasm.user.username) return null;
              const timeAgo = dayjs(orgasm.timestamp).fromNow();
              return (
                <div
                  key={orgasm.id}
                  className="text-sm text-gray-700 dark:text-gray-300"
                >
                  <Link
                    href={`/u/${orgasm.user.username}`}
                    className="font-medium text-pink-600 dark:text-pink-400 hover:underline"
                  >
                    {orgasm.user.username}
                  </Link>{" "}
                  <span className="text-gray-500 dark:text-gray-400">
                    orgasmed {timeAgo}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Currently Locked Section */}
      {activeSessions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-3">
            Currently Locked
          </h3>
          <div className="space-y-2">
            {activeSessions.map((session) => {
              if (!session.user.username) return null;
              const startTime = dayjs(session.startTime);
              const durationText = startTime.fromNow(true);
              return (
                <div
                  key={session.id}
                  className="text-sm text-gray-700 dark:text-gray-300"
                >
                  <Link
                    href={`/u/${session.user.username}`}
                    className="font-medium text-pink-600 dark:text-pink-400 hover:underline"
                  >
                    {session.user.username}
                  </Link>{" "}
                  <span className="text-gray-500 dark:text-gray-400">
                    has been locked for {durationText}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state if no content */}
      {recentOrgasms.length === 0 && activeSessions.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            No recent activity from people you follow
          </p>
        </div>
      )}
    </div>
  );
}
