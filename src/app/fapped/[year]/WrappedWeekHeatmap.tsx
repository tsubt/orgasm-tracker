"use client";

import { Orgasm } from "@prisma/client";
import { getWeekHeatmapData, ProcessedData } from "./dataProcessing";
import { useState } from "react";

interface WrappedWeekHeatmapProps {
  orgasms: Orgasm[];
  processedData: ProcessedData;
}

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WrappedWeekHeatmap({
  orgasms,
  processedData,
}: WrappedWeekHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{
    day: string;
    startHour: number;
    endHour: number;
    count: number;
  } | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  const data = getWeekHeatmapData(orgasms);

  // Create a grid: 7 days x 24 hours
  // The data already contains counts, so we just set them directly
  const grid: { [key: string]: number } = {};
  data.forEach((d) => {
    const key = `${d.dayOfWeek}-${d.hour}`;
    grid[key] = d.count; // Set directly, not add, since each key is unique
  });

  // Group by hour bins (every 3 hours as per spec)
  const hourBins = [0, 3, 6, 9, 12, 15, 18, 21, 24];
  const binLabels = ["0", "3", "6", "9", "12", "15", "18", "21", "24"];

  // Calculate binned counts to find the actual max
  const binnedCounts: number[] = [];
  DAYS_OF_WEEK.forEach((_, dayIdx) => {
    const dayNum = dayIdx + 1; // 1 = Monday
    hourBins.slice(0, -1).forEach((startHour) => {
      const endHour = Math.min(startHour + 3, 24);
      let count = 0;
      for (let h = startHour; h < endHour; h++) {
        const key = `${dayNum}-${h}`;
        count += grid[key] || 0;
      }
      binnedCounts.push(count);
    });
  });

  // Find max from binned data for color scaling
  const maxCount = Math.max(...binnedCounts, 1);

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

  // Multi-stop gradient for wider, more continuous color range
  const getMultiColor = (intensity: number): string => {
    // 6 stops: dark purple -> purple -> pink -> light pink -> very light pink -> near white
    const stops = [
      { ratio: 0, color: "#510258" },      // Dark purple
      { ratio: 0.2, color: "#7A0A82" },    // Purple
      { ratio: 0.4, color: "#A314AC" },    // Medium purple
      { ratio: 0.6, color: "#CC1ED6" },   // Pink
      { ratio: 0.8, color: "#E628F0" },   // Light pink
      { ratio: 1.0, color: "#F5E6F7" },   // Near white (very light pink)
    ];

    if (intensity <= 0) return stops[0].color;
    if (intensity >= 1) return stops[stops.length - 1].color;

    // Find the two stops to interpolate between
    for (let i = 0; i < stops.length - 1; i++) {
      if (intensity >= stops[i].ratio && intensity <= stops[i + 1].ratio) {
        const localRatio =
          (intensity - stops[i].ratio) /
          (stops[i + 1].ratio - stops[i].ratio);
        return interpolateColor(localRatio, stops[i].color, stops[i + 1].color);
      }
    }

    return stops[stops.length - 1].color;
  };

  const getColor = (count: number) => {
    if (count === 0) return "transparent";
    const intensity = Math.min(count / maxCount, 1);
    return getMultiColor(intensity);
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
                      onMouseEnter={(e) => {
                        if (count > 0) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredCell({ day, startHour, endHour, count });
                          setTooltipPosition({
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                          });
                        }
                      }}
                      onMouseLeave={() => {
                        setHoveredCell(null);
                        setTooltipPosition(null);
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tooltip */}
      {hoveredCell && tooltipPosition && (
        <div
          className="fixed z-50 bg-[#2c2c2c] border border-[#444] rounded-lg p-3 shadow-2xl pointer-events-none"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y - 10}px`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="text-[#e9e9e9]">
            <div className="font-semibold text-sm mb-1">
              {hoveredCell.day} {hoveredCell.startHour}:00 - {hoveredCell.endHour}:00
            </div>
            <div className="text-xs text-[#c9c9c9]">
              {hoveredCell.count} orgasm{hoveredCell.count !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      )}

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
