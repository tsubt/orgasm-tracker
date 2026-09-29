"use client";

import { useMemo } from "react";
import { Orgasm } from "@prisma/client";
import dayjs from "dayjs";
import ChartLine from "./LineChart";
import { at, clock, onDate } from "@/lib/zonedTime";

export default function LineChartOnly({
  orgasms,
  selectedYear,
  timeZone,
  now,
}: {
  orgasms: Orgasm[];
  selectedYear: number;
  timeZone?: string;
  now?: string;
}) {
  // Memoize data processing to prevent recalculation on every render
  const lineChartData = useMemo(() => {
    // Filter orgasms that have timestamps (date/time fields are deprecated)
    const validOrgasms = orgasms.filter((o) => o.timestamp !== null);

    const years = validOrgasms
      .map((o) => ({ ...o, year: at(o.timestamp, timeZone).year() }))
      .groupBy("year");

    const currentYear = clock(now, timeZone).year();

    // cumulative orgasms per year
    const cumYear = Object.keys(years).map((year) => {
      const yr = years[parseInt(year)].sort(
        (a, b) => dayjs(a.timestamp).unix() - dayjs(b.timestamp).unix()
      );

      // Group by date string (YYYY-MM-DD)
      const yrGrp = yr.reduce((acc, o) => {
        const dateStr = at(o.timestamp, timeZone).format("YYYY-MM-DD");
        if (!acc[dateStr]) acc[dateStr] = [];
        acc[dateStr].push(o);
        return acc;
      }, {} as { [date: string]: typeof yr });

      const yrStart = onDate(`${year}-01-01`, timeZone).startOf("day");
      const yrEnd = onDate(`${year}-12-31`, timeZone).endOf("day");
      const yrLength = yrEnd.diff(yrStart, "day");

      // for each date, calculate year progress and number of orgasms
      const yrDays = Object.keys(yrGrp).map((date) => {
        const orgasms = yrGrp[date];
        const progress = onDate(date, timeZone).diff(yrStart, "day") / yrLength;
        return {
          date: date,
          progress: progress,
          orgasms: orgasms.length,
        };
      });

      // calculate cumulative orgasms
      const cumOrgasms = yrDays.reduce((acc, curr) => {
        acc.push({
          date: curr.date,
          x: Math.round(curr.progress * 10000) / 100,
          orgasms: curr.orgasms,
          y: curr.orgasms + (acc[acc.length - 1]?.y ?? 0),
        });
        return acc;
      }, [] as { date: string; x: number; orgasms: number; y: number }[]);

      return {
        name: year,
        data: cumOrgasms,
        highlight: year === currentYear.toString(),
      };
    });

    // Sort years in descending order (newest first)
    cumYear.sort((a, b) => parseInt(b.name) - parseInt(a.name));

    return cumYear;
  }, [orgasms, timeZone, now]);

  // Convert selectedYear number to string for ChartLine
  const selectedYearString = selectedYear.toString();

  return <ChartLine data={lineChartData} selectedYear={selectedYearString} />;
}

function groupBy<T, K extends keyof T>(arr: T[], key: K) {
  return arr.reduce((acc, curr) => {
    const keyValue = String(curr[key]);
    (acc[keyValue] = acc[keyValue] || []).push(curr);
    return acc;
  }, {} as { [key: string]: T[] });
}

// add groupBy method to Array prototype
declare global {
  interface Array<T> {
    groupBy(key: string): { [key: string]: T[] };
  }
}

Array.prototype.groupBy = function (key: string) {
  return groupBy(this, key);
};
