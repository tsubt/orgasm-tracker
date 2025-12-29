"use client";

import { useEffect, useState } from "react";
import {
  //   CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  //   Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function ChartLine({
  data,
}: {
  data: {
    name: string;
    highlight?: boolean;
    data: ({ x: number; y: number } & Record<string, unknown>)[];
  }[];
}) {
  const [isDark, setIsDark] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

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

  // Initialize selectedYear with the highlighted year (current year by default)
  useEffect(() => {
    const highlighted = data.find((entry) => entry.highlight);
    if (
      highlighted &&
      (selectedYear === null || !data.find((e) => e.name === selectedYear))
    ) {
      setSelectedYear(highlighted.name);
    }
  }, [data, selectedYear]);

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

  const handleLegendClick = (year: string) => {
    setSelectedYear(year === selectedYear ? null : year);
  };

  // Custom legend component
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderCustomLegend = (props: any) => {
    const { payload } = props;
    if (!payload || payload.length === 0) return null;
    return (
      <div className="flex justify-center gap-4 mt-4">
        {payload.map(
          (entry: { dataKey?: string; value?: string }, index: number) => {
            // The value in the legend should match the name prop of the Line component
            // So we compare selectedYear with entry.value (which is the year name)
            const yearName = entry.value as string;
            const isHighlighted = selectedYear === yearName;
            return (
              <div
                key={index}
                onClick={() => {
                  handleLegendClick(yearName);
                }}
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                style={{
                  opacity: isHighlighted ? 1 : 0.6,
                }}
              >
                <div
                  style={{
                    width: "16px",
                    height: "2px",
                    backgroundColor: isHighlighted ? accentColor : "#999999",
                  }}
                />
                <span
                  style={{
                    color: isHighlighted ? accentColor : axisColor,
                    fontWeight: isHighlighted ? "bold" : "normal",
                  }}
                >
                  {entry.value}
                </span>
              </div>
            );
          }
        )}
      </div>
    );
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
        <Legend content={renderCustomLegend} />
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
              style={{ cursor: "pointer" }}
              onClick={() => handleLegendClick(entry.name)}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}
