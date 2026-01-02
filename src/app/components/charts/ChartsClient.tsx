"use client";

import { useMemo, memo } from "react";
import { Orgasm } from "@prisma/client";
import YearChart from "./Year";
import MonthChart from "./MonthChart";
import WeekChart from "./WeekChart";
import DayChart from "./DayChart";

interface ChartsClientProps {
  orgasms: Orgasm[];
  period: string;
  selectedYear: number;
}

// Memoize chart components to prevent re-renders when props haven't changed
const MemoizedYearChart = memo(YearChart);
const MemoizedMonthChart = memo(MonthChart);
const MemoizedWeekChart = memo(WeekChart);
const MemoizedDayChart = memo(DayChart);

export default function ChartsClient({
  orgasms,
  period,
  selectedYear,
}: ChartsClientProps) {
  // Filter orgasms by year for charts that need it (Month, Week, Day)
  // Year chart uses all orgasms, so we don't filter for it
  const yearOrgasms = useMemo(() => {
    if (period === "Year") return orgasms; // Year chart needs all orgasms
    return orgasms.filter((o) => {
      if (!o.timestamp) return false;
      const year = new Date(o.timestamp).getFullYear();
      return year === selectedYear;
    });
  }, [orgasms, selectedYear, period]);

  switch (period) {
    case "Year":
      return (
        <MemoizedYearChart orgasms={orgasms} selectedYear={selectedYear} />
      );
    case "Month":
      return (
        <MemoizedMonthChart orgasms={yearOrgasms} selectedYear={selectedYear} />
      );
    case "Week":
      return (
        <MemoizedWeekChart orgasms={yearOrgasms} selectedYear={selectedYear} />
      );
    case "Day":
      return (
        <MemoizedDayChart orgasms={yearOrgasms} selectedYear={selectedYear} />
      );
  }

  return <div>Invalid period selected</div>;
}
