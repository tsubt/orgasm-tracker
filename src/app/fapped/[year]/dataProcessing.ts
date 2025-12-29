import { Orgasm } from "@prisma/client";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import weekday from "dayjs/plugin/weekday";

dayjs.extend(isoWeek);
dayjs.extend(weekday);

export interface ProcessedData {
  yearOrgasms: Orgasm[];
  totalCount: number;
  maxPerDay: number;
  longestDelayDays: number;
  mostCommonTime: string;
  peakDay: string;
  peakTime: string;
}

export interface MainChartData {
  type: string;
  SOLO: number;
  VIRTUAL: number;
  PHYSICAL: number;
  total: number;
}

export interface DailyChartData {
  date: string;
  SOLO: number;
  VIRTUAL: number;
  PHYSICAL: number;
  total: number;
}

export interface DelayData {
  logDays: number;
  count: number;
}

export interface WeekHeatmapData {
  dayOfWeek: number;
  hour: number;
  count: number;
}

export interface CommitHeatmapData {
  week: number;
  dayOfWeek: number;
  count: number;
}

export interface TimelineData {
  date: Date;
  type: string;
  sex: string;
}

const TIME_PERIODS: { [key: number]: string } = {
  0: "Night time",
  1: "Night time",
  2: "Night time",
  3: "Night time",
  4: "Night time",
  5: "Night time",
  6: "Early morning",
  7: "Early morning",
  8: "Early morning",
  9: "Late morning",
  10: "Late morning",
  11: "Late morning",
  12: "Afternoon",
  13: "Afternoon",
  14: "Afternoon",
  15: "Afternoon",
  16: "Afternoon",
  17: "Afternoon",
  18: "Early evening",
  19: "Early evening",
  20: "Early evening",
  21: "Late evening",
  22: "Late evening",
  23: "Bedtime",
};

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function processYearData(
  orgasms: Orgasm[],
  year: number
): ProcessedData {
  // Filter by year and timestamp (date/time fields are deprecated)
  const yearOrgasms = orgasms.filter((o) => {
    if (!o.timestamp) return false;
    const orgasmYear = dayjs(o.timestamp).year();
    return orgasmYear === year;
  });

  // Sort by timestamp
  const sorted = [...yearOrgasms].sort(
    (a, b) => dayjs(a.timestamp).unix() - dayjs(b.timestamp).unix()
  );

  // Calculate max per day
  const byDate: { [date: string]: Orgasm[] } = {};
  sorted.forEach((o) => {
    const dateStr = dayjs(o.timestamp).format("YYYY-MM-DD");
    if (!byDate[dateStr]) byDate[dateStr] = [];
    byDate[dateStr].push(o);
  });
  const maxPerDay = Math.max(
    ...Object.values(byDate).map((arr) => arr.length),
    0
  );

  // Calculate longest delay
  let longestDelayDays = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = dayjs(sorted[i - 1].timestamp);
    const curr = dayjs(sorted[i].timestamp);
    const diffDays = curr.diff(prev, "day", true);
    if (diffDays > longestDelayDays) {
      longestDelayDays = diffDays;
    }
  }

  // Calculate most common time period and peak
  const hourCounts: { [hour: number]: number } = {};
  const timeSlotCounts: { [slot: string]: number } = {};
  const dayTimeCounts: { [key: string]: number } = {};

  sorted.forEach((o) => {
    const dateObj = dayjs(o.timestamp);
    const hour = dateObj.hour();
    const period = TIME_PERIODS[hour] || "Unknown";
    const dayOfWeek = DAYS_OF_WEEK[dateObj.isoWeekday() - 1]; // isoWeekday: 1=Mon, 7=Sun, array: 0=Mon, 6=Sun
    const key = `${dayOfWeek} ${period}`;

    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    timeSlotCounts[period] = (timeSlotCounts[period] || 0) + 1;
    dayTimeCounts[key] = (dayTimeCounts[key] || 0) + 1;
  });

  // Most common time period
  const mostCommonTime =
    Object.entries(timeSlotCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    "Unknown";

  // Peak day and time
  const peakEntry = Object.entries(dayTimeCounts).sort(
    (a, b) => b[1] - a[1]
  )[0];
  const peakDay = peakEntry?.[0]?.split(" ")[0] || "Unknown";
  const peakTime = peakEntry?.[0]?.split(" ").slice(1).join(" ") || "Unknown";

  return {
    yearOrgasms: sorted,
    totalCount: sorted.length,
    maxPerDay,
    longestDelayDays: Math.round(longestDelayDays * 10) / 10,
    mostCommonTime,
    peakDay,
    peakTime,
  };
}

export function getMainChartData(orgasms: Orgasm[]): MainChartData[] {
  const typeOrder = ["FULL", "RUINED", "HANDSFREE", "ANAL"];

  const data: { [type: string]: { [sex: string]: number } } = {};

  orgasms.forEach((o) => {
    if (!data[o.type]) {
      data[o.type] = { SOLO: 0, VIRTUAL: 0, PHYSICAL: 0 };
    }
    data[o.type][o.sex] = (data[o.type][o.sex] || 0) + 1;
  });

  return typeOrder.map((type) => {
    const counts = data[type] || { SOLO: 0, VIRTUAL: 0, PHYSICAL: 0 };
    return {
      type,
      SOLO: counts.SOLO || 0,
      VIRTUAL: counts.VIRTUAL || 0,
      PHYSICAL: counts.PHYSICAL || 0,
      total: (counts.SOLO || 0) + (counts.VIRTUAL || 0) + (counts.PHYSICAL || 0),
    };
  });
}

