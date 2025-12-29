import { Orgasm } from "@prisma/client";
import dayjs from "dayjs";
import ChartLine from "./LineChart";
import HeatMap from "./HeatMap";

export default async function YearChart({ orgasms }: { orgasms: Orgasm[] }) {
  // split data into years
  //   const years = orgasms.reduce((acc, orgasm) => {
  //     const year = new Date(orgasm.date).getFullYear();
  //     if (!acc[year]) {
  //       acc[year] = [];
  //     }
  //     acc[year].push(orgasm);
  //     return acc;
  //   }, {} as { [key: number]: Orgasm[] });

  // Filter orgasms that have timestamps (date/time fields are deprecated)
  const validOrgasms = orgasms.filter((o) => o.timestamp !== null);

  const years = validOrgasms
    .map((o) => ({ ...o, year: dayjs(o.timestamp).year() }))
    .groupBy("year");

  const currentYear = new Date().getFullYear();

  // cumulative orgasms per year
  const cumYear = Object.keys(years).map((year) => {
    const yr = years[parseInt(year)].sort(
      (a, b) => dayjs(a.timestamp).unix() - dayjs(b.timestamp).unix()
    );

    // Group by date string (YYYY-MM-DD)
    const yrGrp = yr.reduce((acc, o) => {
      const dateStr = dayjs(o.timestamp).format("YYYY-MM-DD");
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(o);
      return acc;
    }, {} as { [date: string]: typeof yr });

    const yrStart = dayjs(yr[0].timestamp).startOf("year");
    const yrEnd = dayjs(yr[0].timestamp).endOf("year");
    const yrLength = yrEnd.diff(yrStart, "day");

    // for each date, calculate year progress and number of orgasms
    const yrDays = Object.keys(yrGrp).map((date) => {
      const orgasms = yrGrp[date];
      const progress = dayjs(date).diff(yrStart, "day") / yrLength;
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

  return (
    <div>
      <ChartLine data={cumYear} />
      <HeatMap orgasms={orgasms} />
    </div>
  );
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
