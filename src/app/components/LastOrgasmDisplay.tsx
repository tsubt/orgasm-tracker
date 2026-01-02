"use client";

import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(timezone);
dayjs.extend(utc);
dayjs.extend(relativeTime);

export default function LastOrgasmDisplay({ timestamp }: { timestamp: Date | null }) {
  if (!timestamp) return null;

  // Detect user's timezone on client side
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Convert UTC timestamp to user's local timezone
  const lastDate = dayjs(timestamp).utc().tz(userTimezone);

  return (
    <div className="text-gray-900 dark:text-gray-100">
      <h4 className="text-lg font-bold">
        Last orgasm {lastDate.fromNow()}
      </h4>
      <p className="text-gray-600 dark:text-gray-400">
        {lastDate.format("D MMM YYYY, H:ma")}
      </p>
    </div>
  );
}
