"use client";

import { Orgasm } from "@prisma/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import { getMainChartData } from "./dataProcessing";

interface WrappedMainChartProps {
  orgasms: Orgasm[];
  year: number;
}

// Pink-based colors similar to main dashboard heatmap (pink-300 to pink-600)
const SEX_COLORS = {
  SOLO: "#f9a8d4", // pink-300
  VIRTUAL: "#f472b6", // pink-400
  PHYSICAL: "#ec4899", // pink-500
};

export default function WrappedMainChart({
  orgasms,
  year,
}: WrappedMainChartProps) {
  const data = getMainChartData(orgasms);
  const totalCount = orgasms.length;

  const typeLabels: { [key: string]: string } = {
    FULL: "Full",
    RUINED: "Ruined",
    HANDSFREE: "Handsfree",
    ANAL: "Anal",
  };

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold text-[#e9e9e9] mb-6 text-center">
        I had {totalCount} orgasm{totalCount !== 1 ? "s" : ""} in {year}
      </h2>
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
            wrapperStyle={{ color: "#e9e9e9" }}
            iconType="square"
            formatter={(value) => value.charAt(0) + value.slice(1).toLowerCase()}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
