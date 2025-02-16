import { Orgasm } from "@prisma/client";
import dayjs from "dayjs";
import ChartLine from "./LineChart";

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

  const years = orgasms
    .map((o) => ({ ...o, year: new Date(o.date).getFullYear() }))
    .groupBy("year");

  // cumulative orgasms per year
  const cumYear = Object.keys(years).map((year) => {
    const yr = years[parseInt(year)].sort(
      // TODO: convert to TIMESTAMP once released
      (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix()
    );
    const yrGrp = yr.groupBy("date");

    const yrStart = dayjs(yr[0].date).startOf("year");
    const yrEnd = dayjs(yr[0].date).endOf("year");
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

    return { name: year, data: cumOrgasms };
  });

  return (
    <div>
      <ChartLine data={cumYear} />
    </div>
  );
}

function groupBy<T extends Record<string, any>>(arr: T[], key: string) {
  return arr.reduce((acc, curr) => {
    (acc[curr[key]] = acc[curr[key]] || []).push(curr);
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
