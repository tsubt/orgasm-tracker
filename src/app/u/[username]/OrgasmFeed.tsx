"use client";

import { useState } from "react";
import { Orgasm } from "@prisma/client";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

// Color palette matching Fapped summary
const TYPE_COLORS: { [key: string]: string } = {
  FULL: "#EF4444", // Red
  RUINED: "#A855F7", // Purple
  HANDSFREE: "#06B6D4", // Cyan
  ANAL: "#22C55E", // Green
};

const ITEMS_PER_PAGE = 10;

interface OrgasmFeedProps {
  orgasms: Orgasm[];
  tz: string;
}

export default function OrgasmFeed({ orgasms, tz }: OrgasmFeedProps) {
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);

  if (orgasms.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        No orgasms to show.
      </div>
    );
  }

  const displayedOrgasms = orgasms.slice(0, displayCount);
  const hasMore = displayCount < orgasms.length;

  const handleLoadMore = () => {
    setDisplayCount((prev) => prev + ITEMS_PER_PAGE);
  };

  return (
    <div className="flex flex-col gap-4">
      {displayedOrgasms.map((orgasm) => {
        if (!orgasm.timestamp) return null;

        const date = dayjs(orgasm.timestamp).tz(tz);
        const now = dayjs().tz(tz);
        const isToday = date.isSame(now, "day");
        const isYesterday = date.isSame(now.subtract(1, "day"), "day");

        let dateDisplay: string;
        if (isToday) {
          dateDisplay = `Today at ${date.format("h:mm A")}`;
        } else if (isYesterday) {
          dateDisplay = `Yesterday at ${date.format("h:mm A")}`;
        } else if (now.diff(date, "day") < 7) {
          dateDisplay = date.format("dddd [at] h:mm A");
        } else {
          dateDisplay = date.format("MMM D, YYYY [at] h:mm A");
        }

        return (
          <div
            key={orgasm.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {dateDisplay}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span
                className="px-2 py-1 rounded-full text-xs font-medium text-white"
                style={{
                  backgroundColor: TYPE_COLORS[orgasm.type] || "#999",
                }}
              >
                {orgasm.type.charAt(0) + orgasm.type.slice(1).toLowerCase()}
              </span>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                {orgasm.sex.charAt(0) + orgasm.sex.slice(1).toLowerCase()}
              </span>
            </div>

            {orgasm.note && orgasm.note.trim() && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {orgasm.note.trim()}
                </p>
              </div>
            )}
          </div>
        );
      })}

      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={handleLoadMore}
            className="px-6 py-2 bg-pink-500 dark:bg-pink-600 text-white rounded-md hover:bg-pink-600 dark:hover:bg-pink-700 transition-colors font-medium"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
