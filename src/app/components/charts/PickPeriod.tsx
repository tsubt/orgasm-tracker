"use client";

const OPTIONS = ["Year", "Month", "Week", "Day"];

interface PickPeriodProps {
  period: string;
  onPeriodChange: (period: string) => void;
}

export default function PickPeriod({ period, onPeriodChange }: PickPeriodProps) {
  return (
    <div className="flex gap-4 items-center">
      {OPTIONS.map((option) => (
        <button
          key={option}
          className={`${
            period === option
              ? "border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-100"
              : "border-transparent text-gray-600 dark:text-gray-400"
          } text-xs font-semibold tracking-wide cursor-pointer border-b-2 hover:text-gray-900 dark:hover:text-gray-100 transition-colors`}
          onClick={() => {
            onPeriodChange(option);
          }}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
