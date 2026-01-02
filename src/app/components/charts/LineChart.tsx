"use client";

import { useEffect, useState } from "react";
import {
  //   CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  //   Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function ChartLine({
  data,
  selectedYear,
}: {
  data: {
    name: string;
    highlight?: boolean;
    data: ({ x: number; y: number } & Record<string, unknown>)[];
  }[];
  selectedYear: string;
}) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check if dark mode is active
    const checkDarkMode = () => {
      setIsDark(
        document.documentElement.classList.contains("dark") ||
          window.matchMedia("(prefers-color-scheme: dark)").matches
      );
    };

    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", checkDarkMode);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", checkDarkMode);
    };
  }, []);

  const axisColor = isDark ? "#ffffff" : "#374151"; // white for dark, gray-700 for light
  const accentColor = isDark ? "#DB2777" : "#EC4899"; // pink-600 for dark, pink-500 for light

  // Custom tick formatter for X axis: show months at quarter positions
  // 0% = Jan 1, ~25% = Apr 1, ~50% = Jul 1, ~75% = Oct 1
  const formatXAxisTick = (tickItem: number) => {
    if (tickItem === 0) return "Jan";
    if (tickItem >= 24 && tickItem < 26) return "Apr";
    if (tickItem >= 49 && tickItem < 51) return "Jul";
    if (tickItem >= 74 && tickItem < 76) return "Oct";
    return "";
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart>
        {/* <CartesianGrid /> */}
        <XAxis
          dataKey="x"
          type="number"
          domain={[0, 100]}
          stroke={axisColor}
          tickFormatter={formatXAxisTick}
        />
        <YAxis stroke={axisColor} />
        {/* <Tooltip /> */}
        {/* Legend removed - year selection is controlled by parent */}
        {data.map((entry) => {
          const isHighlighted = selectedYear === entry.name;
          return (
            <Line
              key={entry.name}
              type="stepAfter"
              dataKey="y"
              data={entry.data}
              name={entry.name}
              dot={false}
              stroke={isHighlighted ? accentColor : "#999999"}
              strokeWidth={isHighlighted ? 2 : 1}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}
