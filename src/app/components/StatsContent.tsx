import { prisma } from "@/prisma";
import { Suspense } from "react";
import PickTime from "./PickTime";
import DashboardCharts from "./DashboardCharts";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import relativeTime from "dayjs/plugin/relativeTime";
import isoWeek from "dayjs/plugin/isoWeek";
import Link from "next/link";
import LastOrgasmDisplay from "./LastOrgasmDisplay";
import BreakdownStatsClient from "./BreakdownStatsClient";
import ChastityStatus from "./ChastityStatus";

dayjs.extend(timezone);
dayjs.extend(utc);
dayjs.extend(relativeTime);
dayjs.extend(isoWeek);

export default async function StatsContent({
  userId,
  time,
  tz,
}: {
  userId: string;
  time: string;
  tz: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { trackChastityStatus: true },
  });

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <Suspense fallback={<LoadingLastOrgasm />}>
          <LastOrgasm userId={userId} tz={tz} />
        </Suspense>
        <Link
          href="/fapped/2025"
          className="bg-pink-500 dark:bg-pink-600 text-white px-6 py-3 rounded-md shadow hover:bg-pink-600 dark:hover:bg-pink-700 transition-colors text-sm font-semibold uppercase tracking-wide w-full md:w-auto text-center"
        >
          Your 2025 Fapped
        </Link>
      </div>

      {user?.trackChastityStatus && (
        <Suspense fallback={null}>
          <ChastityStatus trackChastityStatus={user.trackChastityStatus} />
        </Suspense>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col gap-4 p-4 w-full">
        <Suspense fallback={null}>
          <PickTime />
        </Suspense>
        <Suspense fallback={<LoadingSummaryStats />}>
          <SummaryStats userId={userId} time={time} tz={tz} />
        </Suspense>
        <BreakdownStatsClient userId={userId} tz={tz} />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col gap-4 p-4 w-full">
        <Suspense fallback={<>Loading charts ...</>}>
          <DashboardChartsWrapper userId={userId} tz={tz} />
        </Suspense>
      </div>
    </div>
  );
}

async function LastOrgasm({ userId }: { userId: string; tz: string }) {
  const last = await prisma.orgasm.findFirst({
    where: {
      userId,
    },
    orderBy: {
      timestamp: "desc",
    },
  });

  if (last === null) return null;

  // Pass the timestamp to client component for timezone-aware formatting
  return <LastOrgasmDisplay timestamp={last.timestamp} />;
}

