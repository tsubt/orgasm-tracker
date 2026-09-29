"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Orgasm, ChastitySession } from "@prisma/client";
import CalendarChartSkeleton from "./CalendarChartSkeleton";

interface ChartsClientProps {
  orgasms: Orgasm[];
  period: string;
  selectedYear: number;
  tz: string;
  chastitySessions?: ChastitySession[];
  firstDayOfWeek: number;
}

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
  return <CalendarChartSkeleton />;
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

const LineChartOnly = dynamic(() => import("./LineChartOnly"), {
  loading: () => <LoadingLineChart />,
});
const HeatMap = dynamic(() => import("./HeatMap"), {
  loading: () => <LoadingFrequencyChart />,
});
const MonthChart = dynamic(() => import("./MonthChart"), {
  loading: () => <LoadingCalendarChart />,
});
const WeekChart = dynamic(() => import("./WeekChart"), {
  loading: () => <LoadingWeekChart />,
});
const DayChart = dynamic(() => import("./DayChart"), {
  loading: () => <LoadingRadialChart />,
});
const EventDotChart = dynamic(() => import("./EventDotChart"), {
  loading: () => <LoadingTimelineChart />,
});

export default function ChartsClient({
  orgasms,
  period,
  selectedYear,
  tz,
  chastitySessions = [],
  firstDayOfWeek,
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
      return <LineChartOnly orgasms={orgasms} selectedYear={selectedYear} />;
    case "Frequency":
      return <HeatMap orgasms={orgasms} timeframe={selectedYear} />;
    case "Calendar":
      return (
        <MonthChart
          orgasms={yearOrgasms}
          selectedYear={selectedYear}
          chastitySessions={chastitySessions}
          firstDayOfWeek={firstDayOfWeek}
        />
      );
    case "Week":
      return (
        <WeekChart orgasms={yearOrgasms} selectedYear={selectedYear} />
      );
    case "Radial":
      return <DayChart orgasms={yearOrgasms} selectedYear={selectedYear} />;
    case "Timeline":
      return <EventDotChart orgasms={orgasms} tz={tz} />;
  }

  return <div>Invalid chart selected</div>;
}
