"use client";

import { useState, useRef, useEffect } from "react";
import { Orgasm } from "@prisma/client";
import dayjs from "dayjs";

interface MonthCalendarProps {
  month: number; // 1-12
  year: number;
  orgasms: Orgasm[];
}

export default function MonthCalendar({
  month,
  year,
  orgasms,
}: MonthCalendarProps) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Get the first day of the month and the number of days
  const firstDay = dayjs(`${year}-${month.toString().padStart(2, "0")}-01`);
  const daysInMonth = firstDay.daysInMonth();
  const startDayOfWeek = firstDay.day(); // 0 = Sunday, 6 = Saturday

  // Group orgasms by date for this month
  const orgasmsByDate: { [date: string]: Orgasm[] } = {};
  orgasms.forEach((o) => {
    if (!o.timestamp) return;
    const orgasmDate = dayjs(o.timestamp);
    if (orgasmDate.month() + 1 === month && orgasmDate.year() === year) {
      const dateStr = orgasmDate.format("YYYY-MM-DD");
      if (!orgasmsByDate[dateStr]) {
        orgasmsByDate[dateStr] = [];
      }
      orgasmsByDate[dateStr].push(o);
    }
  });

  // Days of the week labels
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Generate calendar cells
  const calendarCells: Array<{ day: number | null; date: string | null }> = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarCells.push({ day: null, date: null });
  }

  // Add cells for each day of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = firstDay.date(day).format("YYYY-MM-DD");
    calendarCells.push({ day, date: dateStr });
  }

  // Fill remaining cells to complete the grid (6 rows x 7 columns = 42 cells)
  const remainingCells = 42 - calendarCells.length;
  for (let i = 0; i < remainingCells; i++) {
    calendarCells.push({ day: null, date: null });
  }

  const handleCellHover = (date: string | null, event: React.MouseEvent<HTMLDivElement>) => {
    if (date && orgasmsByDate[date]) {
      setHoveredDate(date);
      setHoverPosition({ x: event.clientX, y: event.clientY });
    } else {
      setHoveredDate(null);
      setHoverPosition(null);
    }
  };

  // Calculate tooltip position to avoid viewport overflow
  useEffect(() => {
    if (hoverPosition && tooltipRef.current) {
      const tooltip = tooltipRef.current;
      const tooltipRect = tooltip.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const offset = 10;
      
      let left = hoverPosition.x + offset;
      let top = hoverPosition.y + offset;
      
      // Check right edge overflow
      if (left + tooltipRect.width > viewportWidth) {
        left = hoverPosition.x - tooltipRect.width - offset;
      }
      
      // Check left edge overflow
      if (left < 0) {
        left = offset;
      }
      
      // Check bottom edge overflow
      if (top + tooltipRect.height > viewportHeight) {
        top = hoverPosition.y - tooltipRect.height - offset;
      }
      
      // Check top edge overflow
      if (top < 0) {
        top = offset;
      }
      
      // eslint-disable-next-line react-compiler/react-compiler
      setTooltipStyle({
        left: `${left}px`,
        top: `${top}px`,
      });
    }
  }, [hoverPosition]);

  const handleCellLeave = () => {
    setHoveredDate(null);
    setHoverPosition(null);
  };

  const getColorClass = (date: string | null) => {
    if (!date || !orgasmsByDate[date] || orgasmsByDate[date].length === 0) {
      return "bg-gray-100 dark:bg-gray-800";
    }
    const count = orgasmsByDate[date].length;
    if (count === 1) return "bg-pink-300 dark:bg-pink-900";
    if (count === 2) return "bg-pink-400 dark:bg-pink-800";
    if (count === 3) return "bg-pink-500 dark:bg-pink-700";
    return "bg-pink-600 dark:bg-pink-600";
  };

  const monthName = firstDay.format("MMMM");

  // Calculate total orgasms for this month
  const monthTotal = Object.values(orgasmsByDate).reduce(
    (sum, orgasms) => sum + orgasms.length,
    0
  );

  return (
    <div className="relative">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm">
        {/* Month header */}
        <div className="flex items-center justify-center gap-2 mb-2 sm:mb-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {monthName}
          </h3>
          <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-full bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200">
            {monthTotal}
          </span>
        </div>

        {/* Day labels - hidden on md and smaller, shown on lg+ */}
        <div className="hidden lg:grid grid-cols-7 gap-1 mb-1">
          {dayLabels.map((label) => (
            <div
              key={label}
              className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center py-1"
            >
              {label.charAt(0)}
            </div>
          ))}
        </div>

        {/* Calendar grid - hidden on md and smaller, shown on lg+ */}
        <div className="hidden lg:grid grid-cols-7 gap-1">
          {calendarCells.map((cell, index) => {
            const hasOrgasms = cell.date && orgasmsByDate[cell.date] && orgasmsByDate[cell.date].length > 0;
            const isToday = cell.date && dayjs(cell.date).isSame(dayjs(), "day");

            return (
              <div
                key={index}
                className={`
                  aspect-square flex items-center justify-center text-xs
                  ${cell.day === null ? "opacity-0" : "cursor-pointer"}
                  ${getColorClass(cell.date)}
                  ${isToday ? "ring-1 ring-pink-400 dark:ring-pink-500" : ""}
                  ${hasOrgasms ? "hover:opacity-80 transition-opacity" : ""}
                  rounded
                `}
                onMouseEnter={(e) => handleCellHover(cell.date, e)}
                onMouseLeave={handleCellLeave}
              >
                {cell.day !== null && (
                  <span
                    className={`${
                      hasOrgasms
                        ? "text-gray-900 dark:text-gray-100 font-medium"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {cell.day}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredDate && hoverPosition && orgasmsByDate[hoveredDate] && (
        <div
          ref={tooltipRef}
          className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-3 shadow-lg pointer-events-none min-w-[200px] max-w-[300px]"
          style={tooltipStyle}
        >
          <div className="text-gray-900 dark:text-gray-100 space-y-2">
            <div className="font-semibold text-sm">
              {dayjs(hoveredDate).format("MMMM D, YYYY")}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {orgasmsByDate[hoveredDate].length} {orgasmsByDate[hoveredDate].length === 1 ? "orgasm" : "orgasms"}
            </div>
            <div className="space-y-1 pt-1 border-t border-gray-200 dark:border-gray-700">
              {orgasmsByDate[hoveredDate].map((orgasm) => (
                <div key={orgasm.id} className="text-xs">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500 dark:text-gray-400">
                        {dayjs(orgasm.timestamp).format("h:mm A")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          orgasm.type === "FULL"
                            ? "bg-pink-500"
                            : orgasm.type === "RUINED"
                            ? "bg-purple-500"
                            : orgasm.type === "HANDSFREE"
                            ? "bg-blue-500"
                            : "bg-indigo-500"
                        }`}
                      />
                      <span className="text-gray-600 dark:text-gray-400 capitalize">
                        {orgasm.type.toLowerCase()}
                      </span>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 capitalize">
                      {orgasm.sex.toLowerCase()}
                    </div>
                  </div>
                  {orgasm.note && (
                    <div className="text-gray-500 dark:text-gray-400 italic mt-0.5">
                      {orgasm.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
