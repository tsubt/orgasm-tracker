"use client";

import { Orgasm, ChastitySession } from "@prisma/client";
import MonthChartWrapper from "./MonthChartWrapper";

export default function MonthChart({
  orgasms,
  selectedYear,
  chastitySessions,
}: {
  orgasms: Orgasm[];
  selectedYear: number;
  chastitySessions: ChastitySession[];
}) {
  return (
    <MonthChartWrapper
      orgasms={orgasms}
      selectedYear={selectedYear}
      chastitySessions={chastitySessions}
    />
  );
}
