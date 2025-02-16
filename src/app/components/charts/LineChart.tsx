"use client";

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
    data: ({ x: number; y: number } & Record<string, unknown>)[];
  }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        {/* <CartesianGrid /> */}
        <XAxis dataKey="x" type="number" domain={[0, 100]} stroke="white" />
        <YAxis stroke="white" />
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
            stroke="white"
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
