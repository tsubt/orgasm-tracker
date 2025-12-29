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
  const highlightColor = isDark ? "#ffffff" : "#000000"; // white for dark, black for light

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart>
        {/* <CartesianGrid /> */}
        <XAxis dataKey="x" type="number" domain={[0, 100]} stroke={axisColor} />
        <YAxis stroke={axisColor} />
        {/* <Tooltip /> */}
        <Legend />
        {data.map((entry) => (
          <Line
            key={entry.name}
            type="monotone"
            dataKey="y"
            data={entry.data}
            name={entry.name}
            dot={false}
            stroke={entry.highlight ? highlightColor : "#999999"}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
