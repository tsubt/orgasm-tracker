import dayjs, { type ConfigType, type Dayjs } from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

export function resolveTimeZone(timeZone: string | null | undefined): string {
  if (!timeZone) return "UTC";
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return timeZone;
  } catch {
    return "UTC";
  }
}

/** Instant formatted in a time zone. A missing zone keeps the runtime local zone. */
export function at(value: ConfigType, timeZone?: string | null): Dayjs {
  const parsed = dayjs(value);
  return timeZone ? parsed.tz(timeZone) : parsed;
}

/** Calendar date (YYYY-MM-DD) as that civil day in the zone, not a shifted instant. */
export function onDate(yyyyMmDd: string, timeZone?: string | null): Dayjs {
  if (!timeZone) return dayjs(yyyyMmDd);
  return dayjs.tz(yyyyMmDd, timeZone);
}

/** Shared clock. Pass the server instant so every relative label starts from the same time. */
export function clock(now?: string | null, timeZone?: string | null): Dayjs {
  const parsed = now ? dayjs(now) : dayjs();
  return timeZone ? parsed.tz(timeZone) : parsed;
}

export function relativeTo(value: ConfigType, now: ConfigType): string {
  return dayjs(value).from(now);
}
