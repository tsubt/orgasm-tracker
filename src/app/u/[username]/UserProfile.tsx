import { prisma } from "@/prisma";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import duration from "dayjs/plugin/duration";
import { auth } from "@/auth";
import { notFound } from "next/navigation";
import BioWithEdit from "./BioWithEdit";
import EditBioButton from "./EditBioButton";
import OrgasmFeed from "./OrgasmFeed";
import ProfileChart from "@/app/components/ProfileChart";
import ProfileChartEditor from "./ProfileChartEditor";
import FollowButton from "./FollowButton";
import Link from "next/link";
import { Suspense } from "react";
import { TheirTime, RelativeTime } from "@/app/components/SubjectTime";
import { at, clock, resolveTimeZone } from "@/lib/zonedTime";

dayjs.extend(isoWeek);
dayjs.extend(duration);

export default async function UserProfile({ username }: { username: string }) {
  const session = await auth();
  const currentUserId = session?.user?.id;

  // Check if user exists and has public profile
  const user = await prisma.user.findUnique({
    where: {
      username: username,
    },
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      bio: true,
      publicProfile: true,
      publicOrgasms: true,
      trackChastityStatus: true,
      defaultProfileChart: true,
      firstDayOfWeek: true,
      timezone: true,
      joinedAt: true,
    },
  });

  if (!user || !user.publicProfile) {
    notFound();
  }

  const isOwnProfile = currentUserId === user.id;

  // Fetch follow counts and status
  const [followerCount, followingCount] = await Promise.all([
    prisma.follow.count({
      where: { followingId: user.id },
    }),
    prisma.follow.count({
      where: { followerId: user.id },
    }),
  ]);

  // Check if current user is following this profile
  const isFollowing = currentUserId
    ? await prisma.follow.findFirst({
        where: {
          followerId: currentUserId,
          followingId: user.id,
        },
      })
    : null;

  // Fetch orgasms if publicOrgasms is enabled
  const orgasms = user.publicOrgasms
    ? await prisma.orgasm.findMany({
        where: {
          userId: user.id,
          timestamp: { not: null },
        },
        orderBy: { timestamp: "desc" },
      })
    : [];

  // Filter orgasms with timestamps
  const validOrgasms = orgasms.filter((o) => o.timestamp !== null);

  // Fetch chastity sessions if trackChastityStatus is enabled
  const chastitySessions =
    user.trackChastityStatus
      ? await prisma.chastitySession.findMany({
          where: { userId: user.id },
          orderBy: { startTime: "desc" },
        })
      : [];

  // Get current session (if active) and last session
  const currentSession = chastitySessions.find((s) => s.endTime === null);
  const lastSession = chastitySessions.find((s) => s.endTime !== null);

  // Calendar buckets follow this person's zone. Relative phrases share one server instant.
  const timeZone = resolveTimeZone(user.timezone);
  const serverNow = new Date().toISOString();
  const now = clock(serverNow, timeZone);
  const totalCount = validOrgasms.length;

  const currentYear = now.year();
  const currentMonth = now.month();
  const currentWeek = now.isoWeek();
  const currentWeekYear = now.isoWeekYear();

  const thisYearCount = validOrgasms.filter((o) => {
    return at(o.timestamp, timeZone).year() === currentYear;
  }).length;

  const thisMonthCount = validOrgasms.filter((o) => {
    const date = at(o.timestamp, timeZone);
    return date.year() === currentYear && date.month() === currentMonth;
  }).length;

  const thisWeekCount = validOrgasms.filter((o) => {
    const date = at(o.timestamp, timeZone);
    return (
      date.isoWeekYear() === currentWeekYear && date.isoWeek() === currentWeek
    );
  }).length;

  // Format join date - use earliest orgasm if it's earlier than joinedAt
  const earliestOrgasm =
    validOrgasms.length > 0
      ? validOrgasms.reduce((earliest, current) => {
          const earliestDate = dayjs(earliest.timestamp);
          const currentDate = dayjs(current.timestamp);
          return currentDate.isBefore(earliestDate) ? current : earliest;
        })
      : null;

  const accountJoinDate = dayjs(user.joinedAt);
  const effectiveJoinDate = earliestOrgasm
    ? dayjs(earliestOrgasm.timestamp).isBefore(accountJoinDate)
      ? dayjs(earliestOrgasm.timestamp)
      : accountJoinDate
    : accountJoinDate;

  const joinDateFormatted = at(effectiveJoinDate.toDate(), timeZone).format(
    "MMMM YYYY",
  );

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex flex-col gap-4">
          {/* Username and Action Buttons */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                @{user.username}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {isOwnProfile && (
                <Suspense fallback={null}>
                  <EditBioButton initialBio={user.bio} isOwnProfile={isOwnProfile} />
                </Suspense>
              )}
              {!isOwnProfile && currentUserId && user.username && (
                <FollowButton
                  username={user.username}
                  isFollowing={!!isFollowing}
                />
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1 text-sm text-gray-500 dark:text-gray-400">
            <div>Joined {joinDateFormatted}</div>
            <TheirTime
              timeZone={timeZone}
              serverNow={serverNow}
              own={isOwnProfile}
            />
          </div>

          {/* Bio */}
          <Suspense fallback={<div className="h-12" />}>
            <BioWithEdit initialBio={user.bio} isOwnProfile={isOwnProfile} />
          </Suspense>

          {/* Followers/Following Counts */}
          <div className="flex items-center gap-4 text-sm">
            <Link
              href={`/u/${user.username}/followers`}
              className="hover:underline text-gray-700 dark:text-gray-300"
            >
              <span className="font-semibold text-gray-900 dark:text-white">
                {followerCount}
              </span>{" "}
              follower{followerCount !== 1 ? "s" : ""}
            </Link>
            <Link
              href={`/u/${user.username}/following`}
              className="hover:underline text-gray-700 dark:text-gray-300"
            >
              <span className="font-semibold text-gray-900 dark:text-white">
                {followingCount}
              </span>{" "}
              following
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center hover:shadow-md hover:bg-white dark:hover:bg-gray-700 transition-all">
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {totalCount.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Total</div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center hover:shadow-md hover:bg-white dark:hover:bg-gray-700 transition-all">
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {thisYearCount.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {currentYear}
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center hover:shadow-md hover:bg-white dark:hover:bg-gray-700 transition-all">
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {thisMonthCount.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            This Month
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center hover:shadow-md hover:bg-white dark:hover:bg-gray-700 transition-all">
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {thisWeekCount.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            This Week
          </div>
        </div>
      </div>

      {/* Chastity Sessions */}
      {user.trackChastityStatus && chastitySessions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {currentSession && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md hover:bg-white dark:hover:bg-gray-700 transition-all">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Current Session
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                Started{" "}
                <RelativeTime
                  at={currentSession.startTime}
                  serverNow={serverNow}
                />
              </div>
            </div>
          )}
          {lastSession && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md hover:bg-white dark:hover:bg-gray-700 transition-all">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Last Session
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                Lasted {dayjs
                  .duration(
                    dayjs(lastSession.endTime).diff(dayjs(lastSession.startTime))
                  )
                  .humanize()}
              </div>
              {lastSession.endTime && (
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Ended{" "}
                  <RelativeTime
                    at={lastSession.endTime}
                    serverNow={serverNow}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Charts */}
      {validOrgasms.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Activity
            </h2>
            {isOwnProfile && (
              <ProfileChartEditor
                currentChart={user.defaultProfileChart || "Frequency"}
                userId={user.id}
              />
            )}
          </div>
          <Suspense
            fallback={
              <div className="text-gray-500 dark:text-gray-400">
                Loading charts...
              </div>
            }
          >
            <ProfileChart
              orgasms={validOrgasms}
              tz={timeZone}
              now={serverNow}
              defaultChart={user.defaultProfileChart}
              firstDayOfWeek={user.firstDayOfWeek ?? 1}
              chastitySessions={user.trackChastityStatus ? chastitySessions : []}
            />
          </Suspense>
        </div>
      )}

      {/* Feed */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Feed
        </h2>
        <OrgasmFeed
          orgasms={validOrgasms}
          chastitySessions={user.trackChastityStatus ? chastitySessions : []}
          tz={timeZone}
          now={serverNow}
        />
      </div>
    </div>
  );
}
