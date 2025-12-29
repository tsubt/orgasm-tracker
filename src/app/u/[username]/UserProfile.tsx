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

  if (orgasms.length === 0) {
    return <>No orgasms to show.</>;
  }

  // Group orgasms by date
  const dates = groupBy(orgasms, (orgasm) => orgasm.date);
  const dateOrgasms: DateOrgasmType[] = [];
  for (const [date, orgasmsForDate] of Object.entries(dates)) {
    dateOrgasms.push({
      date,
      orgasms: orgasmsForDate,
    });
  }

  // Calculate stats
  const today = dayjs();
  const n = orgasms.length;

  // Find last orgasm date
  const last = dateOrgasms.map((d) => d.date).reduce((a, b) => (a > b ? a : b));
  const daysSinceLast = today.diff(last, "day");

  // Calculate time between orgasms
  const times = dateOrgasms
    .map((o) => o.date)
    .sort((a, b) => dayjs(a).diff(dayjs(b)))
    .map((d, i, arr) => {
      if (i === 0) return null;
      return dayjs(d).diff(dayjs(arr[i - 1]), "day");
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

      {/* Debug table */}
      <div className="w-full">
        <table style={{ borderCollapse: "collapse", width: "100%", border: "1px solid #ccc", color: "black" }}>
          <thead>
            <tr style={{ backgroundColor: "#f0f0f0" }}>
              <th style={{ border: "1px solid #ccc", padding: "8px", textAlign: "left", color: "black" }}>Raw Timestamp</th>
              <th style={{ border: "1px solid #ccc", padding: "8px", textAlign: "left", color: "black" }}>Local Date + Time</th>
            </tr>
          </thead>
          <tbody>
            {orgasms.map((orgasm) => {
              const rawTimestamp = orgasm.timestamp
                ? orgasm.timestamp.toISOString()
                : "N/A";

              let localFormatted = "N/A";
              if (orgasm.timestamp) {
                localFormatted = dayjs(orgasm.timestamp).format("YYYY-MM-DD HH:mm:ss");
              } else if (orgasm.date && orgasm.time) {
                localFormatted = `${orgasm.date} ${orgasm.time}`;
              }

              return (
                <tr key={orgasm.id}>
                  <td style={{ border: "1px solid #ccc", padding: "8px", color: "black" }}>{rawTimestamp}</td>
                  <td style={{ border: "1px solid #ccc", padding: "8px", color: "black" }}>{localFormatted}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
