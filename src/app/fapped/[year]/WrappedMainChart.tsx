"use client";

import { Orgasm } from "@prisma/client";
import dayjs from "dayjs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { getMainChartData } from "./dataProcessing";

interface WrappedMainChartProps {
  orgasms: Orgasm[];
  allOrgasms?: Orgasm[];
  year: number;
  joinedAt?: Date | null;
}

// Pink-based colors similar to main dashboard heatmap (pink-300 to pink-600)
const SEX_COLORS = {
  SOLO: "#f9a8d4", // pink-300
  VIRTUAL: "#f472b6", // pink-400
  PHYSICAL: "#ec4899", // pink-500
};

export default function WrappedMainChart({
  orgasms,
  allOrgasms,
  year,
  joinedAt,
}: WrappedMainChartProps) {
  const data = getMainChartData(orgasms);
  const totalCount = orgasms.length;

  // Calculate 2024 count for comparison (only if user joined before current year)
  let comparisonText = "";
  const currentYear = new Date().getFullYear();
  const userJoinedYear = joinedAt ? dayjs(joinedAt).year() : null;
  const shouldShowComparison =
    allOrgasms &&
    year === 2025 &&
    userJoinedYear !== null &&
    userJoinedYear < currentYear;

  if (shouldShowComparison) {
    const count2024 = allOrgasms.filter((o) => {
      if (!o.timestamp) return false;
      return dayjs(o.timestamp).year() === 2024;
    }).length;

    const difference = totalCount - count2024;
    if (difference > 0) {
      comparisonText = `This is ${difference} more than 2024`;
    } else if (difference < 0) {
      comparisonText = `This is ${Math.abs(difference)} less than 2024`;
    } else {
      comparisonText = `This is the same as 2024`;
    }
  }

  const typeLabels: { [key: string]: string } = {
    FULL: "Full",
    RUINED: "Ruined",
    HANDSFREE: "Handsfree",
    ANAL: "Anal",
  };

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold text-[#e9e9e9] mb-2 text-center">
        I had {totalCount} orgasm{totalCount !== 1 ? "s" : ""} in {year}
      </h2>
      {comparisonText && (
        <p className="text-lg text-[#c9c9c9] mb-6 text-center">
          {comparisonText}
        </p>
      )}
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="type"
            tickFormatter={(value) => typeLabels[value] || value}
            tick={{ fill: "#e9e9e9", fontSize: 14 }}
            width={100}
          />
          <Bar dataKey="SOLO" stackId="sex" fill={SEX_COLORS.SOLO} />
          <Bar dataKey="VIRTUAL" stackId="sex" fill={SEX_COLORS.VIRTUAL} />
          <Bar dataKey="PHYSICAL" stackId="sex" fill={SEX_COLORS.PHYSICAL} />
          <Legend
            wrapperStyle={{ color: "#ffffff" }}
            iconType="square"
            formatter={(value) => value.charAt(0) + value.slice(1).toLowerCase()}
            content={({ payload }) => (
              <div className="flex justify-center gap-4 mt-4">
                {payload?.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span style={{ color: "#ffffff" }}>
                      {entry.value?.charAt(0) + entry.value?.slice(1).toLowerCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
