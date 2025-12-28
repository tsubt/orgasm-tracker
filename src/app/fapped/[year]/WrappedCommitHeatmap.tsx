"use client";

import { Orgasm } from "@prisma/client";
import { getCommitHeatmapData } from "./dataProcessing";
import dayjs from "dayjs";

interface WrappedCommitHeatmapProps {
  orgasms: Orgasm[];
  year: number;
}

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

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

export default function WrappedCommitHeatmap({
  orgasms,
  year,
}: WrappedCommitHeatmapProps) {
  const data = getCommitHeatmapData(orgasms, year);

  // Create grid
  const grid: { [key: string]: number } = {};
  data.forEach((d) => {
    const key = `${d.week}-${d.dayOfWeek}`;
    grid[key] = (grid[key] || 0) + d.count;
  });

  const maxCount = Math.max(...Object.values(grid), 1);
  const yearStart = dayjs(`${year}-01-01`);

  // Get week ranges for months
  const monthWeeks: { month: number; week: number }[] = [];
  for (let month = 0; month < 12; month++) {
    const firstOfMonth = dayjs(`${year}-${month + 1}-01`);
    const week = firstOfMonth.diff(yearStart, "week");
    monthWeeks.push({ month, week });
  }

  const getColor = (count: number) => {
    if (count === 0) return "transparent";
    const intensity = Math.min(count / maxCount, 1);
    return interpolateColor(intensity, "#510258", "#EA69F6");
  };

  // Find max week
  const maxWeek = Math.max(...data.map((d) => d.week), 52);

  return (
    <div className="w-full">
      <div className="w-full overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Month labels */}
          <div className="flex gap-0.5 mb-2">
            <div className="w-16"></div>
            {Array.from({ length: maxWeek + 1 }).map((_, weekIdx) => {
              const monthInfo = monthWeeks.find(
                (mw) => mw.week <= weekIdx && mw.week + 4 >= weekIdx
              );
              const showLabel =
                monthInfo && weekIdx === monthInfo.week;
              return (
                <div
                  key={weekIdx}
                  className="text-xs text-[#c9c9c9] text-center flex-1 min-w-[8px]"
                >
                  {showLabel ? MONTHS[monthInfo.month] : ""}
                </div>
              );
            })}
          </div>

          {/* Grid */}
          {DAYS_OF_WEEK.map((day, dayIdx) => {
            const dayNum = dayIdx + 1; // 1 = Monday
            return (
              <div key={day} className="flex gap-0.5 mb-0.5">
                <div className="w-16 text-xs text-[#c9c9c9] flex items-center">
                  {dayIdx % 2 === 1 ? day : ""}
                </div>
                {Array.from({ length: maxWeek + 1 }).map((_, weekIdx) => {
                  const key = `${weekIdx}-${dayNum}`;
                  const count = grid[key] || 0;
                  return (
                    <div
                      key={key}
                      className="flex-1 min-w-[8px] aspect-square rounded-sm border border-black"
                      style={{
                        backgroundColor: getColor(count),
                      }}
                      title={`Week ${weekIdx}, ${day}: ${count} orgasm${count !== 1 ? "s" : ""}`}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-4 text-xs text-[#c9c9c9] justify-center">
        <span>Less</span>
        <div className="flex gap-1">
          {[0, 0.25, 0.5, 0.75, 1.0].map((intensity) => (
            <div
              key={intensity}
              className="w-4 h-4 rounded-sm border border-black"
              style={{
                backgroundColor: getColor(intensity * maxCount),
              }}
            />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
