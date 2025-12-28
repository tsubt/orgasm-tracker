"use client";

import { Orgasm } from "@prisma/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { getDelayData, getDelayLabel, ProcessedData } from "./dataProcessing";

interface WrappedDelayChartProps {
  orgasms: Orgasm[];
  processedData: ProcessedData;
}

const PINK_COLOR = "#FFC0CB";

export default function WrappedDelayChart({
  orgasms,
  processedData,
}: WrappedDelayChartProps) {
  const data = getDelayData(orgasms);

  // Define break points for labels
  const breaks = [
    Math.log(5 / 60 / 24), // 5 minutes
    Math.log(1 / 24), // 1 hour
    Math.log(3 / 24), // 3 hours
    Math.log(8 / 24), // 8 hours
    Math.log(1), // 1 day
    Math.log(3), // 3 days
    Math.log(10), // 10 days
  ];

  const labels = ["5m", "1h", "3h", "8h", "1d", "3d", "10d"];

  // Group data into bins for display
  const binnedData = breaks.map((breakPoint, index) => {
    const count = data
      .filter((d) => {
        if (index === 0) return d.logDays < breakPoint;
        if (index === breaks.length - 1)
          return d.logDays >= breaks[index - 1];
        return d.logDays >= breaks[index - 1] && d.logDays < breakPoint;
      })
      .reduce((sum, d) => sum + d.count, 0);

    return {
      label: labels[index],
      logDays: breakPoint,
      count,
    };
  });

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold text-[#e9e9e9] mb-6 text-center">
        The longest time between was {processedData.longestDelayDays} days
      </h2>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={binnedData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: "#c9c9c9" }}
            label={{ value: "Time between orgasms", position: "insideBottom", offset: -5, fill: "#c9c9c9" }}
          />
          <YAxis tick={{ fill: "#c9c9c9" }} />
          <Bar dataKey="count" fill={PINK_COLOR}>
            {binnedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={PINK_COLOR} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

