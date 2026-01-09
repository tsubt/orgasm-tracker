"use client";

import { useState } from "react";
import { Orgasm, ChastitySession } from "@prisma/client";
import MonthCalendar from "./MonthCalendar";
import dayjs from "dayjs";

interface MonthChartWrapperProps {
  orgasms: Orgasm[];
  selectedYear: number;
  chastitySessions: ChastitySession[];
  firstDayOfWeek: number;
}

export default function MonthChartWrapper({
  orgasms,
  selectedYear,
  chastitySessions,
  firstDayOfWeek,
}: MonthChartWrapperProps) {
  // Note: orgasms are already filtered by year in ChartsClient
  // No need to filter again here

  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth() + 1
  );

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

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

      {/* Mobile: Show only current month with dropdown */}
      <div className="lg:hidden">
        <MonthCalendar
          month={selectedMonth}
          year={selectedYear}
          orgasms={orgasms}
          chastitySessions={chastitySessions}
          firstDayOfWeek={firstDayOfWeek}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          monthNames={monthNames}
        />
      </div>

      {/* Desktop: Show all 12 months */}
      <div className="hidden lg:grid grid-cols-4 gap-6">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
          <MonthCalendar
            key={month}
            month={month}
            year={selectedYear}
            orgasms={orgasms}
            chastitySessions={chastitySessions}
            firstDayOfWeek={firstDayOfWeek}
          />
        ))}
      </div>
    </div>
  );
}