export function getDailyChartData(orgasms: Orgasm[]): DailyChartData[] {
  // Filter orgasms with timestamps (date/time fields are deprecated)
  const validOrgasms = orgasms.filter((o) => o.timestamp !== null);

  const byDate: { [date: string]: Orgasm[] } = {};
  validOrgasms.forEach((o) => {
    const dateStr = dayjs(o.timestamp).format("YYYY-MM-DD");
    if (!byDate[dateStr]) byDate[dateStr] = [];
    byDate[dateStr].push(o);
  });

  return Object.entries(byDate)
    .map(([date, items]) => {
      const counts = { SOLO: 0, VIRTUAL: 0, PHYSICAL: 0 };
      items.forEach((o) => {
        counts[o.sex] = (counts[o.sex] || 0) + 1;
      });
      return {
        date,
        ...counts,
        total: items.length,
      };
    })
    .sort((a, b) => dayjs(a.date).unix() - dayjs(b.date).unix());
}

export function getDelayData(orgasms: Orgasm[]): DelayData[] {
  // Filter orgasms with timestamps (date/time fields are deprecated)
  const validOrgasms = orgasms.filter((o) => o.timestamp !== null);

  const sorted = [...validOrgasms].sort(
    (a, b) => dayjs(a.timestamp).unix() - dayjs(b.timestamp).unix()
  );

  const delays: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = dayjs(sorted[i - 1].timestamp);
    const curr = dayjs(sorted[i].timestamp);
    const diffSeconds = curr.diff(prev, "second");
    const diffDays = diffSeconds / 60 / 60 / 24;
    if (diffDays > 0) {
      delays.push(Math.log(diffDays));
    }
  }

  // Create histogram bins
  const bins = [
    Math.log(5 / 60 / 24), // 5 minutes
    Math.log(1 / 24), // 1 hour
    Math.log(3 / 24), // 3 hours
    Math.log(8 / 24), // 8 hours
    Math.log(1), // 1 day
    Math.log(3), // 3 days
    Math.log(10), // 10 days
    Infinity,
  ];

  const binCounts: { [key: number]: number } = {};
  delays.forEach((logDays) => {
    for (let i = 0; i < bins.length - 1; i++) {
      if (logDays >= bins[i] && logDays < bins[i + 1]) {
        const mid = (bins[i] + (bins[i + 1] === Infinity ? bins[i] + 2 : bins[i + 1])) / 2;
        binCounts[mid] = (binCounts[mid] || 0) + 1;
        break;
      }
    }
  });

  return Object.entries(binCounts).map(([logDays, count]) => ({
    logDays: parseFloat(logDays),
    count,
  }));
}

export function getWeekHeatmapData(orgasms: Orgasm[]): WeekHeatmapData[] {
  // Filter orgasms with timestamps (date/time fields are deprecated)
  const validOrgasms = orgasms.filter((o) => o.timestamp !== null);

  const data: { [key: string]: number } = {};

  validOrgasms.forEach((o) => {
    const dateObj = dayjs(o.timestamp);
    const dayOfWeek = dateObj.isoWeekday(); // 1 = Monday, 7 = Sunday
    const hour = dateObj.hour();
    const key = `${dayOfWeek}-${hour}`;
    data[key] = (data[key] || 0) + 1;
  });

  return Object.entries(data).map(([key, count]) => {
    const [dayOfWeek, hour] = key.split("-").map(Number);
    return { dayOfWeek, hour, count };
  });
}

export function getCommitHeatmapData(
  orgasms: Orgasm[],
  year: number
): CommitHeatmapData[] {
  // Filter orgasms with timestamps (date/time fields are deprecated)
  const validOrgasms = orgasms.filter((o) => o.timestamp !== null);

  const yearStart = dayjs(`${year}-01-01`);
  const data: { [key: string]: number } = {};

  validOrgasms.forEach((o) => {
    const dateObj = dayjs(o.timestamp);
    const week = dateObj.diff(yearStart, "week");
    const dayOfWeek = dateObj.isoWeekday(); // 1 = Monday, 7 = Sunday
    const key = `${week}-${dayOfWeek}`;
    data[key] = (data[key] || 0) + 1;
  });

  return Object.entries(data).map(([key, count]) => {
    const [week, dayOfWeek] = key.split("-").map(Number);
    return { week, dayOfWeek, count };
  });
}

export function getTimelineData(orgasms: Orgasm[]): TimelineData[] {
  // Filter orgasms with timestamps (date/time fields are deprecated)
  return orgasms
    .filter((o) => o.timestamp !== null)
    .map((o) => ({
      date: dayjs(o.timestamp).toDate(),
      type: o.type,
      sex: o.sex,
    }));
}

// Helper to get delay label from log days
export function getDelayLabel(logDays: number): string {
  const days = Math.exp(logDays);
  if (days < 1 / 24) return `${Math.round(days * 24 * 60)}m`;
  if (days < 1) return `${Math.round(days * 24)}h`;
  if (days < 7) return `${Math.round(days)}d`;
  return `${Math.round(days)}d`;
}
