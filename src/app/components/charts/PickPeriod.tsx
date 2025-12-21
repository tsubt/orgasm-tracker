"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const OPTIONS = ["Year", "Month", "Week", "Day"];

export default function PickPeriod() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const curperiod = searchParams.get("period") ?? "Year";

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(name, value);
      return params.toString();
    },
    [searchParams]
  );

  return (
    <div className="flex gap-4 items-center">
      {OPTIONS.map((option) => (
        <button
          key={option}
          className={`${
            curperiod === option
              ? "border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-100"
              : "border-transparent text-gray-600 dark:text-gray-400"
          } text-xs font-semibold tracking-wide cursor-pointer border-b-2 hover:text-gray-900 dark:hover:text-gray-100 transition-colors`}
          onClick={() => {
            router.replace(
              pathname + "?" + createQueryString("period", option)
            );
          }}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
