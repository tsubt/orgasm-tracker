import type { LocktoberCalendarDay } from "@/lib/locktober/calendar";
import type { TierSnapshot } from "@/lib/locktober/scoring";
import { tierCellClass, tierMarkClass, tierToneName } from "@/lib/locktober/tierTone";
import dayjs from "dayjs";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function pointsLabel(points: number): string {
  return points > 0 ? `+${points}` : String(points);
}

function lockStatus(minutes: number): { mark: string; hours: string | null; label: string } {
  if (minutes <= 0) {
    return { mark: "🔓", hours: null, label: "Unlocked" };
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 1) {
    return { mark: "🔒", hours: "<1", label: "Locked under 1 hour" };
  }
  return {
    mark: "🔒",
    hours: String(hours),
    label: `Locked ${hours} ${hours === 1 ? "hour" : "hours"}`,
  };
}

function heatStyle(
  points: number,
  peak: number,
): { className: string; style: { backgroundColor: string; borderColor: string } } {
  const mag = Math.min(1, Math.abs(points) / Math.max(20, peak));
  const alpha = 0.22 + mag * 0.68;
  const rgb = points > 0 ? "5, 150, 105" : "109, 40, 217";
  const strong = alpha >= 0.6;
  const color = `rgba(${rgb}, ${alpha})`;
  return {
    className: strong
      ? "text-white"
      : points > 0
        ? "text-emerald-950 dark:text-emerald-50"
        : "text-violet-950 dark:text-violet-50",
    style: { backgroundColor: color, borderColor: color },
  };
}

export default function PointsCalendar({
  year,
  firstDayOfWeek,
  today,
  days,
  tiers,
}: {
  year: number;
  firstDayOfWeek: number;
  today: string;
  days: LocktoberCalendarDay[];
  tiers: TierSnapshot[];
}) {
  const byDate = new Map(days.map((day) => [day.date, day]));
  const peak = days.reduce((highest, day) => Math.max(highest, Math.abs(day.points)), 0);
  const firstWeekday = dayjs(`${year}-10-01`).day();
  const leading = (firstWeekday - firstDayOfWeek + 7) % 7;
  const headers = Array.from({ length: 7 }, (_, index) => WEEKDAYS[(firstDayOfWeek + index) % 7]);
  const cells: Array<string | null> = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: 31 }, (_, index) => {
      const day = String(index + 1).padStart(2, "0");
      return `${year}-10-${day}`;
    }),
  ];

  return (
    <div>
      <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">October</h3>
      <div className="grid grid-cols-7 gap-1 text-center">
        {headers.map((label) => (
          <div key={label} className="py-1 text-[10px] font-semibold uppercase text-gray-500">
            {label}
          </div>
        ))}
        {cells.map((date, index) => {
          if (!date) return <div key={`empty-${index}`} />;
          const day = byDate.get(date);
          const points = day?.points ?? 0;
          const isFuture = date > today;
          const isToday = date === today;
          const rewardTone = day?.rewardTone ?? null;
          const isSkipped = day?.cumStatus === "SKIPPED";
          const isCum = Boolean(day?.cumStatus);
          const showPoints = !rewardTone && !isSkipped && !isFuture && points !== 0;
          const heat = showPoints && !isCum ? heatStyle(points, peak) : null;
          const cumShade = isCum && !rewardTone;
          const labelParts = [dayjs(date).format("MMMM D")];
          if (day?.rewardLabel) labelParts.push(day.rewardLabel);
          else if (isSkipped) labelParts.push("Skipped");
          else if (isCum) labelParts.push("Cum day");
          if (points !== 0) labelParts.push(pointsLabel(points));
          const lock = day?.lockedMinutes == null ? null : lockStatus(day.lockedMinutes);
          if (lock) labelParts.push(lock.label);
          const label = labelParts.join(", ");

          return (
            <div
              key={date}
              title={label}
              aria-label={label}
              style={heat?.style}
              className={`flex min-h-14 flex-col items-start rounded-md border px-1 py-1 ${
                rewardTone
                  ? tierCellClass(rewardTone)
                  : cumShade
                    ? "border-pink-200 bg-pink-50 text-pink-900 dark:border-pink-800 dark:bg-pink-950/40 dark:text-pink-100"
                    : heat
                      ? heat.className
                      : isFuture
                        ? "border-gray-200 text-gray-300 dark:border-gray-700 dark:text-gray-600"
                        : "border-gray-200 bg-gray-50 text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              } ${isToday ? "font-bold ring-2 ring-gray-900 ring-offset-1 dark:ring-white" : ""}`}
            >
              <span className="flex w-full items-start justify-between gap-0.5 leading-none">
                <span className="text-[11px]">{Number(date.slice(-2))}</span>
                {lock && (
                  <span
                    className="inline-flex items-center text-[10px] tabular-nums"
                    title={lock.label}
                  >
                    <span aria-hidden>{lock.mark}</span>
                    {lock.hours != null && <span>{lock.hours}</span>}
                  </span>
                )}
              </span>
              <span className="flex w-full flex-1 items-center justify-center gap-0.5">
                {showPoints && (
                  <span className="text-[10px] font-semibold leading-none tabular-nums">
                    {pointsLabel(points)}
                  </span>
                )}
                {cumShade && (
                  <span className="text-sm leading-none" aria-hidden>
                    💦
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-600 dark:text-gray-300">
        {tiers.map((tier) => (
          <li key={`${tier.label}-${tier.points}`} className="flex items-center gap-1">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-sm ${tierMarkClass(tierToneName(tier, tiers))}`}
            />
            {tier.label}
          </li>
        ))}
        <li className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-600" />
          Points earned
        </li>
        <li className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-violet-700" />
          Points lost
        </li>
        <li className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-pink-100" />
          💦 Cum day
        </li>
      </ul>
    </div>
  );
}
