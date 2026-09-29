"use client";

import { PERIODS, type Period } from "@/lib/periods";

export default function PickTime({
  value,
  onChange,
}: {
  value: Period;
  onChange: (value: Period) => void;
}) {
  return (
    <>
      <div className="md:hidden">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as Period)}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-600"
        >
          {PERIODS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="hidden md:flex gap-4 items-center">
        {PERIODS.map((option) => (
          <button
            key={option}
            className={`${
              value === option
                ? "border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-100"
                : "border-transparent text-gray-600 dark:text-gray-400"
            } text-xs font-semibold tracking-wide border-b-2 hover:text-gray-900 dark:hover:text-gray-100 transition-colors cursor-pointer`}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </>
  );
}
