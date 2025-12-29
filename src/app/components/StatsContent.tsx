import { prisma } from "@/prisma";
import { Suspense } from "react";
import PickTime from "./PickTime";
import Charts from "./charts";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import relativeTime from "dayjs/plugin/relativeTime";
import PickPeriod from "./charts/PickPeriod";

dayjs.extend(timezone);
dayjs.extend(utc);
dayjs.extend(relativeTime);

export default async function StatsContent({
  userId,
  time,
  tz,
  period,
}: {
  userId: string;
  time: string;
  tz: string;
  period: string;
}) {
  return (
    <div className="flex flex-col gap-6 w-full">
      <Suspense fallback={null}>
        <LastOrgasm userId={userId} tz={tz} />
      </Suspense>

      <div className="bg-gray-100 dark:bg-gray-800 rounded flex flex-col gap-4 p-4 w-full">
        <Suspense fallback={null}>
          <PickTime />
        </Suspense>
        <Suspense fallback={<LoadingSummaryStats />}>
          <SummaryStats userId={userId} time={time} tz={tz} />
        </Suspense>
      </div>

      <div className="bg-gray-100 dark:bg-gray-800 rounded flex flex-col gap-4 p-4 w-full">
        <Suspense fallback={<>Loading breakdown...</>}>
          <BreakdownStats userId={userId} time={time} tz={tz} />
        </Suspense>
      </div>

      <div className="bg-gray-100 dark:bg-gray-800 rounded flex flex-col gap-4 p-4 w-full">
        <Suspense fallback={null}>
          <PickPeriod />
        </Suspense>
        <Suspense fallback={<>Loading charts ...</>}>
          <Charts userId={userId} period={period} />
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

  return (
    <div className="text-gray-900 dark:text-gray-100">
      <h4 className="text-lg font-bold">
        Last orgasm {dayjs(last.timestamp).fromNow()}
      </h4>
      <p className="text-gray-600 dark:text-gray-400">
        {dayjs(last.timestamp).format("D MMM YYYY, H:ma")}
      </p>
    </div>
  );
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

  const orgasms = await prisma.orgasm.findMany({
    where: {
      userId,
      timestamp:
        time === "This year"
          ? {
              gte: d.startOf("year").toDate(),
            }
          : time === "This month"
          ? {
              gte: d.startOf("month").toDate(),
            }
          : time === "This week"
          ? {
              gte: d.startOf("week").toDate(),
            }
          : time === "Last 12 months"
          ? {
              gte: d.subtract(12, "month").toDate(),
            }
          : time === "Last 30 days"
          ? {
              gte: d.subtract(30, "day").toDate(),
            }
          : time === "Last 7 days"
          ? {
              gte: d.subtract(7, "day").toDate(),
            }
          : {},
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

  const longestGap = times.length ? Math.max(...times) - 1 : 0;

  return (
    <div className="flex items-center gap-4">
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
  );
}

function LoadingSummaryStats() {
  return (
    <div className="flex items-center gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse bg-gray-200 size-30 rounded shadow"
        ></div>
      ))}
    </div>
  );
}

async function BreakdownStats({
  userId,
  time,
  tz,
}: {
  userId: string;
  time: string;
  tz: string;
}) {
  const d = dayjs().tz(tz);

  const orgasms = await prisma.orgasm.findMany({
    where: {
      userId,
      timestamp:
        time === "This year"
          ? {
              gte: d.startOf("year").toDate(),
            }
          : time === "This month"
          ? {
              gte: d.startOf("month").toDate(),
            }
          : time === "This week"
          ? {
              gte: d.startOf("week").toDate(),
            }
          : time === "Last 12 months"
          ? {
              gte: d.subtract(12, "month").toDate(),
            }
          : time === "Last 30 days"
          ? {
              gte: d.subtract(30, "day").toDate(),
            }
          : time === "Last 7 days"
          ? {
              gte: d.subtract(7, "day").toDate(),
            }
          : {},
    },
  });

  const total = orgasms.length;
  if (total === 0) {
    return (
      <div className="text-gray-700 dark:text-gray-300">
        No orgasms in this period
      </div>
    );
  }

  // Count by type
  const typeCounts = {
    FULL: orgasms.filter((o) => o.type === "FULL").length,
    RUINED: orgasms.filter((o) => o.type === "RUINED").length,
    HANDSFREE: orgasms.filter((o) => o.type === "HANDSFREE").length,
    ANAL: orgasms.filter((o) => o.type === "ANAL").length,
  };

  // Count by partner
  const partnerCounts = {
    SOLO: orgasms.filter((o) => o.sex === "SOLO").length,
    VIRTUAL: orgasms.filter((o) => o.sex === "VIRTUAL").length,
    PHYSICAL: orgasms.filter((o) => o.sex === "PHYSICAL").length,
  };

  const typeColors = {
    FULL: "bg-pink-500",
    RUINED: "bg-pink-400",
    HANDSFREE: "bg-pink-300",
    ANAL: "bg-pink-600",
  };

  const partnerColors = {
    SOLO: "bg-blue-500",
    VIRTUAL: "bg-purple-500",
    PHYSICAL: "bg-green-500",
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Type Breakdown */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          By Type
        </h3>
        <div className="w-full h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
          {Object.entries(typeCounts).map(([type, count]) => {
            const percentage = (count / total) * 100;
            if (count === 0) return null;
            return (
              <div
                key={type}
                className={`${
                  typeColors[type as keyof typeof typeColors]
                } transition-all`}
                style={{ width: `${percentage}%` }}
                title={`${type}: ${count} (${percentage.toFixed(1)}%)`}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-600 dark:text-gray-400">
          {Object.entries(typeCounts).map(([type, count]) => {
            if (count === 0) return null;
            const percentage = (count / total) * 100;
            return (
              <div key={type} className="flex items-center gap-1">
                <div
                  className={`w-3 h-3 rounded ${
                    typeColors[type as keyof typeof typeColors]
                  }`}
                />
                <span>
                  {type}: {count} ({percentage.toFixed(1)}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Partner Breakdown */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          By Partner
        </h3>
        <div className="w-full h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
          {Object.entries(partnerCounts).map(([partner, count]) => {
            const percentage = (count / total) * 100;
            if (count === 0) return null;
            return (
              <div
                key={partner}
                className={`${
                  partnerColors[partner as keyof typeof partnerColors]
                } transition-all`}
                style={{ width: `${percentage}%` }}
                title={`${partner}: ${count} (${percentage.toFixed(1)}%)`}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-600 dark:text-gray-400">
          {Object.entries(partnerCounts).map(([partner, count]) => {
            if (count === 0) return null;
            const percentage = (count / total) * 100;
            return (
              <div key={partner} className="flex items-center gap-1">
                <div
                  className={`w-3 h-3 rounded ${
                    partnerColors[partner as keyof typeof partnerColors]
                  }`}
                />
                <span>
                  {partner}: {count} ({percentage.toFixed(1)}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
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
    <div className="bg-pink-500 dark:bg-pink-600 size-30 rounded shadow flex flex-col items-center justify-center gap-2 p-2 text-white">
      <div className="text-xs">{title}</div>
      <div className="bold text-4xl">{count}</div>
      <div className="text-xs">{count === 1 ? unit[0] : unit[1]}</div>
    </div>
  );
}
