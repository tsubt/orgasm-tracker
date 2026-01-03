import { prisma } from "@/prisma";

import { Session } from "next-auth";
import { Suspense } from "react";
import PickTime from "./PickTime";

import Charts from "./charts";

import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(timezone);
dayjs.extend(utc);
dayjs.extend(relativeTime);

export default async function Stats({
  session,
  time,
  tz,
}: {
  session: Session;
  time: string;
  tz: string;
}) {
  if (!session.user || !session.user.id) {
    return <></>;
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="flex flex-col gap-4 w-full">
        <p className="text-center text-2xl text-white">
          <span>Welcome, {session.user.name}</span>
        </p>

        <Suspense fallback={null}>
          <LastOrgasm userId={session.user.id} tz={tz} />
        </Suspense>
      </div>

      <div className="bg-black/5 rounded flex flex-col gap-4 p-4 w-full">
        <Suspense fallback={null}>
          <PickTime />
        </Suspense>
        <Suspense fallback={<LoadingSummaryStats />}>
          <SummaryStats userId={session.user.id} time={time} tz={tz} />
        </Suspense>
      </div>

      <div className="bg-black/5 rounded flex flex-col gap-4 p-4 w-full">
        <Suspense fallback={<>Loading charts ...</>}>
          <Charts userId={session.user.id} tz={tz} />
        </Suspense>
      </div>
    </div>
  );
}

async function LastOrgasm({ userId, tz }: { userId: string; tz: string }) {
  const last = await prisma.orgasm.findFirst({
    where: {
      userId,
    },
    orderBy: {
      timestamp: "desc",
    },
  });

  if (last === null) return;

  const lastDate = dayjs(last.timestamp).tz(tz);

  return (
    <div className="text-pink-50">
      <h4 className="text-lg font-bold">Last orgasm {lastDate.fromNow()}</h4>
      <p>{lastDate.format("D MMM YYYY, H:ma")}</p>
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
  if (n === 0) return <div>No orgasms yet</div>;

  // find last orgasm date
  const last = validOrgasms
    .map((o) => dayjs(o.timestamp))
    .reduce((a, b) => (a.isAfter(b) ? a : b));
  const daysSinceLast = d.diff(last, "day");

  // calculate time between orgasms
  const times = validOrgasms
    .map((o) => dayjs(o.timestamp))
    .sort((a, b) => a.diff(b))
    .map((d, i, arr) => {
      if (i === 0) return null;
      return d.diff(arr[i - 1], "day");
    })
    .filter((d) => d !== null)
    .map((d) => (d ? d : 0));

  // calculate longest streak of zero days between orgasms
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

  // time between orgasms -> days *without* orgasm + 1
  const longestGap = times.length ? Math.max(...times) - 1 : 0;

  // wait 5 seconds
  //   await new Promise((resolve) => setTimeout(resolve, 200000));

  return (
    <div className="flex items-center gap-4 text-black">
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
      <div className="">{title}</div>
      <div className="bold text-4xl">{count}</div>
      <div>{count === 1 ? unit[0] : unit[1]}</div>
    </div>
  );
}
