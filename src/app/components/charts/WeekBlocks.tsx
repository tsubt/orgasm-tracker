"use client";

import { useLayoutEffect, useRef } from "react";
import { Orgasm, OrgasmType } from "@prisma/client";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";

dayjs.extend(isoWeek);

interface WeekBlocksProps {
  orgasms: Orgasm[];
  year: number;
}

export default function WeekBlocks({ orgasms, year }: WeekBlocksProps) {
  // Get the first and last day of the year
  const yearStart = dayjs(`${year}-01-01`);
  const yearEnd = dayjs(`${year}-12-31`);

  // Handle year boundary - we need to get all weeks that contain days from this year
  const weeks: number[] = [];

  // Start from the first week of the year
  let currentDate = yearStart.startOf("isoWeek");
  const endDate = yearEnd.endOf("isoWeek");

  while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, "day")) {
    const weekNum = currentDate.isoWeek();
    if (!weeks.includes(weekNum)) {
      weeks.push(weekNum);
    }
    currentDate = currentDate.add(1, "week");
  }

  // Group orgasms by week number
  // Need to handle weeks that might span across years
  const orgasmsByWeek: { [week: number]: Orgasm[] } = {};

  orgasms.forEach((o) => {
    if (!o.timestamp) return;
    const orgasmDate = dayjs(o.timestamp);
    const orgasmYear = orgasmDate.year();
    const orgasmWeek = orgasmDate.isoWeek();

    // Include orgasm if it's in the selected year, or if the week contains days from the selected year
    const weekStart = orgasmDate.startOf("isoWeek");
    const weekEnd = orgasmDate.endOf("isoWeek");

    if (
      orgasmYear === year ||
      weekStart.year() === year ||
      weekEnd.year() === year
    ) {
      if (!orgasmsByWeek[orgasmWeek]) {
        orgasmsByWeek[orgasmWeek] = [];
      }
      orgasmsByWeek[orgasmWeek].push(o);
    }
  });

  // Colors matching "By type" elsewhere in the app
  const typeColors = {
    FULL: "#EF4444", // Red
    RUINED: "#A855F7", // Purple
    HANDSFREE: "#06B6D4", // Cyan
    ANAL: "#22C55E", // Green
  };

  const getTypeColor = (type: OrgasmType) => {
    return typeColors[type] || "#999999";
  };

  // Sort orgasms within each week by timestamp
  Object.keys(orgasmsByWeek).forEach((week) => {
    orgasmsByWeek[parseInt(week)].sort((a, b) => {
      if (!a.timestamp || !b.timestamp) return 0;
      return dayjs(a.timestamp).unix() - dayjs(b.timestamp).unix();
    });
  });

  const barHeight = 4; // pixels per orgasm bar
  const gap = 1; // gap between bars in pixels

  // Calculate number of columns for 4 rows on desktop
  // A year has 52-53 weeks, so for 4 rows we need 13-14 columns
  const columnsFor4Rows = Math.ceil(weeks.length / 4);
  const gridRef = useRef<HTMLDivElement>(null);

  // Use useLayoutEffect to set grid columns before paint to prevent layout shift
  useLayoutEffect(() => {
    if (gridRef.current) {
      const isDesktop = window.innerWidth >= 1024;
      if (isDesktop) {
        gridRef.current.style.gridTemplateColumns = `repeat(${columnsFor4Rows}, minmax(40px, 1fr))`;
      } else {
        gridRef.current.style.gridTemplateColumns = "";
      }
    }
  }, [columnsFor4Rows]);

  return (
    <div className="w-full">
      <div
        ref={gridRef}
        className="grid gap-1 sm:gap-1.5 md:gap-2 grid-cols-2 sm:grid-cols-4 md:grid-cols-8"
      >
        {weeks.map((weekNum) => {
          const weekOrgasms = orgasmsByWeek[weekNum] || [];
          const totalHeight =
            weekOrgasms.length > 0
              ? weekOrgasms.length * barHeight + (weekOrgasms.length - 1) * gap
              : 0;

          // Get the date range for this week
          // Find a date in the selected year that falls in this week
          let weekStart = dayjs(`${year}-01-01`);
          // Try to find the week - it might be from previous year
          if (weekNum >= 52) {
            // Week might be from end of previous year or start of next year
            weekStart = dayjs(`${year}-12-31`)
              .isoWeek(weekNum)
              .startOf("isoWeek");
            if (weekStart.year() !== year) {
              weekStart = dayjs(`${year}-01-01`)
                .isoWeek(weekNum)
                .startOf("isoWeek");
            }
          } else {
            weekStart = dayjs(`${year}-01-01`)
              .isoWeek(weekNum)
              .startOf("isoWeek");
          }
          const weekEnd = weekStart.endOf("isoWeek");

          return (
            <div
              key={weekNum}
              className="flex flex-col items-center gap-0.5 p-1 sm:p-1.5 md:p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                W{weekNum}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">
                {weekOrgasms.length}
              </div>
              <div
                className="flex flex-col gap-0.5 w-full items-center"
                style={{
                  minHeight: totalHeight > 0 ? `${totalHeight}px` : "4px",
                }}
                title={`Week ${weekNum} (${weekStart.format(
                  "MMM D"
                )} - ${weekEnd.format("MMM D")}): ${weekOrgasms.length} ${
                  weekOrgasms.length === 1 ? "orgasm" : "orgasms"
                }`}
              >
                {weekOrgasms.length > 0 ? (
                  weekOrgasms.map((orgasm) => (
                    <div
                      key={orgasm.id}
                      className="w-full rounded"
                      style={{
                        height: `${barHeight}px`,
                        backgroundColor: getTypeColor(orgasm.type),
                      }}
                      title={`${dayjs(orgasm.timestamp).format(
                        "MMM D, h:mm A"
                      )} - ${orgasm.type}`}
                    />
                  ))
                ) : (
                  <div className="w-full h-1 bg-gray-100 dark:bg-gray-800 rounded" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
