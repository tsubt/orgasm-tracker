"use client";

import { useEffect, useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

/**
 * Advance from the server instant, not the viewer's clock.
 * The first render matches the server so relative labels stay aligned with it.
 */
export function useServerClock(serverNow: string) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(() => {
      setElapsed(Date.now() - started);
    }, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return dayjs(serverNow).add(elapsed, "millisecond");
}

export function TheirTime({
  timeZone,
  serverNow,
  own = false,
}: {
  timeZone: string;
  serverNow: string;
  own?: boolean;
}) {
  const now = useServerClock(serverNow);
  const there = now.tz(timeZone);
  const place = timeZone.replace(/_/g, " ");

  return (
    <p className="text-sm text-gray-600 dark:text-gray-300">
      <span className="font-medium text-gray-900 dark:text-white">
        {own ? "Your time" : "Their time"}:
      </span>{" "}
      <time dateTime={there.format()}>{there.format("DD MMM YYYY, h:mm a")}</time>
      <span className="text-gray-500 dark:text-gray-400"> · {place}</span>
    </p>
  );
}

export function RelativeTime({
  at,
  serverNow,
}: {
  at: string | Date;
  serverNow: string;
}) {
  const now = useServerClock(serverNow);
  return <>{dayjs(at).from(now)}</>;
}
