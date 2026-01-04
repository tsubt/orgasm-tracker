"use client";

import { Orgasm, ChastitySession } from "@prisma/client";
import MonthCalendar from "./MonthCalendar";

interface MonthChartWrapperProps {
  orgasms: Orgasm[];
  selectedYear: number;
  chastitySessions: ChastitySession[];
}

export default function MonthChartWrapper({
  orgasms,
  selectedYear,
  chastitySessions,
}: MonthChartWrapperProps) {
  // Note: orgasms are already filtered by year in ChartsClient
  // No need to filter again here

  return (
    <div className="w-full">
      {/* Legend/Key */}
      <div className="flex flex-wrap items-center justify-center gap-4 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-pink-300 dark:bg-pink-900"></div>
          <span className="text-xs text-gray-700 dark:text-gray-300">Orgasm</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-200 dark:bg-green-900"></div>
          <span className="text-xs text-gray-700 dark:text-gray-300">Locked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-300 dark:bg-blue-900"></div>
          <span className="text-xs text-gray-700 dark:text-gray-300">Locked orgasm</span>
        </div>
      </div>

      {/* Calendar grid: 4 columns x 3 rows on large screens */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
          <MonthCalendar
            key={month}
            month={month}
            year={selectedYear}
            orgasms={orgasms}
            chastitySessions={chastitySessions}
          />
        ))}
      </div>
    </div>
  );
}
