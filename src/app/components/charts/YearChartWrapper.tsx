"use client";

import { Orgasm } from "@prisma/client";
import ChartLine from "./LineChart";
import HeatMap from "./HeatMap";

interface YearChartWrapperProps {
  orgasms: Orgasm[];
  lineChartData: {
    name: string;
    highlight?: boolean;
    data: ({ x: number; y: number } & Record<string, unknown>)[];
  }[];
  selectedYear: number;
}

export default function YearChartWrapper({
  orgasms,
  lineChartData,
  selectedYear,
}: YearChartWrapperProps) {
  // Convert selectedYear number to string for ChartLine
  const selectedYearString = selectedYear.toString();

  return (
    <div>
      <ChartLine data={lineChartData} selectedYear={selectedYearString} />
      <HeatMap orgasms={orgasms} timeframe={selectedYear} />
    </div>
  );
}
