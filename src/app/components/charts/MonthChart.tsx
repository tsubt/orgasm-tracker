"use client";

import { Orgasm, ChastitySession } from "@prisma/client";
import MonthChartWrapper from "./MonthChartWrapper";

export default function MonthChart({
  orgasms,
  selectedYear,
  chastitySessions,
  firstDayOfWeek,
}: {
  orgasms: Orgasm[];
  selectedYear: number;
  chastitySessions: ChastitySession[];
  firstDayOfWeek: number;
}) {
  return (
    <MonthChartWrapper
      orgasms={orgasms}
      selectedYear={selectedYear}
      chastitySessions={chastitySessions}
      firstDayOfWeek={firstDayOfWeek}
    />
  );
}
