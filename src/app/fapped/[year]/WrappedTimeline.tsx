"use client";

import { Orgasm } from "@prisma/client";
import { getTimelineData } from "./dataProcessing";
import dayjs from "dayjs";
import { useState } from "react";

interface WrappedTimelineProps {
  orgasms: Orgasm[];
  onHoverChange?: (isHovering: boolean) => void;
}

const SEX_ORDER = ["SOLO", "VIRTUAL", "PHYSICAL"];
// Color palette optimized for distinction using color theory:
// Colors are spaced ~90° apart on the color wheel for maximum differentiation
const TYPE_COLORS: { [key: string]: string } = {
  FULL: "#EF4444", // Red - vibrant and distinct
  RUINED: "#A855F7", // Purple - ~90° from red
  HANDSFREE: "#06B6D4", // Cyan - ~180° from red (complementary)
  ANAL: "#22C55E", // Green - ~120° from red, between cyan and yellow
};

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

export default function WrappedTimeline({
  orgasms,
  onHoverChange,
}: WrappedTimelineProps) {
  const [hoveredOrgasm, setHoveredOrgasm] = useState<Orgasm | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  // Filter and sort orgasms by timestamp
  const validOrgasms = orgasms.filter((o) => o.timestamp !== null);
  const sorted = [...validOrgasms].sort(
    (a, b) => dayjs(a.timestamp).unix() - dayjs(b.timestamp).unix()
  );

  if (sorted.length === 0) {
    return (
      <div className="w-full text-center text-[#c9c9c9]">
        No data available for timeline
      </div>
    );
  }

  const startDate = dayjs(sorted[0].timestamp).toDate();
  const endDate = dayjs(sorted[sorted.length - 1].timestamp).toDate();

  // Group by sex category
  const bySex: { [sex: string]: Orgasm[] } = {};
  SEX_ORDER.forEach((sex) => {
    bySex[sex] = sorted.filter((o) => o.sex === sex);
  });

  // Get month breaks
  const monthBreaks: Date[] = [];
  let current = dayjs(startDate).startOf("month");
  const end = dayjs(endDate).endOf("month");
  while (current.isBefore(end) || current.isSame(end, "month")) {
    monthBreaks.push(current.toDate());
    current = current.add(1, "month");
  }

  const getXPosition = (date: Date) => {
    const totalMs = endDate.getTime() - startDate.getTime();
    const currentMs = date.getTime() - startDate.getTime();
    return (currentMs / totalMs) * 100;
  };

  return (
    <div className="w-full">
      <div className="relative" style={{ height: `${SEX_ORDER.length * 80}px` }}>
        {/* Month labels */}
        <div className="absolute top-0 left-0 right-0 h-6 flex">
          {monthBreaks.map((month, idx) => {
            const xPos = getXPosition(month);
            const monthName = MONTHS[dayjs(month).month()];
            return (
              <div
                key={idx}
                className="absolute text-xs text-[#c9c9c9]"
                style={{ left: `${xPos}%`, transform: "translateX(-50%)" }}
              >
                {monthName}
              </div>
            );
          })}
        </div>

        {/* Timeline for each sex category */}
        {SEX_ORDER.map((sex, sexIdx) => {
          const sexData = bySex[sex] || [];
          const top = sexIdx * 80 + 30;
          return (
            <div
              key={sex}
              className="absolute left-0 right-0"
              style={{ top: `${top}px`, height: "50px" }}
            >
              {/* Label */}
              <div className="absolute left-0 top-0 bottom-0 w-20 flex items-center text-sm text-[#e9e9e9]">
                {sex.charAt(0) + sex.slice(1).toLowerCase()}
              </div>

              {/* Timeline line */}
              <div
                className="absolute top-1/2 left-20 right-0 h-px bg-[#3c3c3c]"
                style={{ transform: "translateY(-50%)" }}
              />

              {/* Orgasm markers */}
              {sexData.map((orgasm, idx) => {
                const date = dayjs(orgasm.timestamp).toDate();
                const xPos = getXPosition(date);
                const isHovered = hoveredOrgasm?.id === orgasm.id;

                return (
                  <div
                    key={orgasm.id}
                    className={`absolute top-1/2 transition-all duration-200 cursor-pointer ${
                      isHovered ? "z-30" : "z-10"
                    }`}
                    style={{
                      left: `calc(${xPos}% + 5rem)`,
                      transform: isHovered
                        ? "translate(-50%, -50%) scale(1.5)"
                        : "translate(-50%, -50%) scale(1)",
                      transformOrigin: "center center",
                    }}
                    onMouseEnter={(e) => {
                      setHoveredOrgasm(orgasm);
                      onHoverChange?.(true);
                      const rect = e.currentTarget.getBoundingClientRect();
                      const containerRect = e.currentTarget.closest('.w-full')?.getBoundingClientRect();
                      setTooltipPosition({
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                      });
                    }}
                    onMouseLeave={() => {
                      setHoveredOrgasm(null);
                      onHoverChange?.(false);
                      setTooltipPosition(null);
                    }}
                  >
                    <div
                      className="h-8 rounded-sm transition-shadow duration-200"
                      style={{
                        width: "2px",
                        backgroundColor: TYPE_COLORS[orgasm.type] || "#999",
                        boxShadow: isHovered
                          ? `0 0 8px ${TYPE_COLORS[orgasm.type] || "#999"}`
                          : "none",
                      }}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {hoveredOrgasm && tooltipPosition && (
        <div
          className="fixed z-50 bg-[#2c2c2c] border border-[#444] rounded-lg p-4 shadow-2xl pointer-events-none min-w-[200px] max-w-[300px]"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y - 10}px`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="text-[#e9e9e9] space-y-2">
            <div className="font-semibold text-lg">
              {dayjs(hoveredOrgasm.timestamp).format("MMM D, YYYY")}
            </div>
            <div className="text-sm text-[#c9c9c9]">
              {dayjs(hoveredOrgasm.timestamp).format("h:mm A")}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{
                  backgroundColor: TYPE_COLORS[hoveredOrgasm.type] || "#999",
                }}
              />
              <span className="text-sm capitalize">
                {hoveredOrgasm.type.toLowerCase()}
              </span>
            </div>
            <div className="text-sm text-[#c9c9c9] capitalize">
              {hoveredOrgasm.sex.toLowerCase()}
            </div>
            {hoveredOrgasm.note && hoveredOrgasm.note.trim() && (
              <div className="text-sm text-[#b9b9b9] mt-3 pt-3 border-t border-[#444]">
                <div className="text-xs text-[#888] uppercase tracking-wide mb-1">
                  Note
                </div>
                <div className="italic leading-relaxed">
                  {hoveredOrgasm.note.trim()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 justify-center mt-8">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2">
            <div
              className="w-4 h-4"
              style={{ backgroundColor: color }}
            />
            <span className="text-sm text-[#c9c9c9]">
              {type.charAt(0) + type.slice(1).toLowerCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
