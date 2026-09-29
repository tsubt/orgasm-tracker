"use client";

import { Orgasm } from "@prisma/client";
import DayChartWrapper from "./DayChartWrapper";

export default function DayChart({
  orgasms,
  selectedYear,
  timeZone,
}: {
  orgasms: Orgasm[];
  selectedYear: number;
  timeZone?: string;
}) {
  return (
    <DayChartWrapper
      orgasms={orgasms}
      selectedYear={selectedYear}
      timeZone={timeZone}
    />
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
