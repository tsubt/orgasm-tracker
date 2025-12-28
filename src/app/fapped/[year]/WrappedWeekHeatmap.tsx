"use client";

import { Orgasm } from "@prisma/client";
import { getWeekHeatmapData, ProcessedData } from "./dataProcessing";

interface WrappedWeekHeatmapProps {
  orgasms: Orgasm[];
  processedData: ProcessedData;
}

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WrappedWeekHeatmap({
  orgasms,
  processedData,
}: WrappedWeekHeatmapProps) {
  const data = getWeekHeatmapData(orgasms);

  // Create a grid: 7 days x 24 hours
  const grid: { [key: string]: number } = {};
  data.forEach((d) => {
    const key = `${d.dayOfWeek}-${d.hour}`;
    grid[key] = (grid[key] || 0) + d.count;
  });

  // Find max for color scaling
  const maxCount = Math.max(...Object.values(grid), 1);

  // Group by hour bins (every 3 hours as per spec)
  const hourBins = [0, 3, 6, 9, 12, 15, 18, 21, 24];
  const binLabels = ["0", "3", "6", "9", "12", "15", "18", "21", "24"];

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

  const getColor = (count: number) => {
    if (count === 0) return "transparent";
    const intensity = Math.min(count / maxCount, 1);
    return interpolateColor(intensity, "#510258", "#EA69F6");
  };

  return (
    <div className="w-full">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-[#e9e9e9] mb-2">
          Most common time of day: {processedData.mostCommonTime}
        </h2>
        <p className="text-lg text-[#c9c9c9]">
          Peak was {processedData.peakDay} {processedData.peakTime}
        </p>
      </div>
      <div className="w-full overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="flex gap-1 mb-2">
            <div className="w-16"></div>
            {hourBins.slice(0, -1).map((hour, idx) => (
              <div
                key={hour}
                className="text-xs text-[#c9c9c9] text-center flex-1"
              >
                {binLabels[idx]}
              </div>
            ))}
          </div>
          {DAYS_OF_WEEK.map((day, dayIdx) => {
            const dayNum = dayIdx + 1; // 1 = Monday
            return (
              <div key={day} className="flex gap-1 mb-1">
                <div className="w-16 text-sm text-[#c9c9c9] flex items-center">
                  {day}
                </div>
                {hourBins.slice(0, -1).map((startHour) => {
                  const endHour = Math.min(startHour + 3, 24);
                  let count = 0;
                  for (let h = startHour; h < endHour; h++) {
                    const key = `${dayNum}-${h}`;
                    count += grid[key] || 0;
                  }
                  return (
                    <div
                      key={`${day}-${startHour}`}
                      className="flex-1 h-8 rounded"
                      style={{
                        backgroundColor: getColor(count),
                      }}
                      title={`${day} ${startHour}:00-${endHour}:00: ${count} orgasm${count !== 1 ? "s" : ""}`}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-4 text-xs text-[#c9c9c9] justify-center">
        <span>Fewer</span>
        <div className="flex gap-1">
          {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((intensity) => (
            <div
              key={intensity}
              className="w-4 h-4 rounded"
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
