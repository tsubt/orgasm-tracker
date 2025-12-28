"use client";

import { Orgasm } from "@prisma/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
  Cell,
} from "recharts";
import { getDailyChartData, ProcessedData } from "./dataProcessing";
import dayjs from "dayjs";

interface WrappedDailyChartProps {
  orgasms: Orgasm[];
  processedData: ProcessedData;
}

function interpolateColor(
  ratio: number,
  color1: string,
  color2: string
): string {
  const hex = (color: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  };

  const c1 = hex(color1);
  const c2 = hex(color2);
  if (!c1 || !c2) return color1;

  const r = Math.round(c1.r + (c2.r - c1.r) * ratio);
  const g = Math.round(c1.g + (c2.g - c1.g) * ratio);
  const b = Math.round(c1.b + (c2.b - c1.b) * ratio);

  return `rgb(${r}, ${g}, ${b})`;
}

export default function WrappedDailyChart({
  orgasms,
  processedData,
}: WrappedDailyChartProps) {
  const data = getDailyChartData(orgasms);
  const maxCount = processedData.maxPerDay;

  const getBarColor = (count: number) => {
    if (count === 0) return "transparent";
    const intensity = Math.min(count / maxCount, 1);
    return interpolateColor(intensity, "#510258", "#EA69F6");
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#2c2c2c] border border-[#3c3c3c] rounded p-2">
          <p className="text-[#e9e9e9]">{dayjs(data.date).format("MMM D, YYYY")}</p>
          <p className="text-[#c9c9c9]">Total: {data.total}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold text-[#e9e9e9] mb-6 text-center">
        The most was {processedData.maxPerDay} in a day
      </h2>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <XAxis
            dataKey="date"
            tick={{ fill: "#c9c9c9", fontSize: 10 }}
            angle={-45}
            textAnchor="end"
            height={80}
            tickFormatter={(value) => dayjs(value).format("MMM D")}
          />
          <YAxis
            label={{ value: "Number in a day", angle: -90, position: "insideLeft", fill: "#c9c9c9" }}
            tick={{ fill: "#c9c9c9" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="total">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.total)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
