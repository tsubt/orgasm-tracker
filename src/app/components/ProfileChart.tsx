"use client";

import { useMemo, useState } from "react";
import { Orgasm, ChastitySession } from "@prisma/client";
import ChartsClient from "./charts/ChartsClient";
import dayjs from "dayjs";

const CHART_OPTIONS = ["Line", "Frequency", "Calendar", "Week", "Radial", "Timeline"];

interface ProfileChartProps {
  orgasms: Orgasm[];
  tz: string;
  defaultChart?: string | null;
  chastitySessions?: ChastitySession[];
}

export default function ProfileChart({
  orgasms,
  tz,
  defaultChart,
  chastitySessions = [],
}: ProfileChartProps) {
  // Use defaultChart or fallback to "Frequency"
  const initialChartType = defaultChart || "Frequency";
  const [chartType, setChartType] = useState<string>(initialChartType);

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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label
            htmlFor="chart-select"
            className="text-sm font-semibold text-gray-700 dark:text-gray-300"
          >
            Chart:
          </label>
          <select
            id="chart-select"
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-600"
          >
            {CHART_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
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
        period={chartType}
        selectedYear={selectedYear}
        tz={tz}
        chastitySessions={chastitySessions}
      />
    </div>
  );
}