async function SummaryStats({
  userId,
  time,
  tz,
}: {
  userId: string;
  time: string;
  tz: string;
}) {
  const d = dayjs().tz(tz);

  // Helper to get date range for current period
  const getCurrentPeriodRange = () => {
    switch (time) {
      case "This year":
        return { gte: d.startOf("year").toDate() };
      case "This month":
        return { gte: d.startOf("month").toDate() };
      case "This week":
        return { gte: d.startOf("isoWeek").toDate() };
      case "Last 12 months":
        return { gte: d.subtract(12, "month").toDate() };
      case "Last 30 days":
        return { gte: d.subtract(30, "day").toDate() };
      case "Last 7 days":
        return { gte: d.subtract(7, "day").toDate() };
      default:
        return {};
    }
  };

  // Fetch current period orgasms
  const currentPeriodRange = getCurrentPeriodRange();
  const orgasms = await prisma.orgasm.findMany({
    where: {
      userId,
      timestamp: currentPeriodRange,
    },
  });

  // Filter orgasms with timestamps (date/time fields are deprecated)
  const validOrgasms = orgasms.filter((o) => o.timestamp !== null);

  const n = validOrgasms.length;

  if (n === 0)
    return (
      <div className="text-gray-700 dark:text-gray-300">No orgasms yet</div>
    );

  const last = validOrgasms
    .map((o) => dayjs(o.timestamp))
    .reduce((a, b) => (a.isAfter(b) ? a : b));
  const daysSinceLast = d.diff(last, "day");

  const times = validOrgasms
    .map((o) => dayjs(o.timestamp))
    .sort((a, b) => a.diff(b))
    .map((d, i, arr) => {
      if (i === 0) return null;
      return d.diff(arr[i - 1], "day");
    })
    .filter((d) => d !== null)
    .map((d) => (d ? d : 0));

  const streaks = times
    .reduce(
      (acc, cur) => {
        if (cur === 1) {
          acc[acc.length - 1] += 1;
        } else {
          acc.push(0);
        }
        return acc;
      },
      [0]
    )
    .map((x) => x + 1);
  const longestStreak = streaks.reduce((a, b) => (a > b ? a : b));

  // Include current "days without" if it's longer than historical gaps
  const historicalLongestGap = times.length ? Math.max(...times) - 1 : 0;
  const longestGap = Math.max(historicalLongestGap, daysSinceLast);

  // Get user's account creation date
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return (
      <div className="text-gray-700 dark:text-gray-300">User not found</div>
    );
  }

  // Get earliest orgasm to determine effective joined date
  const earliestOrgasm = await prisma.orgasm.findFirst({
    where: {
      userId,
      timestamp: { not: null },
    },
    orderBy: { timestamp: "asc" },
  });

  // Use whichever is earlier: user's joinedAt or first orgasm
  const effectiveJoinedAt = earliestOrgasm?.timestamp
    ? dayjs(user.joinedAt).isBefore(dayjs(earliestOrgasm.timestamp))
      ? dayjs(user.joinedAt).tz(tz)
      : dayjs(earliestOrgasm.timestamp).tz(tz)
    : dayjs(user.joinedAt).tz(tz);

  const joinedAt = effectiveJoinedAt;
  const now = d;

  // Calculate stats for "This year/month/week" periods
  let previousPeriodTotal: number | null = null;
  let averagePerPeriod: number | null = null;
  let currentVsAverage: number | null = null;
  let periodLabel: string | null = null;

  if (time === "This year") {
    periodLabel = "year";
    // Get previous year total
    const lastYearStart = d.subtract(1, "year").startOf("year");
    const lastYearEnd = d.subtract(1, "year").endOf("year");
    const lastYearOrgasms = await prisma.orgasm.findMany({
      where: {
        userId,
        timestamp: {
          gte: lastYearStart.toDate(),
          lte: lastYearEnd.toDate(),
        },
      },
    });
    previousPeriodTotal = lastYearOrgasms.filter(
      (o) => o.timestamp !== null
    ).length;

    // Calculate average: find first full year after joinedAt
    const firstFullYear = joinedAt.endOf("year").add(1, "day").startOf("year");
    const currentYearStart = now.startOf("year");

    // Only calculate if we have at least one full year
    if (firstFullYear.isBefore(currentYearStart)) {
      // Fetch all orgasms from first full year to current year start
      const allHistoricalOrgasms = await prisma.orgasm.findMany({
        where: {
          userId,
          timestamp: {
            gte: firstFullYear.toDate(),
            lt: currentYearStart.toDate(),
          },
        },
      });
      const validHistoricalOrgasms = allHistoricalOrgasms.filter(
        (o) => o.timestamp !== null
      );

      // Group by year
      const orgasmsByYear: { [year: number]: number } = {};
      validHistoricalOrgasms.forEach((o) => {
        const year = dayjs(o.timestamp).year();
        orgasmsByYear[year] = (orgasmsByYear[year] || 0) + 1;
      });

      const fullYears = Object.values(orgasmsByYear);
      if (fullYears.length > 0) {
        const total = fullYears.reduce((a, b) => a + b, 0);
        averagePerPeriod = total / fullYears.length;
        currentVsAverage = n - averagePerPeriod;
      }
    }
  } else if (time === "This month") {
    periodLabel = "month";
    // Get previous month total
    const lastMonthStart = d.subtract(1, "month").startOf("month");
    const lastMonthEnd = d.subtract(1, "month").endOf("month");
    const lastMonthOrgasms = await prisma.orgasm.findMany({
      where: {
        userId,
        timestamp: {
          gte: lastMonthStart.toDate(),
          lte: lastMonthEnd.toDate(),
        },
      },
    });
    previousPeriodTotal = lastMonthOrgasms.filter(
      (o) => o.timestamp !== null
    ).length;

    // Calculate average: find first full month after joinedAt
    const firstFullMonth = joinedAt
      .endOf("month")
      .add(1, "day")
      .startOf("month");
    const currentMonthStart = now.startOf("month");

    // Only calculate if we have at least one full month
    if (firstFullMonth.isBefore(currentMonthStart)) {
      // Fetch all orgasms from first full month to current month start
      const allHistoricalOrgasms = await prisma.orgasm.findMany({
        where: {
          userId,
          timestamp: {
            gte: firstFullMonth.toDate(),
            lt: currentMonthStart.toDate(),
          },
        },
      });
      const validHistoricalOrgasms = allHistoricalOrgasms.filter(
        (o) => o.timestamp !== null
      );

      // Group by year-month (YYYY-MM format)
      const orgasmsByMonth: { [month: string]: number } = {};
      validHistoricalOrgasms.forEach((o) => {
        const month = dayjs(o.timestamp).format("YYYY-MM");
        orgasmsByMonth[month] = (orgasmsByMonth[month] || 0) + 1;
      });

      const fullMonths = Object.values(orgasmsByMonth);
      if (fullMonths.length > 0) {
        const total = fullMonths.reduce((a, b) => a + b, 0);
        averagePerPeriod = total / fullMonths.length;
        currentVsAverage = n - averagePerPeriod;
      }
    }
  } else if (time === "This week") {
    periodLabel = "week";
    // Get previous week total
    const lastWeekStart = d.subtract(1, "week").startOf("isoWeek");
    const lastWeekEnd = d.subtract(1, "week").endOf("isoWeek");
    const lastWeekOrgasms = await prisma.orgasm.findMany({
      where: {
        userId,
        timestamp: {
          gte: lastWeekStart.toDate(),
          lte: lastWeekEnd.toDate(),
        },
      },
    });
    previousPeriodTotal = lastWeekOrgasms.filter(
      (o) => o.timestamp !== null
    ).length;

    // Calculate average: find first full week after joinedAt (next Monday)
    const firstFullWeek = joinedAt
      .endOf("isoWeek")
      .add(1, "day")
      .startOf("isoWeek");
    const currentWeekStart = now.startOf("isoWeek");

    // Only calculate if we have at least one full week
    if (firstFullWeek.isBefore(currentWeekStart)) {
      // Fetch all orgasms from first full week to current week start
      const allHistoricalOrgasms = await prisma.orgasm.findMany({
        where: {
          userId,
          timestamp: {
            gte: firstFullWeek.toDate(),
            lt: currentWeekStart.toDate(),
          },
        },
      });
      const validHistoricalOrgasms = allHistoricalOrgasms.filter(
        (o) => o.timestamp !== null
      );

      // Group by week (using year-week format YYYY-WW)
      const orgasmsByWeek: { [week: string]: number } = {};
      validHistoricalOrgasms.forEach((o) => {
        const weekStart = dayjs(o.timestamp).startOf("isoWeek");
        const weekKey = `${weekStart.year()}-W${weekStart.isoWeek()}`;
        orgasmsByWeek[weekKey] = (orgasmsByWeek[weekKey] || 0) + 1;
      });

      const fullWeeks = Object.values(orgasmsByWeek);
      if (fullWeeks.length > 0) {
        const total = fullWeeks.reduce((a, b) => a + b, 0);
        averagePerPeriod = total / fullWeeks.length;
        currentVsAverage = n - averagePerPeriod;
      }
    }
  }

  const formatDifference = (diff: number) => {
    return diff > 0 ? `+${Math.round(diff)}` : Math.round(diff).toString();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:flex md:items-center gap-3 md:gap-4">
        <Stat count={n} title="total of" unit={["orgasm", "orgasms"]} />
        <Stat
          count={daysSinceLast}
          title="currently"
          unit={["day without", "days without"]}
        />
        <Stat
          count={longestStreak}
          title="longest streak"
          unit={["day", "days"]}
        />
        <Stat count={longestGap} title="longest break" unit={["day", "days"]} />
      </div>
      {periodLabel && (
        <div className="text-left space-y-1 text-sm text-gray-700 dark:text-gray-300">
          {previousPeriodTotal !== null && (
            <div>
              Total orgasms last {periodLabel}: {previousPeriodTotal}{" "}
              <span className="text-gray-600 dark:text-gray-400">
                ({formatDifference(n - previousPeriodTotal)})
              </span>
            </div>
          )}
          {averagePerPeriod !== null && currentVsAverage !== null && (
            <div>
              Average per {periodLabel}: {Math.round(averagePerPeriod)}{" "}
              <span className="text-gray-600 dark:text-gray-400">
                ({formatDifference(currentVsAverage)})
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LoadingSummaryStats() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:flex md:items-center gap-3 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse bg-gray-300 dark:bg-gray-700 w-full md:size-30 rounded shadow h-20 md:h-auto"
          ></div>
        ))}
      </div>
      <div className="animate-pulse space-y-1">
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-48"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-40"></div>
      </div>
    </div>
  );
}

function LoadingLastOrgasm() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-64"></div>
      <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-48"></div>
    </div>
  );
}

async function DashboardChartsWrapper({
  userId,
  tz,
}: {
  userId: string;
  tz: string;
}) {
  const orgasms = await prisma.orgasm.findMany({
    where: {
      userId: userId,
    },
  });

  const chastitySessions = await prisma.chastitySession.findMany({
    where: {
      userId: userId,
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstDayOfWeek: true },
  });

  return (
    <DashboardCharts
      orgasms={orgasms}
      tz={tz}
      userId={userId}
      chastitySessions={chastitySessions}
      firstDayOfWeek={user?.firstDayOfWeek ?? 1}
    />
  );
}

function Stat({
  count,
  title,
  unit,
}: {
  count: number;
  title: string;
  unit: [string, string];
}) {
  return (
    <div className="bg-pink-500 dark:bg-pink-600 w-full md:size-30 rounded shadow flex flex-col items-center justify-center gap-1 md:gap-2 p-3 md:p-2 text-white">
      <div className="text-xs">{title}</div>
      <div className="bold text-2xl md:text-4xl">{count}</div>
      <div className="text-xs">{count === 1 ? unit[0] : unit[1]}</div>
    </div>
  );
}
