"use client";

import { Orgasm } from "@prisma/client";
import MonthChartWrapper from "./MonthChartWrapper";

export default function MonthChart({
  orgasms,
  selectedYear,
}: {
  orgasms: Orgasm[];
  selectedYear: number;
}) {
  return <MonthChartWrapper orgasms={orgasms} selectedYear={selectedYear} />;
}
