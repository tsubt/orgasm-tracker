"use client";

import { useMemo } from "react";
import { Orgasm } from "@prisma/client";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import isoWeek from "dayjs/plugin/isoWeek";
import type { Period } from "@/lib/periods";

dayjs.extend(timezone);
dayjs.extend(utc);
dayjs.extend(isoWeek);

interface BreakdownStatsClientProps {
  orgasms: Orgasm[];
  time: Period;
  tz: string;
}

export default function BreakdownStatsClient({
  orgasms,
  time,
  tz,
}: BreakdownStatsClientProps) {
  const filteredOrgasms = useMemo(() => {
    const d = dayjs().tz(tz);
    return orgasms.filter((o) => {
      if (!o.timestamp) return false;
      const orgasmDate = dayjs(o.timestamp);

      switch (time) {
        case "This year":
          return orgasmDate.isAfter(d.startOf("year").subtract(1, "day"));
        case "This month":
          return orgasmDate.isAfter(d.startOf("month").subtract(1, "day"));
        case "This week":
          return orgasmDate.isAfter(d.startOf("isoWeek").subtract(1, "day"));
        case "Last 12 months":
          return orgasmDate.isAfter(d.subtract(12, "month").subtract(1, "day"));
        case "Last 30 days":
          return orgasmDate.isAfter(d.subtract(30, "day").subtract(1, "day"));
        case "Last 7 days":
          return orgasmDate.isAfter(d.subtract(7, "day").subtract(1, "day"));
        default:
          return true;
      }
    });
  }, [orgasms, time, tz]);

  const total = filteredOrgasms.length;
  if (total === 0) {
    return (
      <div className="text-gray-700 dark:text-gray-300">
        No orgasms in this period
      </div>
    );
  }

  // Count by type
  const typeCounts = {
    FULL: filteredOrgasms.filter((o) => o.type === "FULL").length,
    RUINED: filteredOrgasms.filter((o) => o.type === "RUINED").length,
    HANDSFREE: filteredOrgasms.filter((o) => o.type === "HANDSFREE").length,
    ANAL: filteredOrgasms.filter((o) => o.type === "ANAL").length,
  };

  // Count by partner
  const partnerCounts = {
    SOLO: filteredOrgasms.filter((o) => o.sex === "SOLO").length,
    VIRTUAL: filteredOrgasms.filter((o) => o.sex === "VIRTUAL").length,
    PHYSICAL: filteredOrgasms.filter((o) => o.sex === "PHYSICAL").length,
  };

  // Colors matching Fapped summary
  const typeColors = {
    FULL: "bg-[#EF4444]", // Red
    RUINED: "bg-[#A855F7]", // Purple
    HANDSFREE: "bg-[#06B6D4]", // Cyan
    ANAL: "bg-[#22C55E]", // Green
  };

  const partnerColors = {
    SOLO: "bg-blue-500",
    VIRTUAL: "bg-purple-500",
    PHYSICAL: "bg-green-500",
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Type Breakdown */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          By Type
        </h3>
        <div className="w-full h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
          {Object.entries(typeCounts).map(([type, count]) => {
            const percentage = (count / total) * 100;
            if (count === 0) return null;
            return (
              <div
                key={type}
                className={`${
                  typeColors[type as keyof typeof typeColors]
                } transition-all`}
                style={{ width: `${percentage}%` }}
                title={`${type}: ${count} (${percentage.toFixed(1)}%)`}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-600 dark:text-gray-400">
          {Object.entries(typeCounts).map(([type, count]) => {
            if (count === 0) return null;
            const percentage = (count / total) * 100;
            return (
              <div key={type} className="flex items-center gap-1">
                <div
                  className={`w-3 h-3 rounded ${
                    typeColors[type as keyof typeof typeColors]
                  }`}
                />
                <span>
                  {type}: {count} ({percentage.toFixed(1)}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Partner Breakdown */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          By Partner
        </h3>
        <div className="w-full h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
          {Object.entries(partnerCounts).map(([partner, count]) => {
            const percentage = (count / total) * 100;
            if (count === 0) return null;
            return (
              <div
                key={partner}
                className={`${
                  partnerColors[partner as keyof typeof partnerColors]
                } transition-all`}
                style={{ width: `${percentage}%` }}
                title={`${partner}: ${count} (${percentage.toFixed(1)}%)`}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-600 dark:text-gray-400">
          {Object.entries(partnerCounts).map(([partner, count]) => {
            if (count === 0) return null;
            const percentage = (count / total) * 100;
            return (
              <div key={partner} className="flex items-center gap-1">
                <div
                  className={`w-3 h-3 rounded ${
                    partnerColors[partner as keyof typeof partnerColors]
                  }`}
                />
                <span>
                  {partner}: {count} ({percentage.toFixed(1)}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
