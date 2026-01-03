"use client";

const OPTIONS = ["Line", "Frequency", "Calendar", "Week", "Radial", "Timeline"];

interface PickPeriodProps {
  period: string;
  onPeriodChange: (period: string) => void;
}

export default function PickPeriod({ period, onPeriodChange }: PickPeriodProps) {
  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="chart-select"
        className="text-sm font-semibold text-gray-700 dark:text-gray-300"
      >
        Chart:
      </label>
      <select
        id="chart-select"
        value={period}
        onChange={(e) => onPeriodChange(e.target.value)}
        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-600"
      >
        {OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
