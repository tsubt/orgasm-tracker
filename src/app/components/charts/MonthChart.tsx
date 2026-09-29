"use client";

import { Orgasm, ChastitySession } from "@prisma/client";
import MonthChartWrapper from "./MonthChartWrapper";

export default function MonthChart({
  orgasms,
  selectedYear,
  chastitySessions,
  firstDayOfWeek,
  timeZone,
  now,
}: {
  orgasms: Orgasm[];
  selectedYear: number;
  chastitySessions: ChastitySession[];
  firstDayOfWeek: number;
  timeZone?: string;
  now?: string;
}) {
  return (
    <MonthChartWrapper
      orgasms={orgasms}
      selectedYear={selectedYear}
      chastitySessions={chastitySessions}
      firstDayOfWeek={firstDayOfWeek}
      timeZone={timeZone}
      now={now}
    />
  );
}
