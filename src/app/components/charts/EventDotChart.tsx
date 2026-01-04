"use client";

import { Orgasm } from "@prisma/client";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useState } from "react";
import { PencilSquareIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/navigation";

dayjs.extend(utc);
dayjs.extend(timezone);

// Color palette matching Fapped summary
const TYPE_COLORS: { [key: string]: string } = {
  FULL: "#EF4444", // Red
  RUINED: "#A855F7", // Purple
  HANDSFREE: "#06B6D4", // Cyan
  ANAL: "#22C55E", // Green
};

interface EventDotChartProps {
  orgasms: Orgasm[];
  tz: string;
}

export default function EventDotChart({ orgasms, tz }: EventDotChartProps) {
  const [hoveredOrgasm, setHoveredOrgasm] = useState<Orgasm | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number; alignLeft?: boolean } | null>(null);
  const router = useRouter();

  // Filter and sort orgasms by timestamp (newest first for display)
  const validOrgasms = orgasms.filter((o) => o.timestamp !== null);
  const sorted = [...validOrgasms].sort(
    (a, b) => dayjs(b.timestamp).unix() - dayjs(a.timestamp).unix()
  );

  if (sorted.length === 0) {
    return null;
  }

  const now = dayjs().tz(tz);

  // Dot size is 8px (w-2 h-2)
  const DOT_SIZE = 8;
  const COLUMN_WIDTH = DOT_SIZE; // Each day column is the same width as the dot

  // Group orgasms by day
  const orgasmsByDay: { [dayKey: string]: Orgasm[] } = {};
  sorted.forEach((orgasm) => {
    const dayKey = dayjs(orgasm.timestamp).tz(tz).format("YYYY-MM-DD");
    if (!orgasmsByDay[dayKey]) {
      orgasmsByDay[dayKey] = [];
    }
    orgasmsByDay[dayKey].push(orgasm);
  });

  // Calculate positions for each day
  const dayPositions: Array<{
    dayKey: string;
    orgasms: Orgasm[];
    x: number; // pixel position from right edge
    yPositions: number[];
  }> = [];

  Object.entries(orgasmsByDay).forEach(([dayKey, dayOrgasms]) => {
    const dayDate = dayjs(dayKey).tz(tz);
    const daysAgo = now.diff(dayDate, "day");
    // Position from right edge: 0 = now (rightmost), increasing as we go left
    // Each day gets a column of COLUMN_WIDTH pixels
    const x = daysAgo * COLUMN_WIDTH;

    // Stack dots vertically, touching (no gap)
    // Dots are 8px tall, so they stack at 0, 8, 16, 24, etc.
    // Center the stack vertically
    const count = dayOrgasms.length;
    const totalHeight = count * DOT_SIZE;
    const startY = -totalHeight / 2 + DOT_SIZE / 2; // Start from top of stack, centered

    const yPositions = dayOrgasms.map((_, idx) => startY + idx * DOT_SIZE);

    dayPositions.push({
      dayKey,
      orgasms: dayOrgasms,
      x,
      yPositions,
    });
  });

  // Sort by x position (newest first, which is rightmost/smallest x)
  dayPositions.sort((a, b) => a.x - b.x);

  return (
    <div className="w-full overflow-hidden relative">
      <div className="relative overflow-hidden" style={{ height: "120px" }}>
        {/* Subtle background line */}
        <div
          className="absolute top-1/2 left-0 right-0 h-px bg-gray-300 dark:bg-gray-600 opacity-30"
          style={{ transform: "translateY(-50%)" }}
        />

        {/* "Now" label at the top with faint line */}
        <div className="absolute right-0 top-0 z-10 flex flex-col items-end">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 pr-2">
            Now
          </div>
          {/* Faint vertical line from top to middle */}
          <div
            className="w-px bg-gray-300 dark:bg-gray-600 opacity-30"
            style={{ height: "60px" }}
          />
        </div>

        {/* Dots for each day */}
        {dayPositions.map(({ dayKey, orgasms: dayOrgasms, x, yPositions }) => (
          <div
            key={dayKey}
            className="absolute top-1/2"
            style={{
              right: `${x}px`,
              width: `${COLUMN_WIDTH}px`,
            }}
          >
            {dayOrgasms.map((orgasm, idx) => {
              const y = yPositions[idx];
              const isHovered = hoveredOrgasm?.id === orgasm.id;

              return (
                <div
                  key={orgasm.id}
                  className={`absolute transition-shadow duration-200 cursor-pointer ${
                    isHovered ? "z-30" : "z-10"
                  }`}
                  style={{
                    left: "50%",
                    transform: `translate(-50%, ${y}px)`,
                    transformOrigin: "center center",
                  }}
                  onMouseEnter={(e) => {
                    setHoveredOrgasm(orgasm);
                    const rect = e.currentTarget.getBoundingClientRect();
                    const chartContainer = e.currentTarget.closest('.w-full');
                    const chartRect = chartContainer?.getBoundingClientRect();
                    // Position tooltip to avoid the "Now" label on the right
                    // If near the right edge (within 120px), position it to the left of the dot
                    const viewportWidth = window.innerWidth;
                    const isNearRightEdge = rect.right > viewportWidth - 120;
                    setTooltipPosition({
                      x: isNearRightEdge ? rect.left - 10 : rect.left + rect.width / 2,
                      y: rect.top,
                      alignLeft: isNearRightEdge,
                    });
                  }}
                  onMouseLeave={() => {
                    setHoveredOrgasm(null);
                    setTooltipPosition(null);
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full transition-shadow duration-200"
                    style={{
                      backgroundColor: TYPE_COLORS[orgasm.type] || "#999",
                      boxShadow: isHovered
                        ? `0 0 6px ${TYPE_COLORS[orgasm.type] || "#999"}`
                        : "none",
                    }}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {hoveredOrgasm && tooltipPosition && (
        <div
          className="fixed z-[9999] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-3 shadow-lg min-w-[180px]"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y - 10}px`,
            transform: tooltipPosition.alignLeft ? "translate(-100%, -100%)" : "translate(-50%, -100%)",
          }}
          onMouseEnter={() => {
            // Keep tooltip visible when hovering over it
          }}
          onMouseLeave={() => {
            setHoveredOrgasm(null);
            setTooltipPosition(null);
          }}
        >
          <div className="text-gray-900 dark:text-gray-100 space-y-1 text-sm">
            <div className="font-semibold">
              {dayjs(hoveredOrgasm.timestamp).tz(tz).format("MMM D, YYYY")}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {dayjs(hoveredOrgasm.timestamp).tz(tz).format("h:mm A")}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: TYPE_COLORS[hoveredOrgasm.type] || "#999",
                }}
              />
              <span className="text-xs capitalize">
                {hoveredOrgasm.type.toLowerCase()}
              </span>
            </div>
            <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  router.push(`/orgasms?edit=${hoveredOrgasm.id}`);
                }}
                className="text-gray-600 dark:text-gray-400 hover:text-pink-600 dark:hover:text-pink-400 transition-colors cursor-pointer"
                title="Edit"
              >
                <PencilSquareIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
