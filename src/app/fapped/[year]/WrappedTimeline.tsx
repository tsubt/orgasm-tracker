"use client";

import { Orgasm } from "@prisma/client";
import { getTimelineData } from "./dataProcessing";
import dayjs from "dayjs";

interface WrappedTimelineProps {
  orgasms: Orgasm[];
}

const SEX_ORDER = ["SOLO", "VIRTUAL", "PHYSICAL"];
const TYPE_COLORS: { [key: string]: string } = {
  FULL: "#FF6B9D",
  RUINED: "#C44569",
  HANDSFREE: "#F8B500",
  ANAL: "#FF9500",
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

export default function WrappedTimeline({ orgasms }: WrappedTimelineProps) {
  const timelineData = getTimelineData(orgasms);

  if (timelineData.length === 0) {
    return (
      <div className="w-full text-center text-[#c9c9c9]">
        No data available for timeline
      </div>
    );
  }

  const sorted = [...timelineData].sort((a, b) => a.date.getTime() - b.date.getTime());
  const startDate = sorted[0].date;
  const endDate = sorted[sorted.length - 1].date;

  // Group by sex category
  const bySex: { [sex: string]: typeof sorted } = {};
  SEX_ORDER.forEach((sex) => {
    bySex[sex] = sorted.filter((d) => d.sex === sex);
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
              {sexData.map((d, idx) => {
                const xPos = getXPosition(d.date);
                return (
                  <div
                    key={idx}
                    className="absolute top-1/2 w-1 h-8 -translate-y-1/2"
                    style={{
                      left: `calc(${xPos}% + 5rem)`,
                      backgroundColor: TYPE_COLORS[d.type] || "#999",
                      transform: "translate(-50%, -50%)",
                    }}
                    title={`${dayjs(d.date).format("MMM D, YYYY HH:mm")} - ${d.type}`}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

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

