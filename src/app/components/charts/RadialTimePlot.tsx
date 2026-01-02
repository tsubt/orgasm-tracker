"use client";

import { useState, useEffect, useRef } from "react";
import { Orgasm, OrgasmType } from "@prisma/client";
import dayjs from "dayjs";

interface RadialTimePlotProps {
  orgasms: Orgasm[];
}

// Colors matching "By type" elsewhere in the app
const typeColors: { [key in OrgasmType]: string } = {
  FULL: "#EF4444", // Red
  RUINED: "#A855F7", // Purple
  HANDSFREE: "#06B6D4", // Cyan
  ANAL: "#22C55E", // Green
};

export default function RadialTimePlot({ orgasms }: RadialTimePlotProps) {
  const [hoveredOrgasm, setHoveredOrgasm] = useState<Orgasm | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Size of the plot
  const size = 600;
  const centerX = size / 2;
  const centerY = size / 2;
  const labelRadius = size * 0.18; // Radius for hour labels (inside the lines, near center)
  const lineStartRadius = size * 0.2; // Start of hour marker lines (where dots are)
  const lineEndRadius = size * 0.3; // End of hour marker lines

  // Convert time to angle (midnight at top = -90 degrees, then clockwise)
  const timeToAngle = (hours: number, minutes: number) => {
    // Convert to total minutes
    const totalMinutes = hours * 60 + minutes;
    // Convert to angle: 0 minutes = -90 degrees (top), 1440 minutes = 270 degrees (back to top)
    // We want clockwise, so: angle = (totalMinutes / 1440) * 360 - 90
    const angle = (totalMinutes / 1440) * 360 - 90;
    return angle;
  };

  // Group minutes into 15-minute intervals (0-14, 15-29, 30-44, 45-59)
  const getInterval = (minutes: number) => {
    return Math.floor(minutes / 15) * 15;
  };

  // Convert angle to x, y coordinates
  const angleToCoords = (angle: number, r: number) => {
    const rad = (angle * Math.PI) / 180;
    const x = centerX + r * Math.cos(rad);
    const y = centerY + r * Math.sin(rad);
    return { x, y };
  };

  // Group orgasms by 15-minute intervals
  const intervalGroups: { [key: string]: Orgasm[] } = {};

  orgasms
    .filter((o) => o.timestamp)
    .forEach((orgasm) => {
      const date = dayjs(orgasm.timestamp);
      const hours = date.hour();
      const minutes = date.minute();
      const interval = getInterval(minutes);
      const key = `${hours}:${interval.toString().padStart(2, "0")}`;

      if (!intervalGroups[key]) {
        intervalGroups[key] = [];
      }
      intervalGroups[key].push(orgasm);
    });

  // Process grouped orgasms: calculate positions with stacking
  const orgasmPoints: Array<{
    orgasm: Orgasm;
    hours: number;
    minutes: number;
    angle: number;
    x: number;
    y: number;
    color: string;
    stackIndex: number;
    totalInInterval: number;
  }> = [];

  Object.entries(intervalGroups).forEach(([key, orgasmsInInterval]) => {
    const [hoursStr, minutesStr] = key.split(":");
    const hours = parseInt(hoursStr);
    const minutes = parseInt(minutesStr);

    // Use the middle of the interval for angle (e.g., 7.5 minutes for 0-14 interval)
    const intervalMiddle = minutes + 7.5;
    const angle = timeToAngle(hours, intervalMiddle);

    // Stack dots: first dot at line start radius (where lines begin), subsequent dots further out
    const baseRadius = lineStartRadius;
    const stackSpacing = 8; // pixels between stacked dots

    orgasmsInInterval.forEach((orgasm, index) => {
      const stackRadius = baseRadius + index * stackSpacing;
      const coords = angleToCoords(angle, stackRadius);

      orgasmPoints.push({
        orgasm,
        hours,
        minutes: dayjs(orgasm.timestamp).minute(),
        angle,
        x: coords.x,
        y: coords.y,
        color: typeColors[orgasm.type] || "#999999",
        stackIndex: index,
        totalInInterval: orgasmsInInterval.length,
      });
    });
  });

  // Generate hour labels (0-23, with midnight at top)
  const hourLabels = Array.from({ length: 24 }, (_, i) => {
    const angle = timeToAngle(i, 0);
    const labelCoords = angleToCoords(angle, labelRadius);
    const lineStartCoords = angleToCoords(angle, lineStartRadius);
    const lineEndCoords = angleToCoords(angle, lineEndRadius);
    return {
      hour: i,
      angle,
      labelX: labelCoords.x,
      labelY: labelCoords.y,
      lineStartX: lineStartCoords.x,
      lineStartY: lineStartCoords.y,
      lineEndX: lineEndCoords.x,
      lineEndY: lineEndCoords.y,
      label: i === 0 ? "12" : i <= 12 ? i.toString() : (i - 12).toString(),
      isAM: i < 12,
    };
  });

  const handleDotHover = (
    orgasm: Orgasm,
    event: React.MouseEvent<SVGElement>
  ) => {
    setHoveredOrgasm(orgasm);
    setHoverPosition({ x: event.clientX, y: event.clientY });
  };

  const handleDotLeave = () => {
    setHoveredOrgasm(null);
    setHoverPosition(null);
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

      // Update tooltip position directly via ref to avoid setState in effect
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    }
  }, [hoverPosition]);

  return (
    <div className="w-full flex justify-center">
      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Hour labels (at base, near center) */}
          {hourLabels.map((label) => (
            <text
              key={label.hour}
              x={label.labelX}
              y={label.labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs fill-gray-600 dark:fill-gray-400 font-medium"
            >
              {label.label}
            </text>
          ))}

          {/* Midnight label (below midnight at top) */}
          {(() => {
            const midnightLabel = hourLabels.find((l) => l.hour === 0);
            if (midnightLabel) {
              const midnightLabelCoords = angleToCoords(
                midnightLabel.angle,
                labelRadius * 0.8
              );
              return (
                <text
                  x={midnightLabelCoords.x}
                  y={midnightLabelCoords.y + 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs fill-gray-500 dark:fill-gray-500 font-semibold"
                >
                  Midnight
                </text>
              );
            }
            return null;
          })()}

          {/* Midday label (above noon at bottom) */}
          {(() => {
            const noonLabel = hourLabels.find((l) => l.hour === 12);
            if (noonLabel) {
              const noonLabelCoords = angleToCoords(
                noonLabel.angle,
                labelRadius * 0.8
              );
              return (
                <text
                  x={noonLabelCoords.x}
                  y={noonLabelCoords.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs fill-gray-500 dark:fill-gray-500 font-semibold"
                >
                  Midday
                </text>
              );
            }
            return null;
          })()}

          {/* Hour markers (lines pointing outward from numbers) */}
          {hourLabels.map((label) => (
            <line
              key={label.hour}
              x1={label.lineStartX}
              y1={label.lineStartY}
              x2={label.lineEndX}
              y2={label.lineEndY}
              stroke="currentColor"
              strokeWidth={1}
              className="text-gray-300 dark:text-gray-700"
            />
          ))}

          {/* Orgasm dots - stacked by interval */}
          {orgasmPoints.map((point, idx) => {
            // Make dots slightly smaller if stacked, and add stroke for visibility
            const dotRadius = point.totalInInterval > 1 ? 3.5 : 4;
            const strokeWidth = point.totalInInterval > 1 ? 0.5 : 0;

            return (
              <g
                key={`${point.orgasm.id}-${idx}`}
                onMouseEnter={(e) => handleDotHover(point.orgasm, e)}
                onMouseLeave={handleDotLeave}
                className="cursor-pointer"
              >
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={dotRadius}
                  fill={point.color}
                  stroke={
                    point.totalInInterval > 1
                      ? "rgba(255, 255, 255, 0.8)"
                      : "none"
                  }
                  strokeWidth={strokeWidth}
                  className="hover:opacity-80 transition-opacity"
                />
                <title>
                  {`${dayjs(point.orgasm.timestamp).format(
                    "MMM D, YYYY h:mm A"
                  )} - ${point.orgasm.type}${
                    point.totalInInterval > 1
                      ? ` (${point.stackIndex + 1}/${
                          point.totalInInterval
                        } in this interval)`
                      : ""
                  }`}
                </title>
              </g>
            );
          })}
        </svg>

        {/* Hover tooltip */}
        {hoveredOrgasm && hoverPosition && (
          <div
            ref={tooltipRef}
            className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-3 shadow-lg pointer-events-none min-w-[200px]"
            style={{
              left: `${hoverPosition.x + 10}px`,
              top: `${hoverPosition.y + 10}px`,
            }}
          >
            <div className="text-gray-900 dark:text-gray-100 space-y-1">
              <div className="font-semibold text-sm">
                {dayjs(hoveredOrgasm.timestamp).format("MMMM D, YYYY")}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {dayjs(hoveredOrgasm.timestamp).format("h:mm A")}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor:
                      typeColors[hoveredOrgasm.type] || "#999999",
                  }}
                />
                <span className="text-gray-600 dark:text-gray-400 capitalize">
                  {hoveredOrgasm.type.toLowerCase()}
                </span>
                <span className="text-gray-600 dark:text-gray-400 capitalize">
                  {hoveredOrgasm.sex.toLowerCase()}
                </span>
              </div>
              {hoveredOrgasm.note && (
                <div className="text-xs text-gray-500 dark:text-gray-400 italic mt-1">
                  {hoveredOrgasm.note}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
