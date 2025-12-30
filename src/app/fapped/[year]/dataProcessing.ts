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

  // Calculate longest delay (using same method as getDelayData for consistency)
  let longestDelayDays = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = dayjs(sorted[i - 1].timestamp);
    const curr = dayjs(sorted[i].timestamp);
    const diffSeconds = curr.diff(prev, "second");
    const diffDays = diffSeconds / 60 / 60 / 24;
    if (diffDays > longestDelayDays) {
      longestDelayDays = diffDays;
    }
  }

  // Calculate most common time period and peak
  const hourCounts: { [hour: number]: number } = {};
  const timeSlotCounts: { [slot: string]: number } = {};
  const dayTimeCounts: { [key: string]: number } = {};

  // For peak calculation, use the same 3-hour bins as the heatmap
  const hourBins = [0, 3, 6, 9, 12, 15, 18, 21, 24];
  const binCounts: { [key: string]: number } = {}; // key: "dayOfWeek-startHour"

  sorted.forEach((o) => {
    const dateObj = dayjs(o.timestamp);
    const hour = dateObj.hour();
    const period = TIME_PERIODS[hour] || "Unknown";
    const dayOfWeek = DAYS_OF_WEEK[dateObj.isoWeekday() - 1]; // isoWeekday: 1=Mon, 7=Sun, array: 0=Mon, 6=Sun
    const key = `${dayOfWeek} ${period}`;

    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    timeSlotCounts[period] = (timeSlotCounts[period] || 0) + 1;
    dayTimeCounts[key] = (dayTimeCounts[key] || 0) + 1;

    // Calculate which 3-hour bin this hour falls into
    const dayOfWeekNum = dateObj.isoWeekday(); // 1 = Monday, 7 = Sunday
    for (let i = 0; i < hourBins.length - 1; i++) {
      if (hour >= hourBins[i] && hour < hourBins[i + 1]) {
        const binKey = `${dayOfWeekNum}-${hourBins[i]}`;
        binCounts[binKey] = (binCounts[binKey] || 0) + 1;
        break;
      }
    }
  });

  // Most common time period
  const mostCommonTime =
    Object.entries(timeSlotCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    "Unknown";

  // Peak day and time (based on 3-hour bins to match heatmap)
  const peakBinEntry = Object.entries(binCounts).sort(
    (a, b) => b[1] - a[1]
  )[0];

  let peakDay = "Unknown";
  let peakTime = "Unknown";

  if (peakBinEntry) {
    const [dayOfWeekNum, startHour] = peakBinEntry[0].split("-").map(Number);
    const endHour = Math.min(startHour + 3, 24);
    peakDay = DAYS_OF_WEEK[dayOfWeekNum - 1]; // Convert 1-7 to 0-6 for array index
    peakTime = `${startHour}:00-${endHour}:00`;
  }

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

  // Return raw log delays (not binned) - let the chart component do the binning
  const delays: DelayData[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = dayjs(sorted[i - 1].timestamp);
    const curr = dayjs(sorted[i].timestamp);
    const diffSeconds = curr.diff(prev, "second");
    const diffDays = diffSeconds / 60 / 60 / 24;
    if (diffDays > 0) {
      delays.push({
        logDays: Math.log(diffDays),
        count: 1, // Each delay is counted once
      });
    }
  }

  return delays;
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
