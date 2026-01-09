"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect } from "react";

const OPTIONS = [
  "All",
  "This year",
  "This month",
  "This week",
  "Last 12 months",
  "Last 30 days",
  "Last 7 days",
];

export default function PickTime() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  const curtime = searchParams.get("time") ?? "All";

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(name, value);
      return params.toString();
    },
    [searchParams]
  );

  // Reset loading state when the time parameter changes
  const currentTime = searchParams.get("time");
  useEffect(() => {
    setIsLoading(false);
  }, [currentTime]);

  return (
    <>
      {/* Mobile: Dropdown */}
      <div className={`md:hidden ${isLoading ? "cursor-wait" : ""}`}>
        <select
          value={curtime}
          onChange={(e) => {
            setIsLoading(true);
            router.replace(
              pathname + "?" + createQueryString("time", e.target.value)
            );
          }}
          disabled={isLoading}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-600 disabled:opacity-50 disabled:cursor-wait"
        >
          {OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop: Buttons */}
      <div
        className={`hidden md:flex gap-4 items-center ${isLoading ? "cursor-wait" : ""}`}
      >
        {OPTIONS.map((option) => (
          <button
            key={option}
            className={`${
              curtime === option
                ? "border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-100"
                : "border-transparent text-gray-600 dark:text-gray-400"
            } text-xs font-semibold tracking-wide border-b-2 hover:text-gray-900 dark:hover:text-gray-100 transition-colors ${
              isLoading ? "cursor-wait opacity-70" : "cursor-pointer"
            }`}
            onClick={() => {
              setIsLoading(true);
              router.replace(pathname + "?" + createQueryString("time", option));
            }}
            disabled={isLoading}
          >
            {option}
          </button>
        ))}
      </div>
    </>
  );
}
