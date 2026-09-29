"use client";

import { Orgasm } from "@prisma/client";
import WeekBlocks from "./WeekBlocks";

interface WeekChartWrapperProps {
  orgasms: Orgasm[];
  selectedYear: number;
  timeZone?: string;
}

export default function WeekChartWrapper({
  orgasms,
  selectedYear,
  timeZone,
}: WeekChartWrapperProps) {
  // Note: orgasms are already filtered by year in ChartsClient
  return (
    <div className="w-full">
      {/* Week blocks */}
      <WeekBlocks orgasms={orgasms} year={selectedYear} timeZone={timeZone} />
    </div>
  );
}
