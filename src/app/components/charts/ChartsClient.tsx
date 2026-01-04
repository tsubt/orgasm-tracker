"use client";

import { useMemo, memo, Suspense } from "react";
import { Orgasm, ChastitySession } from "@prisma/client";
import LineChartOnly from "./LineChartOnly";
import MonthChart from "./MonthChart";
import WeekChart from "./WeekChart";
import DayChart from "./DayChart";
import HeatMap from "./HeatMap";
import EventDotChart from "./EventDotChart";

interface ChartsClientProps {
  orgasms: Orgasm[];
  period: string;
  selectedYear: number;
  tz: string;
  chastitySessions?: ChastitySession[];
}

// Memoize chart components to prevent re-renders when props haven't changed
const MemoizedLineChart = memo(LineChartOnly);
const MemoizedMonthChart = memo(MonthChart);
const MemoizedWeekChart = memo(WeekChart);
const MemoizedDayChart = memo(DayChart);
const MemoizedHeatMap = memo(HeatMap);
const MemoizedEventDotChart = memo(EventDotChart);

// Loading skeleton components
function LoadingLineChart() {
  return (
    <div className="w-full" style={{ height: "300px" }}>
      <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-full"></div>
    </div>
  );
}

function LoadingFrequencyChart() {
  return (
    <div className="w-full mt-6">
      <div className="animate-pulse space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    </div>
  );
}

function LoadingCalendarChart() {
  return (
    <div className="w-full">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-48"
          ></div>
        ))}
      </div>
    </div>
  );
}

function LoadingWeekChart() {
  return (
    <div className="w-full">
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-1 sm:gap-1.5 md:gap-2">
        {Array.from({ length: 52 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-24"
          ></div>
        ))}
      </div>
    </div>
  );
}

function LoadingRadialChart() {
  return (
    <div className="w-full flex justify-center">
      <div
        className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-full"
        style={{ width: "600px", height: "600px" }}
      ></div>
    </div>
  );
}

function LoadingTimelineChart() {
  return (
    <div className="w-full overflow-hidden">
      <div className="relative overflow-hidden" style={{ height: "120px" }}>
        <div
          className="absolute top-1/2 left-0 right-0 h-px bg-gray-300 dark:bg-gray-600 opacity-30"
          style={{ transform: "translateY(-50%)" }}
        />
      </div>
    </div>
  );
}

export default function ChartsClient({
  orgasms,
  period,
  selectedYear,
  tz,
  chastitySessions = [],
}: ChartsClientProps) {
  // Filter orgasms by year for charts that need it (Calendar, Week, Radial)
  // Line and Frequency charts use all orgasms
  const yearOrgasms = useMemo(() => {
    if (period === "Line" || period === "Frequency" || period === "Timeline") {
      return orgasms; // These charts need all orgasms
    }
    return orgasms.filter((o) => {
      if (!o.timestamp) return false;
      const year = new Date(o.timestamp).getFullYear();
      return year === selectedYear;
    });
  }, [orgasms, selectedYear, period]);

  switch (period) {
    case "Line":
      return (
        <Suspense fallback={<LoadingLineChart />}>
          <MemoizedLineChart orgasms={orgasms} selectedYear={selectedYear} />
        </Suspense>
      );
    case "Frequency":
      return (
        <Suspense fallback={<LoadingFrequencyChart />}>
          <MemoizedHeatMap orgasms={orgasms} timeframe={selectedYear} />
        </Suspense>
      );
    case "Calendar":
      return (
        <Suspense fallback={<LoadingCalendarChart />}>
          <MemoizedMonthChart
            orgasms={yearOrgasms}
            selectedYear={selectedYear}
            chastitySessions={chastitySessions}
          />
        </Suspense>
      );
    case "Week":
      return (
        <Suspense fallback={<LoadingWeekChart />}>
          <MemoizedWeekChart
            orgasms={yearOrgasms}
            selectedYear={selectedYear}
          />
        </Suspense>
      );
    case "Radial":
      return (
        <Suspense fallback={<LoadingRadialChart />}>
          <MemoizedDayChart orgasms={yearOrgasms} selectedYear={selectedYear} />
        </Suspense>
      );
    case "Timeline":
      return (
        <Suspense fallback={<LoadingTimelineChart />}>
          <MemoizedEventDotChart orgasms={orgasms} tz={tz} />
        </Suspense>
      );
  }

  return <div>Invalid chart selected</div>;
}
