"use client";

import { Orgasm } from "@prisma/client";
import MonthCalendar from "./MonthCalendar";

interface MonthChartWrapperProps {
  orgasms: Orgasm[];
  selectedYear: number;
}

export default function MonthChartWrapper({
  orgasms,
  selectedYear,
}: MonthChartWrapperProps) {
  // Note: orgasms are already filtered by year in ChartsClient
  // No need to filter again here

  return (
    <div className="w-full">
      {/* Calendar grid: 4 columns x 3 rows on large screens */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
          <MonthCalendar
            key={month}
            month={month}
            year={selectedYear}
            orgasms={orgasms}
          />
        ))}
      </div>
    </div>
  );
}
