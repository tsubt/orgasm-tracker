"use client";

import { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { Orgasm } from "@prisma/client";

dayjs.extend(isoWeek);

interface HeatMapProps {
  orgasms: Orgasm[];
}

export default function HeatMap({ orgasms }: HeatMapProps) {
  const currentYear = new Date().getFullYear();
  const yearStart = dayjs(`${currentYear}-01-01`);
  const yearEnd = dayjs(`${currentYear}-12-31`);
  const today = dayjs();

  // Group orgasms by date for the current year
  // Use timestamp when available, fall back to date field
  const orgasmsByDate: { [date: string]: number } = {};
  orgasms.forEach((o) => {
    let dateStr: string;
    if (o.timestamp) {
      dateStr = dayjs(o.timestamp).format("YYYY-MM-DD");
    } else if (o.date && o.date.trim() !== "") {
      dateStr = o.date;
    } else {
      // Skip orgasms without valid date information
      return;
    }

    const orgasmYear = dayjs(dateStr).year();
    if (orgasmYear === currentYear) {
      orgasmsByDate[dateStr] = (orgasmsByDate[dateStr] || 0) + 1;
    }
  });

  // Find max frequency for color intensity
  const maxFreq = Math.max(
    ...Object.values(orgasmsByDate),
    1 // At least 1 to avoid division by zero
  );

  // Build the grid: we need to show all weeks that contain days from the current year
  // Start from the Monday of the first ISO week that contains Jan 1
  const firstMonday = yearStart.startOf("isoWeek");
  const lastSunday = yearEnd.endOf("isoWeek");

  // Create a 2D grid: [dayOfWeek][weekIndex]
  const grid: Array<Array<{ date: dayjs.Dayjs; count: number } | null>> = [];

  // Initialize grid with 7 rows (days of week) and empty columns
  for (let i = 0; i < 7; i++) {
    grid[i] = [];
  }

  // Fill the grid
  let currentDate = firstMonday;
  let weekIndex = 0;

  while (currentDate.isBefore(lastSunday) || currentDate.isSame(lastSunday)) {
    const dayOfWeek = currentDate.isoWeekday() - 1; // 0 = Monday, 6 = Sunday

    // Increment week index at the start of each week (Monday)
    // This ensures all days of the week use the same weekIndex
    if (dayOfWeek === 0 && currentDate.isAfter(firstMonday)) {
      weekIndex++;
    }

    const dateStr = currentDate.format("YYYY-MM-DD");
    const count = orgasmsByDate[dateStr] || 0;
    const isInCurrentYear = currentDate.year() === currentYear;

    grid[dayOfWeek][weekIndex] = isInCurrentYear
      ? { date: currentDate, count }
      : null;

    // Move to next day
    currentDate = currentDate.add(1, "day");
  }

  // Calculate number of weeks from the grid (find max columns across all rows)
  const numWeeks = Math.max(...grid.map((row) => row.length), weekIndex + 1);

  // Get color based on count
  const getColor = (count: number) => {
    if (count === 0) return "bg-gray-200 dark:bg-gray-800";
    const intensity = count / maxFreq;
    if (intensity < 0.25) return "bg-pink-300 dark:bg-pink-900";
    if (intensity < 0.5) return "bg-pink-400 dark:bg-pink-800";
    if (intensity < 0.75) return "bg-pink-500 dark:bg-pink-700";
    return "bg-pink-600 dark:bg-pink-600";
  };

  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const containerRef = useRef<HTMLDivElement>(null);
  const [squareSize, setSquareSize] = useState(10);
  const labelWidth = 40;
  const gapSize = 2;

  // Calculate square size based on available width
  useEffect(() => {
    const updateSquareSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const availableWidth = containerWidth - labelWidth - gapSize;
        // Calculate square size: availableWidth / numWeeks - gapSize
        // But ensure minimum size of 8px and maximum of 14px for readability
        const calculatedSize = Math.max(
          8,
          Math.min(
            14,
            Math.floor((availableWidth - gapSize * numWeeks) / numWeeks)
          )
        );
        setSquareSize(calculatedSize);
      }
    };

    updateSquareSize();
    window.addEventListener("resize", updateSquareSize);
    return () => window.removeEventListener("resize", updateSquareSize);
  }, [numWeeks]);

  return (
    <div className="mt-6 w-full" ref={containerRef}>
      <div className="flex flex-col gap-2">
        {/* Month labels */}
        <div className="flex gap-0.5 items-start">
          <div
            className="flex-shrink-0"
            style={{ width: `${labelWidth}px` }}
          ></div>
          <div className="flex gap-0.5 flex-1">
            {Array.from({ length: numWeeks }).map((_, weekIdx) => {
              // Find the first day of this week
              const firstDayOfWeek = firstMonday.add(weekIdx, "week");
              // Only show month label if it's the first week of the month or first week overall
              // But skip if it's from the previous year (like December at the start)
              const isFirstWeekOfMonth =
                weekIdx === 0 || firstDayOfWeek.date() <= 7;
              const isFromCurrentYear = firstDayOfWeek.year() === currentYear;

              return (
                <div
                  key={weekIdx}
                  className="text-xs text-gray-500 dark:text-gray-400 text-center flex-shrink-0"
                  style={{
                    width: `${squareSize}px`,
                    minWidth: `${squareSize}px`,
                  }}
                >
                  {isFirstWeekOfMonth && isFromCurrentYear
                    ? firstDayOfWeek.format("MMM")
                    : ""}
                </div>
              );
            })}
          </div>
        </div>

        {/* Grid */}
        <div className="flex gap-0.5">
          {/* Day of week labels */}
          <div
            className="flex flex-col gap-0.5 flex-shrink-0"
            style={{ width: `${labelWidth}px` }}
          >
            {daysOfWeek.map((day, idx) => (
              <div
                key={day}
                className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-end pr-2"
                style={{
                  height: `${squareSize}px`,
                  minHeight: `${squareSize}px`,
                }}
              >
                {idx % 2 === 1 ? day : ""}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="flex flex-col gap-0.5 flex-1">
            {grid.map((row, dayIdx) => (
              <div key={dayIdx} className="flex gap-0.5">
                {row.map((cell, weekIdx) => {
                  if (cell === null) {
                    // Day is outside the current year
                    return (
                      <div
                        key={weekIdx}
                        className="rounded-sm bg-transparent opacity-0 flex-shrink-0"
                        style={{
                          width: `${squareSize}px`,
                          height: `${squareSize}px`,
                        }}
                      />
                    );
                  }

                  const isToday = cell.date.isSame(today, "day");
                  const isFuture = cell.date.isAfter(today, "day");
                  const isBeforeYear = cell.date.year() < currentYear;
                  const isAfterYear = cell.date.year() > currentYear;

                  return (
                    <div
                      key={weekIdx}
                      className={`rounded-sm ${getColor(
                        cell.count
                      )} flex-shrink-0 ${
                        isToday ? "ring-1 ring-pink-400 dark:ring-pink-500" : ""
                      } ${
                        isFuture || isBeforeYear || isAfterYear
                          ? "opacity-30"
                          : ""
                      }`}
                      style={{
                        width: `${squareSize}px`,
                        height: `${squareSize}px`,
                      }}
                      title={`${cell.date.format("MMM D, YYYY")}: ${
                        cell.count
                      } ${cell.count === 1 ? "orgasm" : "orgasms"}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
          <span>Fewer</span>
          <div className="flex gap-1">
            <div
              className="rounded-sm bg-gray-200 dark:bg-gray-800"
              style={{ width: `${squareSize}px`, height: `${squareSize}px` }}
            ></div>
            <div
              className="rounded-sm bg-pink-300 dark:bg-pink-900"
              style={{ width: `${squareSize}px`, height: `${squareSize}px` }}
            ></div>
            <div
              className="rounded-sm bg-pink-400 dark:bg-pink-800"
              style={{ width: `${squareSize}px`, height: `${squareSize}px` }}
            ></div>
            <div
              className="rounded-sm bg-pink-500 dark:bg-pink-700"
              style={{ width: `${squareSize}px`, height: `${squareSize}px` }}
            ></div>
            <div
              className="rounded-sm bg-pink-600 dark:bg-pink-600"
              style={{ width: `${squareSize}px`, height: `${squareSize}px` }}
            ></div>
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
