"use client";

import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import relativeTime from "dayjs/plugin/relativeTime";
import { useClientTimeZone } from "@/lib/useClientTimeZone";

dayjs.extend(timezone);
dayjs.extend(utc);
dayjs.extend(relativeTime);

export default function LastOrgasmDisplay({ timestamp }: { timestamp: Date | null }) {
  const userTimezone = useClientTimeZone();
  if (!timestamp) return null;

  const lastDate = dayjs(timestamp).utc().tz(userTimezone);

  return (
    <div className="text-gray-900 dark:text-gray-100">
      <h4 className="text-lg font-bold" suppressHydrationWarning>
        Last orgasm {lastDate.fromNow()}
      </h4>
      <p className="text-gray-600 dark:text-gray-400" suppressHydrationWarning>
        {lastDate.format("D MMM YYYY, H:ma")}
      </p>
    </div>
  );
}
