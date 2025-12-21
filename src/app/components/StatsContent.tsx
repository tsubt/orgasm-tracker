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
      <p className="text-gray-600 dark:text-gray-400">{dayjs(last.timestamp).format("D MMM YYYY, H:ma")}</p>
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

  const n = orgasms.length;
  if (n === 0) return <div className="text-gray-700 dark:text-gray-300">No orgasms yet</div>;

  const last = orgasms.map((d) => d.date).reduce((a, b) => (a > b ? a : b));
  const daysSinceLast = d.diff(last, "day");

  const times = orgasms
    .map((o) => o.date)
    .sort((a, b) => dayjs(a).diff(dayjs(b)))
    .map((d, i, arr) => {
      if (i === 0) return null;
      return dayjs(d).diff(dayjs(arr[i - 1]), "day");
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
