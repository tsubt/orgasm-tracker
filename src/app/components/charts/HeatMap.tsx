"use client";

import { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { Orgasm } from "@prisma/client";

dayjs.extend(isoWeek);

interface HeatMapProps {
  orgasms: Orgasm[];
  timeframe?: "last12months" | number;
}

export default function HeatMap({ orgasms, timeframe }: HeatMapProps) {
  const today = dayjs();

  // Calculate start and end dates based on timeframe
  let periodStart: dayjs.Dayjs;
  let periodEnd: dayjs.Dayjs;
  let displayYear: number;

  if (timeframe === "last12months") {
    // Last 12 months: from 12 months ago until today
    periodStart = today.subtract(12, "month").startOf("day");
    periodEnd = today.endOf("day");
    displayYear = today.year(); // Use current year for display purposes
  } else if (typeof timeframe === "number") {
    // Specific year: Jan 1 to Dec 31 of the given year
    displayYear = timeframe;
    periodStart = dayjs(`${displayYear}-01-01`);
    periodEnd = dayjs(`${displayYear}-12-31`);
  } else {
    // Default: current year
    displayYear = new Date().getFullYear();
    periodStart = dayjs(`${displayYear}-01-01`);
    periodEnd = dayjs(`${displayYear}-12-31`);
  }

  // Group orgasms by date for the period
  // Use timestamp field (date/time fields are deprecated)
  const orgasmsByDate: { [date: string]: number } = {};
  orgasms.forEach((o) => {
    if (!o.timestamp) {
      // Skip orgasms without timestamp (date/time fields are deprecated)
      return;
    }

    const orgasmDate = dayjs(o.timestamp);
    const dateStr = orgasmDate.format("YYYY-MM-DD");

    // Only include orgasms within the period
    if (orgasmDate.isAfter(periodStart.subtract(1, "day")) && orgasmDate.isBefore(periodEnd.add(1, "day"))) {
      orgasmsByDate[dateStr] = (orgasmsByDate[dateStr] || 0) + 1;
    }
  });

  // Find max frequency for color intensity
  const maxFreq = Math.max(
    ...Object.values(orgasmsByDate),
    1 // At least 1 to avoid division by zero
  );

  // Build the grid: we need to show all weeks that contain days from the period
  // Start from the Monday of the first ISO week that contains the period start
  const firstMonday = periodStart.startOf("isoWeek");
  const lastSunday = periodEnd.endOf("isoWeek");

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
    const isInPeriod = currentDate.isAfter(periodStart.subtract(1, "day")) &&
                       currentDate.isBefore(periodEnd.add(1, "day"));

    grid[dayOfWeek][weekIndex] = isInPeriod
      ? { date: currentDate, count }
      : null;

    // Move to next day
    currentDate = currentDate.add(1, "day");
  }

  // Calculate number of weeks from the grid (find max columns across all rows)
  const numWeeks = Math.max(...grid.map((row) => row.length), weekIndex + 1);

  // Get color class based on count
  const getColorClass = (count: number) => {
    if (count === 0) return "bg-gray-200 dark:bg-gray-800";
    const intensity = count / maxFreq;
    if (intensity < 0.25) return "bg-pink-300 dark:bg-pink-900";
    if (intensity < 0.5) return "bg-pink-400 dark:bg-pink-800";
    if (intensity < 0.75) return "bg-pink-500 dark:bg-pink-700";
    return "bg-pink-600 dark:bg-pink-600";
  };

  // Get actual color value for animation (light mode colors)
  const getColorValue = (count: number, isDark: boolean = false) => {
    if (count === 0) return isDark ? "rgb(31, 41, 55)" : "rgb(229, 231, 235)"; // gray-800 or gray-200
    const intensity = count / maxFreq;
    if (isDark) {
      if (intensity < 0.25) return "rgb(127, 29, 29)"; // pink-900
      if (intensity < 0.5) return "rgb(153, 27, 27)"; // pink-800
      if (intensity < 0.75) return "rgb(190, 24, 93)"; // pink-700
      return "rgb(219, 39, 119)"; // pink-600
    } else {
      if (intensity < 0.25) return "rgb(249, 168, 212)"; // pink-300
      if (intensity < 0.5) return "rgb(244, 114, 182)"; // pink-400
      if (intensity < 0.75) return "rgb(236, 72, 153)"; // pink-500
      return "rgb(219, 39, 119)"; // pink-600
    }
  };

  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const containerRef = useRef<HTMLDivElement>(null);
  const [squareSize, setSquareSize] = useState(10);
  const [animationKey, setAnimationKey] = useState(0);
  const [isDark, setIsDark] = useState(false);
  const labelWidth = 40;
  const gapSize = 2;

  // Check for dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(
        document.documentElement.classList.contains("dark") ||
          window.matchMedia("(prefers-color-scheme: dark)").matches
      );
    };

    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", checkDarkMode);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", checkDarkMode);
    };
  }, []);

  // Trigger animation when data or timeframe changes
  useEffect(() => {
    setAnimationKey((prev) => prev + 1);
  }, [orgasms, timeframe]);

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
        {/* Scrollable container for month labels and grid */}
        <div className="overflow-x-auto">
          {/* Month labels */}
          <div className="flex gap-0.5 items-start">
            <div
              className="flex-shrink-0"
              style={{ width: `${labelWidth}px` }}
            ></div>
            <div className="flex gap-0.5" style={{ minWidth: `${numWeeks * (squareSize + gapSize)}px` }}>
              {Array.from({ length: numWeeks }).map((_, weekIdx) => {
                // Find the first day of this week
                const firstDayOfWeek = firstMonday.add(weekIdx, "week");
                // Only show month label if it's the first week of the month or first week overall
                // For "thisYear", skip if it's from outside the current year
                // For "last12months", show if it's within the period
                const isFirstWeekOfMonth =
                  weekIdx === 0 || firstDayOfWeek.date() <= 7;
                const isInPeriod = firstDayOfWeek.isAfter(periodStart.subtract(1, "day")) &&
                                  firstDayOfWeek.isBefore(periodEnd.add(1, "day"));
                const shouldShowLabel = timeframe === "last12months"
                  ? (isFirstWeekOfMonth && isInPeriod)
                  : (isFirstWeekOfMonth && firstDayOfWeek.year() === displayYear);

                return (
                  <div
                    key={weekIdx}
                    className="text-xs text-gray-500 dark:text-gray-400 text-center flex-shrink-0"
                    style={{
                      width: `${squareSize}px`,
                      minWidth: `${squareSize}px`,
                    }}
                  >
                    {shouldShowLabel ? firstDayOfWeek.format("MMM") : ""}
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
            <div className="flex flex-col gap-0.5" style={{ minWidth: `${numWeeks * (squareSize + gapSize)}px` }}>
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
                    const isBeforePeriod = cell.date.isBefore(periodStart, "day");
                    const isAfterPeriod = cell.date.isAfter(periodEnd, "day");

                    // Calculate animation delay based on week index (left to right)
                    const animationDelay = weekIdx * 0.015; // 15ms per column for wave effect

                    // Apply reduced opacity after animation for future/past dates
                    const needsReducedOpacity = isFuture || isBeforePeriod || isAfterPeriod;

                    // Get target color for animation
                    const targetColor = getColorValue(cell.count, isDark);

                    return (
                      <div
                        key={`${cell.date.format("YYYY-MM-DD")}-${animationKey}`}
                        className={`rounded-sm flex-shrink-0 ${
                          isToday ? "ring-1 ring-pink-400 dark:ring-pink-500" : ""
                        } ${
                          needsReducedOpacity ? "opacity-30" : ""
                        } animate-fade-in-left`}
                        style={{
                          width: `${squareSize}px`,
                          height: `${squareSize}px`,
                          animationDelay: `${animationDelay}s`,
                          animationFillMode: "forwards",
                          "--target-color": targetColor,
                        } as React.CSSProperties & { "--target-color": string }}
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
