import { prisma } from "@/prisma";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import isoWeek from "dayjs/plugin/isoWeek";
import { auth } from "@/auth";
import { notFound } from "next/navigation";
import BioEditor from "./BioEditor";
import OrgasmFeed from "./OrgasmFeed";
import Charts from "@/app/components/charts";
import { Suspense } from "react";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isoWeek);

export default async function UserProfile({
  username,
}: {
  username: string;
}) {
  const session = await auth();
  const currentUserId = session?.user?.id;

  // Check if user exists and has public profile
  const user = await prisma.user.findUnique({
    where: {
      username: username,
    },
  });

  if (!user || !user.publicProfile) {
    notFound();
  }

  const isOwnProfile = currentUserId === user.id;

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

  // Calculate stats
  const now = dayjs();
  const totalCount = validOrgasms.length;

  // Get current year, month, week counts
  const currentYear = now.year();
  const currentMonth = now.month();
  const currentWeek = now.isoWeek();

  const thisYearCount = validOrgasms.filter((o) => {
    const date = dayjs(o.timestamp);
    return date.year() === currentYear;
  }).length;

  const thisMonthCount = validOrgasms.filter((o) => {
    const date = dayjs(o.timestamp);
    return date.year() === currentYear && date.month() === currentMonth;
  }).length;

  const thisWeekCount = validOrgasms.filter((o) => {
    const date = dayjs(o.timestamp);
    return (
      date.year() === currentYear && date.isoWeek() === currentWeek
    );
  }).length;

  // Format join date - use earliest orgasm if it's earlier than joinedAt
  const earliestOrgasm = validOrgasms.length > 0
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

  const joinDateFormatted = effectiveJoinDate.format("MMMM YYYY");

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex flex-col gap-4">
          {/* Username */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              @{user.username}
            </h1>
          </div>

          {/* Join Date */}
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Joined {joinDateFormatted}
          </div>

          {/* Bio */}
          <div className="mt-2">
            <Suspense fallback={<div className="h-12" />}>
              <BioEditor initialBio={user.bio} isOwnProfile={isOwnProfile} />
            </Suspense>
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

      {/* Charts */}
      {validOrgasms.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Activity
          </h2>
          <Suspense fallback={<div className="text-gray-500 dark:text-gray-400">Loading charts...</div>}>
            <Charts userId={user.id} tz="UTC" />
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
          tz={Intl.DateTimeFormat().resolvedOptions().timeZone}
        />
      </div>
    </div>
  );
}
