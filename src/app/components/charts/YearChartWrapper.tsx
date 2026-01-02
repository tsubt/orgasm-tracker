"use client";

import { useState, useEffect } from "react";
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
}

export default function YearChartWrapper({
  orgasms,
  lineChartData,
}: YearChartWrapperProps) {
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  // Initialize selectedYear with the highlighted year (current year by default)
  useEffect(() => {
    const highlighted = lineChartData.find((entry) => entry.highlight);
    if (
      highlighted &&
      (selectedYear === null || !lineChartData.find((e) => e.name === selectedYear))
    ) {
      setSelectedYear(highlighted.name);
    }
  }, [lineChartData, selectedYear]);

  // Convert selectedYear string to number for HeatMap
  const heatMapTimeframe = selectedYear ? parseInt(selectedYear) : undefined;

  return (
    <div>
      <ChartLine data={lineChartData} onYearChange={setSelectedYear} />
      <HeatMap orgasms={orgasms} timeframe={heatMapTimeframe} />
    </div>
  );
}
