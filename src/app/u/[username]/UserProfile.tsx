import { prisma } from "@/prisma";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import type { Orgasm } from "@prisma/client";
import Charts from "@/app/components/charts";
import PickPeriod from "@/app/components/charts/PickPeriod";
import { Suspense } from "react";
import { notFound } from "next/navigation";

dayjs.extend(isoWeek);
dayjs.extend(utc);
dayjs.extend(timezone);

type DateOrgasmType = {
  date: string;
  orgasms: Orgasm[];
};

function groupBy<T>(
  array: T[],
  predicate: (value: T, index: number, array: T[]) => string
) {
  return array.reduce((acc, value, index, array) => {
    (acc[predicate(value, index, array)] ||= []).push(value);
    return acc;
  }, {} as { [key: string]: T[] });
}

export default async function UserProfile({
  username,
  period,
}: {
  username: string;
  period: string;
}) {
  // Check if user exists and has public profile
  const user = await prisma.user.findUnique({
    where: {
      username: username,
    },
  });

  if (!user || !user.publicProfile) {
    notFound();
  }

  // Fetch orgasms if publicOrgasms is enabled
  const orgasms = user.publicOrgasms
    ? await prisma.orgasm.findMany({
        where: {
          userId: user.id,
        },
        orderBy: { timestamp: "desc" },
      })
    : [];

  // Filter orgasms with timestamps (date/time fields are deprecated)
  const validOrgasms = orgasms.filter((o) => o.timestamp !== null);

  if (validOrgasms.length === 0) {
    return <>No orgasms to show.</>;
  }

  // Group orgasms by date (YYYY-MM-DD format from timestamp)
  const dates = groupBy(validOrgasms, (orgasm) =>
    dayjs(orgasm.timestamp).format("YYYY-MM-DD")
  );
  const dateOrgasms: DateOrgasmType[] = [];
  for (const [date, orgasmsForDate] of Object.entries(dates)) {
    dateOrgasms.push({
      date,
      orgasms: orgasmsForDate,
    });
  }

  // Calculate stats
  const today = dayjs();
  const n = validOrgasms.length;

  // Find last orgasm date
  const last = dateOrgasms
    .map((d) => dayjs(d.date))
    .reduce((a, b) => (a.isAfter(b) ? a : b));
  const daysSinceLast = today.diff(last, "day");

  // Calculate time between orgasms
  const times = dateOrgasms
    .map((o) => dayjs(o.date))
    .sort((a, b) => a.diff(b))
    .map((d, i, arr) => {
      if (i === 0) return null;
      return d.diff(arr[i - 1], "day");
    })
    .filter((d) => d !== null)
    .map((d) => (d ? d : 0));

  // Calculate longest streak
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
  const longestStreak = streaks.reduce((a, b) => (a > b ? a : b), 0);

  // Calculate longest gap
  const longestGap = times.length ? Math.max(...times) - 1 : 0;

  return (
    <div className="flex w-full flex-col items-center justify-center gap-4">
      {/* Basic stats */}
      <div className="flex flex-col items-center justify-center gap-8 md:flex-row md:gap-12">
        <div className="mb-4 flex items-center justify-center gap-8">
          <div className="flex flex-col">
            <div>total of</div>
            <div className="text-bold text-4xl">{n}</div>
            <div>orgasm{n !== 1 && "s"}</div>
          </div>
          <div className="flex flex-col">
            <div>currently</div>
            <div className="text-bold text-4xl">{daysSinceLast}</div>
            <div>day{daysSinceLast !== 1 && "s"} without</div>
          </div>
        </div>
        <div className="mb-4 flex items-center justify-center gap-8">
          <div className="flex flex-col">
            <div>longest streak</div>
            <div>
              <div className="text-bold text-4xl">{longestStreak}</div> day
              {longestStreak !== 1 && "s"}
            </div>
          </div>
          <div className="flex flex-col">
            <div>longest break</div>
            <div>
              <div className="text-bold text-4xl">{longestGap}</div> day
              {longestGap !== 1 && "s"}
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-black/5 rounded flex flex-col gap-4 p-4 w-full">
        <Suspense fallback={null}>
          <PickPeriod />
        </Suspense>
        <Suspense fallback={<>Loading charts ...</>}>
          <Charts userId={user.id} period={period} />
        </Suspense>
      </div>
    </div>
  );
}
