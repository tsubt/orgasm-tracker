import dayjs, { type Dayjs } from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import type { Period } from "./periods";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isoWeek);

type Stamp = { timestamp: Date | string | null };

type Range = { gte?: Date; lte?: Date; lt?: Date };

export type OrgasmSummary = {
  total: number;
  daysSinceLast: number;
  longestStreak: number;
  longestGap: number;
  periodLabel: string | null;
  previousPeriodTotal: number | null;
  averagePerPeriod: number | null;
  currentVsAverage: number | null;
};

function asDate(value: Date | string | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function inRange(timestamp: Date, range: Range): boolean {
  const time = timestamp.getTime();
  if (range.gte && time < range.gte.getTime()) return false;
  if (range.lte && time > range.lte.getTime()) return false;
  if (range.lt && time >= range.lt.getTime()) return false;
  return true;
}

function periodRange(time: Period, d: Dayjs): Range {
  switch (time) {
    case "This year":
      return { gte: d.startOf("year").toDate() };
    case "This month":
      return { gte: d.startOf("month").toDate() };
    case "This week":
      return { gte: d.startOf("isoWeek").toDate() };
    case "Last 12 months":
      return { gte: d.subtract(12, "month").toDate() };
    case "Last 30 days":
      return { gte: d.subtract(30, "day").toDate() };
    case "Last 7 days":
      return { gte: d.subtract(7, "day").toDate() };
    default:
      return {};
  }
}

function countInRange(stamps: Date[], range: Range): number {
  return stamps.filter((timestamp) => inRange(timestamp, range)).length;
}

export function summarizeOrgasms(
  orgasms: Stamp[],
  time: Period,
  tz: string,
  joinedAtInput: Date | string,
): OrgasmSummary | null {
  const d = dayjs().tz(tz);
  const stamps = orgasms
    .map((orgasm) => asDate(orgasm.timestamp))
    .filter((timestamp): timestamp is Date => timestamp !== null);
  const current = stamps.filter((timestamp) =>
    inRange(timestamp, periodRange(time, d)),
  );
  const n = current.length;
  if (n === 0) return null;

  const last = current
    .map((timestamp) => dayjs(timestamp))
    .reduce((a, b) => (a.isAfter(b) ? a : b));
  const daysSinceLast = d.diff(last, "day");

  const times = current
    .map((timestamp) => dayjs(timestamp))
    .sort((a, b) => a.diff(b))
    .map((date, i, arr) => {
      if (i === 0) return null;
      return date.diff(arr[i - 1], "day");
    })
    .filter((gap) => gap !== null)
    .map((gap) => (gap ? gap : 0));

  const streaks = times
    .reduce(
      (acc, cur) => {
        if (cur === 1) {
          acc[acc.length - 1] += 1;
        } else {
          acc.push(0);
        }
        return acc;
      },
      [0],
    )
    .map((x) => x + 1);
  const longestStreak = streaks.reduce((a, b) => (a > b ? a : b));
  const historicalLongestGap = times.length ? Math.max(...times) - 1 : 0;
  const longestGap = Math.max(historicalLongestGap, daysSinceLast);

  const earliest = stamps.reduce((a, b) => (a < b ? a : b));
  const joinedAtDate = asDate(joinedAtInput) ?? earliest;
  const effectiveJoinedAt = dayjs(joinedAtDate).isBefore(dayjs(earliest))
    ? dayjs(joinedAtDate).tz(tz)
    : dayjs(earliest).tz(tz);

  let previousPeriodTotal: number | null = null;
  let averagePerPeriod: number | null = null;
  let currentVsAverage: number | null = null;
  let periodLabel: string | null = null;

  if (time === "This year") {
    periodLabel = "year";
    const lastYearStart = d.subtract(1, "year").startOf("year");
    const lastYearEnd = d.subtract(1, "year").endOf("year");
    previousPeriodTotal = countInRange(stamps, {
      gte: lastYearStart.toDate(),
      lte: lastYearEnd.toDate(),
    });

    const firstFullYear = effectiveJoinedAt
      .endOf("year")
      .add(1, "day")
      .startOf("year");
    const currentYearStart = d.startOf("year");
    if (firstFullYear.isBefore(currentYearStart)) {
      const historical = stamps.filter((timestamp) =>
        inRange(timestamp, {
          gte: firstFullYear.toDate(),
          lt: currentYearStart.toDate(),
        }),
      );
      const orgasmsByYear: { [year: number]: number } = {};
      historical.forEach((timestamp) => {
        const year = dayjs(timestamp).year();
        orgasmsByYear[year] = (orgasmsByYear[year] || 0) + 1;
      });
      const fullYears = Object.values(orgasmsByYear);
      if (fullYears.length > 0) {
        averagePerPeriod =
          fullYears.reduce((a, b) => a + b, 0) / fullYears.length;
        currentVsAverage = n - averagePerPeriod;
      }
    }
  } else if (time === "This month") {
    periodLabel = "month";
    const lastMonthStart = d.subtract(1, "month").startOf("month");
    const lastMonthEnd = d.subtract(1, "month").endOf("month");
    previousPeriodTotal = countInRange(stamps, {
      gte: lastMonthStart.toDate(),
      lte: lastMonthEnd.toDate(),
    });

    const firstFullMonth = effectiveJoinedAt
      .endOf("month")
      .add(1, "day")
      .startOf("month");
    const currentMonthStart = d.startOf("month");
    if (firstFullMonth.isBefore(currentMonthStart)) {
      const historical = stamps.filter((timestamp) =>
        inRange(timestamp, {
          gte: firstFullMonth.toDate(),
          lt: currentMonthStart.toDate(),
        }),
      );
      const orgasmsByMonth: { [month: string]: number } = {};
      historical.forEach((timestamp) => {
        const month = dayjs(timestamp).format("YYYY-MM");
        orgasmsByMonth[month] = (orgasmsByMonth[month] || 0) + 1;
      });
      const fullMonths = Object.values(orgasmsByMonth);
      if (fullMonths.length > 0) {
        averagePerPeriod =
          fullMonths.reduce((a, b) => a + b, 0) / fullMonths.length;
        currentVsAverage = n - averagePerPeriod;
      }
    }
  } else if (time === "This week") {
    periodLabel = "week";
    const lastWeekStart = d.subtract(1, "week").startOf("isoWeek");
    const lastWeekEnd = d.subtract(1, "week").endOf("isoWeek");
    previousPeriodTotal = countInRange(stamps, {
      gte: lastWeekStart.toDate(),
      lte: lastWeekEnd.toDate(),
    });

    const firstFullWeek = effectiveJoinedAt
      .endOf("isoWeek")
      .add(1, "day")
      .startOf("isoWeek");
    const currentWeekStart = d.startOf("isoWeek");
    if (firstFullWeek.isBefore(currentWeekStart)) {
      const historical = stamps.filter((timestamp) =>
        inRange(timestamp, {
          gte: firstFullWeek.toDate(),
          lt: currentWeekStart.toDate(),
        }),
      );
      const orgasmsByWeek: { [week: string]: number } = {};
      historical.forEach((timestamp) => {
        const weekStart = dayjs(timestamp).startOf("isoWeek");
        const weekKey = `${weekStart.year()}-W${weekStart.isoWeek()}`;
        orgasmsByWeek[weekKey] = (orgasmsByWeek[weekKey] || 0) + 1;
      });
      const fullWeeks = Object.values(orgasmsByWeek);
      if (fullWeeks.length > 0) {
        averagePerPeriod =
          fullWeeks.reduce((a, b) => a + b, 0) / fullWeeks.length;
        currentVsAverage = n - averagePerPeriod;
      }
    }
  }

  return {
    total: n,
    daysSinceLast,
    longestStreak,
    longestGap,
    periodLabel,
    previousPeriodTotal,
    averagePerPeriod,
    currentVsAverage,
  };
}
