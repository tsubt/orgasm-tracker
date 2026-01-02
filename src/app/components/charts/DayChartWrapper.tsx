"use client";

import { Orgasm } from "@prisma/client";
import RadialTimePlot from "./RadialTimePlot";

interface DayChartWrapperProps {
  orgasms: Orgasm[];
  selectedYear: number;
}

export default function DayChartWrapper({ orgasms }: DayChartWrapperProps) {
  // Note: orgasms are already filtered by year in ChartsClient
  return (
    <div className="w-full">
      {/* Radial time plot */}
      <RadialTimePlot orgasms={orgasms} />
    </div>
  );
}
