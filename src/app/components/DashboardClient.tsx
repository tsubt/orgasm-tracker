"use client";

import { useMemo, useState } from "react";
import { Orgasm } from "@prisma/client";
import BreakdownStatsClient from "./BreakdownStatsClient";
import PickTime from "./PickTime";
import { summarizeOrgasms } from "@/lib/orgasmSummary";
import { asPeriod, type Period } from "@/lib/periods";

export default function DashboardClient({
  orgasms,
  joinedAt,
  tz,
  initialTime,
}: {
  orgasms: Orgasm[];
  joinedAt: Date;
  tz: string;
  initialTime: string;
}) {
  const [time, setTime] = useState<Period>(asPeriod(initialTime));
  const summary = useMemo(
    () => summarizeOrgasms(orgasms, time, tz, joinedAt),
    [orgasms, time, tz, joinedAt],
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col gap-4 p-4 w-full">
      <PickTime value={time} onChange={setTime} />
      {summary ? (
        <SummaryView summary={summary} />
      ) : (
        <div className="text-gray-700 dark:text-gray-300">No orgasms yet</div>
      )}
      <BreakdownStatsClient orgasms={orgasms} time={time} tz={tz} />
    </div>
  );
}

function SummaryView({
  summary,
}: {
  summary: NonNullable<ReturnType<typeof summarizeOrgasms>>;
}) {
  const formatDifference = (diff: number) => {
    return diff > 0 ? `+${Math.round(diff)}` : Math.round(diff).toString();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:flex md:items-center gap-3 md:gap-4">
        <Stat count={summary.total} title="total of" unit={["orgasm", "orgasms"]} />
        <Stat
          count={summary.daysSinceLast}
          title="currently"
          unit={["day without", "days without"]}
        />
        <Stat
          count={summary.longestStreak}
          title="longest streak"
          unit={["day", "days"]}
        />
        <Stat
          count={summary.longestGap}
          title="longest break"
          unit={["day", "days"]}
        />
      </div>
      {summary.periodLabel && (
        <div className="text-left space-y-1 text-sm text-gray-700 dark:text-gray-300">
          {summary.previousPeriodTotal !== null && (
            <div>
              Total orgasms last {summary.periodLabel}:{" "}
              {summary.previousPeriodTotal}{" "}
              <span className="text-gray-600 dark:text-gray-400">
                ({formatDifference(summary.total - summary.previousPeriodTotal)})
              </span>
            </div>
          )}
          {summary.averagePerPeriod !== null &&
            summary.currentVsAverage !== null && (
              <div>
                Average per {summary.periodLabel}:{" "}
                {Math.round(summary.averagePerPeriod)}{" "}
                <span className="text-gray-600 dark:text-gray-400">
                  ({formatDifference(summary.currentVsAverage)})
                </span>
              </div>
            )}
        </div>
      )}
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
    <div className="bg-pink-500 dark:bg-pink-600 w-full md:size-30 rounded shadow flex flex-col items-center justify-center gap-1 md:gap-2 p-3 md:p-2 text-white">
      <div className="text-xs">{title}</div>
      <div className="bold text-2xl md:text-4xl">{count}</div>
      <div className="text-xs">{count === 1 ? unit[0] : unit[1]}</div>
    </div>
  );
}
