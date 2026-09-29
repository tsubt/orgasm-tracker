"use client";

import dayjs from "dayjs";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function OctoberCalendar({
  year,
  firstDayOfWeek,
  selected,
  disabledDates,
  maxSelected,
  readOnly = false,
  onToggle,
}: {
  year: number;
  firstDayOfWeek: number;
  selected: string[];
  disabledDates: Set<string>;
  maxSelected: number;
  readOnly?: boolean;
  onToggle?: (date: string) => void;
}) {
  const selectedSet = new Set(selected);
  const firstWeekday = dayjs(`${year}-10-01`).day();
  const leading = (firstWeekday - firstDayOfWeek + 7) % 7;
  const headers = Array.from({ length: 7 }, (_, index) => {
    return WEEKDAYS[(firstDayOfWeek + index) % 7];
  });
  const cells: Array<string | null> = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: 31 }, (_, index) => {
      const day = String(index + 1).padStart(2, "0");
      return `${year}-10-${day}`;
    }),
  ];

  return (
    <div className="grid grid-cols-7 gap-1 text-center text-sm">
      {headers.map((label) => (
        <div
          key={label}
          className="py-1 text-xs font-semibold uppercase text-gray-500"
        >
          {label}
        </div>
      ))}
      {cells.map((date, index) => {
        if (!date) return <div key={`empty-${index}`} />;
        const isSelected = selectedSet.has(date);
        const isDisabled = disabledDates.has(date);
        const atCap = !isSelected && selected.length >= maxSelected;
        return (
          <button
            key={date}
            type="button"
            disabled={readOnly || isDisabled || atCap}
            aria-pressed={isSelected}
            onClick={() => {
              if (readOnly || isDisabled || atCap) return;
              onToggle?.(date);
            }}
            className={`rounded-md py-2 text-sm font-medium disabled:cursor-not-allowed ${
              isSelected
                ? "bg-pink-500 text-white disabled:opacity-100"
                : isDisabled
                  ? "text-gray-300 dark:text-gray-600"
                  : atCap
                    ? "text-gray-400"
                    : "bg-gray-100 text-gray-900 hover:bg-pink-100 dark:bg-gray-900 dark:text-gray-100"
            } ${readOnly ? "cursor-default" : ""}`}
          >
            {Number(date.slice(-2))}
          </button>
        );
      })}
    </div>
  );
}
