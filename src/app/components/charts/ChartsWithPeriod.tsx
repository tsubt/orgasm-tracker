"use client";

import { useState, useMemo } from "react";
import { Orgasm } from "@prisma/client";
import dayjs from "dayjs";
import PickPeriod from "./PickPeriod";
import ChartsClient from "./ChartsClient";

interface ChartsWithPeriodProps {
  orgasms: Orgasm[];
}

export default function ChartsWithPeriod({ orgasms }: ChartsWithPeriodProps) {
  const [period, setPeriod] = useState<string>("Year");

  // Calculate available years from orgasms
  const availableYears = useMemo(() => {
    const validOrgasms = orgasms.filter((o) => o.timestamp !== null);
    const years = new Set<number>();
    validOrgasms.forEach((o) => {
      if (o.timestamp) {
        years.add(dayjs(o.timestamp).year());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [orgasms]);

  const currentYear = new Date().getFullYear();
  const initialYear =
    availableYears.length > 0 && availableYears.includes(currentYear)
      ? currentYear
      : availableYears.length > 0
      ? availableYears[0]
      : currentYear;

  const [selectedYear, setSelectedYear] = useState<number>(initialYear);

  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        <PickPeriod period={period} onPeriodChange={setPeriod} />
        {availableYears.length > 0 && (
          <div className="flex items-center gap-2">
            <label
              htmlFor="year-select"
              className="text-sm font-semibold text-gray-700 dark:text-gray-300"
            >
              Year:
            </label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-600"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <ChartsClient
        orgasms={orgasms}
        period={period}
        selectedYear={selectedYear}
      />
    </>
  );
}
